"""Staff APIs for the lead pipeline (list/board/summary/detail + stage config).

Reuses the accounts admin base view (superuser permission + admin throttle)
and pagination so every /api/admin/ endpoint behaves consistently.
"""
import re
import uuid

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import ProtectedError, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.utils.text import slugify
from datetime import timedelta

from rest_framework import serializers, status
from rest_framework.response import Response

from accounts.admin_views import AdminAPIView, AdminPagination

from content.models import Service

from .models import Lead, LeadActivity, PipelineStage, StageTransition
from .phones import normalize_phone, whatsapp_url
from .serializers import PHONE_ERROR, clean_custom_fields

User = get_user_model()

COLOR_RE = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
DEFAULT_STAGE_COLOR = "#6B7280"

LEAD_ORDERING_CHOICES = {
    "created_at",
    "-created_at",
    "updated_at",
    "-updated_at",
}

MANUAL_ACTIVITY_TYPES = {
    LeadActivity.Type.NOTE,
    LeadActivity.Type.CALL,
    LeadActivity.Type.WHATSAPP_CLICK,
}


# ---------------------------------------------------------------------------
# Payload helpers
# ---------------------------------------------------------------------------

def stage_brief_payload(stage):
    return {
        "id": stage.id,
        "slug": stage.slug,
        "name": stage.name,
        "color": stage.color,
    }


def stage_detail_payload(stage):
    payload = stage_brief_payload(stage)
    payload["requires_reason"] = stage.requires_reason
    payload["is_terminal"] = stage.is_terminal
    return payload


def stage_config_payload(stage):
    return {
        "id": stage.id,
        "slug": stage.slug,
        "name": stage.name,
        "color": stage.color,
        "order": stage.order,
        "is_terminal": stage.is_terminal,
        "counts_as_converted": stage.counts_as_converted,
        "requires_reason": stage.requires_reason,
        "is_active": stage.is_active,
        "lead_count": stage.leads.count(),
        "created_at": stage.created_at,
    }


def service_payload(service):
    if service is None:
        return None
    return {"id": service.id, "slug": service.slug, "name_en": service.name_en}


def user_payload(user):
    if user is None:
        return None
    return {
        "id": str(user.id),
        "username": user.username,
        "name": user.get_full_name() or user.username,
    }


def lead_list_item_payload(lead):
    return {
        "id": str(lead.id),
        "reference": lead.reference,
        "name": lead.name,
        "phone": lead.phone,
        "email": lead.email,
        "service": service_payload(lead.service),
        "stage": stage_brief_payload(lead.stage),
        "assigned_to": user_payload(lead.assigned_to),
        "source": lead.source,
        "created_at": lead.created_at,
    }


def lead_detail_payload(lead):
    return {
        "id": str(lead.id),
        "reference": lead.reference,
        "name": lead.name,
        "phone": lead.phone,
        "phone_normalized": lead.phone_normalized,
        "email": lead.email,
        "message": lead.message,
        "service": service_payload(lead.service),
        "stage": stage_detail_payload(lead.stage),
        "assigned_to": user_payload(lead.assigned_to),
        "source": lead.source,
        "custom_fields": lead.custom_fields,
        "attribution": lead.attribution,
        "consent_marketing": lead.consent_marketing,
        "lang": lead.lang,
        "whatsapp_url": (
            whatsapp_url(lead.phone_normalized) if lead.phone_normalized else None
        ),
        "created_at": lead.created_at,
        "updated_at": lead.updated_at,
    }


def activity_payload(activity):
    return {
        "id": activity.id,
        "type": activity.type,
        "body": activity.body,
        "actor": activity.actor,
        "created_at": activity.created_at,
    }


def transition_payload(transition):
    return {
        "id": transition.id,
        "from_stage": (
            {"slug": transition.from_stage.slug, "name": transition.from_stage.name}
            if transition.from_stage
            else None
        ),
        "to_stage": {
            "slug": transition.to_stage.slug,
            "name": transition.to_stage.name,
            "color": transition.to_stage.color,
        },
        "reason": transition.reason,
        "changed_by": transition.changed_by,
        "created_at": transition.created_at,
    }


def lead_queryset():
    return Lead.objects.select_related("service", "stage", "assigned_to")


def get_lead_or_404(lead_id):
    return get_object_or_404(lead_queryset(), pk=lead_id)


