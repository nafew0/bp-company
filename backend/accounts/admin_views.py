from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from bp_company.audit import log_audit_event

from .ai_secrets import get_ai_api_key, get_ai_api_key_env_var
from .admin_serializers import (
    AITestRequestSerializer,
    AdminUserDetailSerializer,
    AdminUserListSerializer,
    AdminUserUpdateSerializer,
    SiteSettingsAdminSerializer,
    SiteSettingsUpdateSerializer,
)
from .ai_testing import AITestConnectionError, AITestService
from .models import SiteSettings
from .password_reset import send_password_reset_email
from .throttles import AdminRateThrottle
from .user_deletion import delete_user_account
from .verification import get_site_settings as get_runtime_site_settings

User = get_user_model()
BRANDING_ASSET_FIELDS = (
    "branding_logo",
    "branding_favicon",
    "branding_login_banner",
    "branding_register_banner",
)


class IsSuperuserPermission(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and request.user.is_superuser
        )


class AdminPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class AdminAPIView(APIView):
    permission_classes = [IsSuperuserPermission]
    throttle_classes = [AdminRateThrottle]


class AdminGateView(AdminAPIView):
    def get(self, request):
        response = Response(status=status.HTTP_204_NO_CONTENT)
        response["Cache-Control"] = "no-store"
        return response


def get_site_settings():
    return get_runtime_site_settings()


class AdminDashboardView(AdminAPIView):
    def get(self, request):
        now = timezone.now()
        return Response(
            {
                "total_users": User.objects.count(),
                "active_users": User.objects.filter(is_active=True).count(),
                "staff_users": User.objects.filter(is_staff=True).count(),
                "new_users_this_week": User.objects.filter(
                    created_at__gte=now - timedelta(days=7)
                ).count(),
                "new_users_this_month": User.objects.filter(
                    created_at__gte=now - timedelta(days=30)
                ).count(),
            }
        )


class AdminUsersView(AdminAPIView):
    pagination_class = AdminPagination

    def get_queryset(self, request):
        queryset = User.objects.all()

        search = (request.query_params.get("search") or "").strip()
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )

        is_active = (request.query_params.get("is_active") or "").strip().lower()
        if is_active in {"true", "false"}:
            queryset = queryset.filter(is_active=(is_active == "true"))

        ordering = (request.query_params.get("ordering") or "-created_at").strip()
        ordering_map = {
            "created_at": "created_at",
            "-created_at": "-created_at",
            "last_login": "last_login",
            "-last_login": "-last_login",
            "username": "username",
            "-username": "-username",
            "email": "email",
            "-email": "-email",
        }
        return queryset.order_by(ordering_map.get(ordering, "-created_at"))

    def get(self, request):
        queryset = self.get_queryset(request)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = AdminUserListSerializer(page, many=True)
        return Response(
            {
                "count": paginator.page.paginator.count,
                "next": paginator.get_next_link(),
                "previous": paginator.get_previous_link(),
                "results": serializer.data,
            }
        )