# ---------------------------------------------------------------------------
# Lead update serializer (staff PATCH)
# ---------------------------------------------------------------------------

class AdminLeadUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100, required=False)
    phone = serializers.CharField(max_length=30, required=False)
    email = serializers.EmailField(required=False, allow_blank=True)
    message = serializers.CharField(
        max_length=5000, required=False, allow_blank=True
    )
    source = serializers.CharField(max_length=100, required=False, allow_blank=True)
    consent_marketing = serializers.BooleanField(required=False)
    lang = serializers.ChoiceField(choices=["en", "bn"], required=False)
    custom_fields = serializers.JSONField(required=False)
    service = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    assigned_to = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )

    def validate_phone(self, value):
        try:
            self.context["phone_normalized"] = normalize_phone(value)
        except ValueError:
            raise serializers.ValidationError(PHONE_ERROR)
        return value

    def validate_custom_fields(self, value):
        return clean_custom_fields(value)

    def validate_service(self, value):
        if value in (None, ""):
            return None
        service = Service.objects.filter(slug=value).first()
        if service is None:
            raise serializers.ValidationError("Unknown service.")
        return service

    def validate_assigned_to(self, value):
        if value in (None, ""):
            return None
        try:
            user = User.objects.get(pk=uuid.UUID(str(value)))
        except (ValueError, User.DoesNotExist):
            raise serializers.ValidationError("Unknown user.")
        if not user.is_staff:
            raise serializers.ValidationError(
                "Leads can only be assigned to staff users."
            )
        return user


# ---------------------------------------------------------------------------
# Lead views
# ---------------------------------------------------------------------------

class AdminLeadsView(AdminAPIView):
    pagination_class = AdminPagination

    def get_queryset(self, request):
        queryset = lead_queryset()

        stage = (request.query_params.get("stage") or "").strip()
        if stage:
            queryset = queryset.filter(stage__slug=stage)

        service = (request.query_params.get("service") or "").strip()
        if service:
            queryset = queryset.filter(service__slug=service)

        assigned_to = (request.query_params.get("assigned_to") or "").strip()
        if assigned_to == "me":
            queryset = queryset.filter(assigned_to=request.user)
        elif assigned_to == "none":
            queryset = queryset.filter(assigned_to__isnull=True)
        elif assigned_to:
            try:
                queryset = queryset.filter(assigned_to__pk=uuid.UUID(assigned_to))
            except ValueError:
                queryset = queryset.none()

        search = (request.query_params.get("search") or "").strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(phone__icontains=search)
                | Q(phone_normalized__icontains=search)
                | Q(reference__icontains=search)
                | Q(email__icontains=search)
            )

        date_from = parse_date(
            (request.query_params.get("date_from") or "").strip()
        )
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        date_to = parse_date((request.query_params.get("date_to") or "").strip())
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        ordering = (request.query_params.get("ordering") or "-created_at").strip()
        if ordering not in LEAD_ORDERING_CHOICES:
            ordering = "-created_at"
        return queryset.order_by(ordering)

    def get(self, request):
        queryset = self.get_queryset(request)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        return Response(
            {
                "count": paginator.page.paginator.count,
                "next": paginator.get_next_link(),
                "previous": paginator.get_previous_link(),
                "results": [lead_list_item_payload(lead) for lead in page],
            }
        )


class AdminLeadsBoardView(AdminAPIView):
    max_cards_per_stage = 50

    def get(self, request):
        stages = PipelineStage.objects.filter(is_active=True)
        payload = []
        for stage in stages:
            cards_qs = stage.leads.select_related("service").order_by("-created_at")
            payload.append(
                {
                    "id": stage.id,
                    "slug": stage.slug,
                    "name": stage.name,
                    "color": stage.color,
                    "order": stage.order,
                    "is_terminal": stage.is_terminal,
                    "requires_reason": stage.requires_reason,
                    "lead_count": cards_qs.count(),
                    "leads": [
                        {
                            "id": str(lead.id),
                            "reference": lead.reference,
                            "name": lead.name,
                            "phone": lead.phone,
                            "service_name": (
                                lead.service.name_en if lead.service else ""
                            ),
                            "created_at": lead.created_at,
                        }
                        for lead in cards_qs[: self.max_cards_per_stage]
                    ],
                }
            )
        return Response({"stages": payload})


class AdminLeadsSummaryView(AdminAPIView):
    def get(self, request):
        now = timezone.localtime()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        total = Lead.objects.count()
        converted = Lead.objects.filter(stage__counts_as_converted=True).count()
        by_stage = [
            {
                "slug": stage.slug,
                "name": stage.name,
                "color": stage.color,
                "count": stage.leads.count(),
            }
            for stage in PipelineStage.objects.filter(is_active=True)
        ]
        return Response(
            {
                "total": total,
                "new_today": Lead.objects.filter(
                    created_at__gte=today_start
                ).count(),
                "new_this_week": Lead.objects.filter(
                    created_at__gte=now - timedelta(days=7)
                ).count(),
                "new_this_month": Lead.objects.filter(
                    created_at__gte=now - timedelta(days=30)
                ).count(),
                "by_stage": by_stage,
                "conversion_rate": (
                    round(converted / total * 100, 1) if total else 0.0
                ),
            }
        )


class AdminLeadDetailView(AdminAPIView):
    max_activities = 50

    def get(self, request, lead_id):
        lead = get_lead_or_404(lead_id)
        activities = lead.activities.all()[: self.max_activities]
        transitions = lead.transitions.select_related("from_stage", "to_stage")
        return Response(
            {
                "lead": lead_detail_payload(lead),
                "activities": [
                    activity_payload(activity) for activity in activities
                ],
                "transitions": [
                    transition_payload(transition) for transition in transitions
                ],
            }
        )

    def patch(self, request, lead_id):
        lead = get_lead_or_404(lead_id)
        serializer = AdminLeadUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        for field in (
            "name",
            "email",
            "message",
            "source",
            "consent_marketing",
            "lang",
            "custom_fields",
            "service",
            "assigned_to",
        ):
            if field in validated:
                setattr(lead, field, validated[field])
        if "phone" in validated:
            lead.phone = validated["phone"]
            lead.phone_normalized = serializer.context["phone_normalized"]
        lead.save()
        return Response({"lead": lead_detail_payload(lead)})