class AdminUserDetailView(AdminAPIView):
    def get_user(self, user_id):
        return get_object_or_404(User, pk=user_id)

    def get(self, request, user_id):
        user = self.get_user(user_id)
        return Response({"user": AdminUserDetailSerializer(user).data})

    def patch(self, request, user_id):
        serializer = AdminUserUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target_user = self.get_user(user_id)
        validated = serializer.validated_data

        with transaction.atomic():
            locked_user = User.objects.select_for_update().get(pk=target_user.pk)

            if "is_active" in validated:
                next_is_active = validated["is_active"]
                if locked_user.pk == request.user.pk and not next_is_active:
                    log_audit_event(
                        "admin_user_update",
                        outcome="failure",
                        level="warning",
                        request=request,
                        target_user=locked_user,
                        reason="self_deactivation_blocked",
                    )
                    return Response(
                        {"detail": "You cannot deactivate your own account."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if (
                    locked_user.is_superuser
                    and locked_user.is_active
                    and not next_is_active
                    and User.objects.filter(is_superuser=True, is_active=True).count() <= 1
                ):
                    log_audit_event(
                        "admin_user_update",
                        outcome="failure",
                        level="warning",
                        request=request,
                        target_user=locked_user,
                        reason="last_superuser_blocked",
                    )
                    return Response(
                        {
                            "detail": "At least one active superuser account is required."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                locked_user.is_active = next_is_active
                locked_user.save(update_fields=["is_active"])

        log_audit_event(
            "admin_user_update",
            request=request,
            target_user=target_user,
            updated_fields=sorted(validated.keys()),
        )

        refreshed_user = self.get_user(user_id)
        return Response({"user": AdminUserDetailSerializer(refreshed_user).data})

    def delete(self, request, user_id):
        target_user = self.get_user(user_id)

        if target_user.is_superuser:
            log_audit_event(
                "admin_user_delete",
                outcome="failure",
                level="warning",
                request=request,
                target_user=target_user,
                reason="superuser_delete_blocked",
            )
            return Response(
                {"detail": "Admin accounts cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        delete_user_account(
            target_user,
            request=request,
            audit_event="admin_user_delete",
        )
        return Response(
            {"message": "User deleted successfully."},
            status=status.HTTP_200_OK,
        )


class AdminSendPasswordResetView(AdminAPIView):
    def post(self, request, user_id):
        target_user = get_object_or_404(User, pk=user_id, is_active=True)
        try:
            send_password_reset_email(target_user, requested_by=request.user)
        except ImproperlyConfigured as exc:
            log_audit_event(
                "admin_password_reset_send",
                outcome="failure",
                level="warning",
                request=request,
                target_user=target_user,
                reason="email_not_configured",
            )
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        log_audit_event(
            "admin_password_reset_send",
            request=request,
            target_user=target_user,
        )
        return Response(
            {"detail": "Password reset email sent successfully."},
            status=status.HTTP_200_OK,
        )


class AdminSettingsView(AdminAPIView):
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get(self, request):
        return Response(SiteSettingsAdminSerializer(get_site_settings()).data)

    def patch(self, request):
        settings_obj = get_site_settings()
        serializer = SiteSettingsUpdateSerializer(
            settings_obj,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        previous_files = {}
        updated_fields = []

        for field_name in BRANDING_ASSET_FIELDS:
            existing_file = getattr(settings_obj, field_name, None)
            if existing_file and getattr(existing_file, "name", ""):
                previous_files[field_name] = (existing_file.storage, existing_file.name)

        for field, value in serializer.validated_data.items():
            if field.startswith("clear_") or field in BRANDING_ASSET_FIELDS:
                continue
            setattr(settings_obj, field, value)
            updated_fields.append(field)

        for field_name in BRANDING_ASSET_FIELDS:
            should_clear = bool(serializer.validated_data.get(f"clear_{field_name}", False))
            if should_clear:
                setattr(settings_obj, field_name, None)
                updated_fields.append(field_name)
                continue

            if field_name in serializer.validated_data:
                setattr(settings_obj, field_name, serializer.validated_data[field_name])
                updated_fields.append(field_name)

        settings_obj.save()

        for field_name, (storage, old_name) in previous_files.items():
            current_field = getattr(settings_obj, field_name, None)
            current_name = getattr(current_field, "name", "") if current_field else ""
            if old_name and old_name != current_name:
                storage.delete(old_name)

        log_audit_event(
            "admin_settings_update",
            request=request,
            updated_fields=sorted(set(updated_fields)),
        )
        return Response(SiteSettingsAdminSerializer(settings_obj).data)


class AdminSettingsTestAIView(AdminAPIView):
    def post(self, request):
        settings_obj = get_site_settings()
        provider = request.data.get("provider") or settings_obj.ai_provider
        model = request.data.get("model") or (
            settings_obj.ai_model_openai
            if provider == SiteSettings.AIProvider.OPENAI
            else settings_obj.ai_model_anthropic
        )
        payload = {
            "provider": provider,
            "model": model,
        }
        serializer = AITestRequestSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        api_key = get_ai_api_key(settings_obj, serializer.validated_data["provider"])
        if not api_key:
            env_var_name = get_ai_api_key_env_var(serializer.validated_data["provider"])
            log_audit_event(
                "admin_ai_test",
                outcome="failure",
                level="warning",
                request=request,
                provider=serializer.validated_data["provider"],
                model=serializer.validated_data["model"],
                reason="missing_api_key",
            )
            return Response(
                {
                    "detail": f"Set {env_var_name} on the server before testing this provider."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = AITestService.test_connection(
                api_key=api_key,
                **serializer.validated_data,
            )
        except AITestConnectionError as exc:
            log_audit_event(
                "admin_ai_test",
                outcome="failure",
                level="warning",
                request=request,
                provider=serializer.validated_data["provider"],
                model=serializer.validated_data["model"],
                reason="connection_failed",
            )
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        log_audit_event(
            "admin_ai_test",
            request=request,
            provider=serializer.validated_data["provider"],
            model=serializer.validated_data["model"],
        )
        return Response(result, status=status.HTTP_200_OK)