class AdminLeadStageView(AdminAPIView):
    def post(self, request, lead_id):
        lead = get_lead_or_404(lead_id)
        slug = (request.data.get("stage") or "").strip()
        target = PipelineStage.objects.filter(slug=slug, is_active=True).first()
        if target is None:
            return Response(
                {"stage": ["Unknown or inactive stage."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        expected_stage = (request.data.get("expected_stage") or "").strip()
        if expected_stage and lead.stage.slug != expected_stage:
            return Response(
                {
                    "detail": "stale",
                    "current_stage": stage_brief_payload(lead.stage),
                },
                status=status.HTTP_409_CONFLICT,
            )

        if target.pk == lead.stage_id:
            return Response(
                {"stage": ["Lead is already in this stage."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason = (request.data.get("reason") or "").strip()
        if target.requires_reason and not reason:
            return Response(
                {"reason": ["A reason is required for this stage."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            from_stage = lead.stage
            lead.stage = target
            lead.save(update_fields=["stage", "updated_at"])
            transition = StageTransition.objects.create(
                lead=lead,
                from_stage=from_stage,
                to_stage=target,
                reason=reason,
                changed_by=request.user.username,
            )
        return Response(
            {
                "lead": lead_detail_payload(lead),
                "transition": transition_payload(transition),
            }
        )


class AdminLeadActivitiesView(AdminAPIView):
    def post(self, request, lead_id):
        lead = get_lead_or_404(lead_id)
        activity_type = (request.data.get("type") or "").strip()
        if activity_type not in MANUAL_ACTIVITY_TYPES:
            return Response(
                {"type": ["Type must be one of: note, call, whatsapp_click."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        body = request.data.get("body") or ""
        if not isinstance(body, str):
            body = str(body)
        body = body.strip()
        if activity_type == LeadActivity.Type.WHATSAPP_CLICK:
            body = body or "WhatsApp opened"
        elif not body:
            return Response(
                {"body": ["This field is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(body) > 5000:
            return Response(
                {"body": ["Ensure this field has no more than 5000 characters."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        activity = LeadActivity.objects.create(
            lead=lead,
            type=activity_type,
            body=body,
            actor=request.user.username,
        )
        return Response(activity_payload(activity), status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Pipeline stage configuration
# ---------------------------------------------------------------------------

STAGE_FLAG_FIELDS = ("is_terminal", "counts_as_converted", "requires_reason")


def validate_stage_color(value):
    color = (value or "").strip()
    if not COLOR_RE.fullmatch(color):
        return None
    return color


def unique_stage_slug(base):
    slug = base or "stage"
    candidate = slug
    suffix = 2
    while PipelineStage.objects.filter(slug=candidate).exists():
        candidate = f"{slug}-{suffix}"
        suffix += 1
    return candidate


class AdminPipelineStagesView(AdminAPIView):
    def get(self, request):
        return Response(
            {
                "stages": [
                    stage_config_payload(stage)
                    for stage in PipelineStage.objects.all()
                ]
            }
        )

    def post(self, request):
        name = (request.data.get("name") or "").strip()
        if not name:
            return Response(
                {"name": ["This field is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(name) > 100:
            return Response(
                {"name": ["Ensure this field has no more than 100 characters."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        slug = slugify((request.data.get("slug") or "").strip())
        if slug:
            if PipelineStage.objects.filter(slug=slug).exists():
                return Response(
                    {"slug": ["A stage with this slug already exists."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            slug = unique_stage_slug(slugify(name))

        if "color" in request.data:
            color = validate_stage_color(request.data.get("color"))
            if color is None:
                return Response(
                    {"color": ["Enter a valid hex color (#RGB or #RRGGBB)."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            color = DEFAULT_STAGE_COLOR

        if "order" in request.data:
            try:
                order = int(request.data.get("order"))
                if order < 0:
                    raise ValueError
            except (TypeError, ValueError):
                return Response(
                    {"order": ["Enter a non-negative integer."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            last = PipelineStage.objects.order_by("-order").first()
            order = (last.order + 1) if last else 0

        flags = {}
        for field in STAGE_FLAG_FIELDS + ("is_active",):
            if field in request.data:
                flags[field] = bool(request.data.get(field))

        stage = PipelineStage.objects.create(
            name=name, slug=slug, color=color, order=order, **flags
        )
        return Response(
            stage_config_payload(stage), status=status.HTTP_201_CREATED
        )


class AdminPipelineStageDetailView(AdminAPIView):
    def patch(self, request, stage_id):
        stage = get_object_or_404(PipelineStage, pk=stage_id)

        if "name" in request.data:
            name = (request.data.get("name") or "").strip()
            if not name or len(name) > 100:
                return Response(
                    {"name": ["Enter a name of at most 100 characters."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            stage.name = name

        if "color" in request.data:
            color = validate_stage_color(request.data.get("color"))
            if color is None:
                return Response(
                    {"color": ["Enter a valid hex color (#RGB or #RRGGBB)."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            stage.color = color

        if "order" in request.data:
            try:
                order = int(request.data.get("order"))
                if order < 0:
                    raise ValueError
            except (TypeError, ValueError):
                return Response(
                    {"order": ["Enter a non-negative integer."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            stage.order = order

        for field in STAGE_FLAG_FIELDS + ("is_active",):
            if field in request.data:
                setattr(stage, field, bool(request.data.get(field)))

        stage.save()
        return Response(stage_config_payload(stage))

    def delete(self, request, stage_id):
        stage = get_object_or_404(PipelineStage, pk=stage_id)
        if stage.leads.exists():
            stage.is_active = False
            stage.save(update_fields=["is_active"])
            return Response({"detail": "archived"})
        try:
            stage.delete()
        except ProtectedError:
            # Historical transitions still reference the stage — archive it.
            stage.is_active = False
            stage.save(update_fields=["is_active"])
            return Response({"detail": "archived"})
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminPipelineStageReorderView(AdminAPIView):
    def post(self, request):
        order = request.data.get("order")
        if not isinstance(order, list) or not order:
            return Response(
                {"order": ["Provide a list of stage ids."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            stage_ids = [int(stage_id) for stage_id in order]
        except (TypeError, ValueError):
            return Response(
                {"order": ["Stage ids must be integers."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        stages = {stage.id: stage for stage in PipelineStage.objects.filter(pk__in=stage_ids)}
        unknown = [stage_id for stage_id in stage_ids if stage_id not in stages]
        if unknown:
            return Response(
                {"order": [f"Unknown stage ids: {unknown}."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            for index, stage_id in enumerate(stage_ids):
                stage = stages[stage_id]
                if stage.order != index:
                    stage.order = index
                    stage.save(update_fields=["order"])
        return Response(
            {
                "stages": [
                    stage_config_payload(stage)
                    for stage in PipelineStage.objects.all()
                ]
            }
        )
