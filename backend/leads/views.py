"""Public lead capture endpoint."""
import logging
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from content.models import Service

from .models import Lead, LeadActivity, StageTransition
from .notifications import notify_owner, send_autoresponder
from .pipeline import get_default_stage
from .references import get_reference_prefix, next_reference
from .serializers import LeadCaptureSerializer

logger = logging.getLogger(__name__)

IDEMPOTENCY_WINDOW = timedelta(minutes=5)
DUPLICATE_WINDOW = timedelta(days=30)


class LeadCaptureView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "lead_capture"

    def post(self, request):
        honeypot = request.data.get("website") if hasattr(request.data, "get") else None
        if honeypot:
            logger.info("Lead capture honeypot triggered; dropping submission.")
            return Response(
                {"detail": "ok", "reference": None}, status=status.HTTP_201_CREATED
            )

        serializer = LeadCaptureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        phone_normalized = serializer.context["phone_normalized"]

        service = None
        service_slug = (data.get("service") or "").strip()
        if service_slug:
            # Unknown/inactive slugs are tolerated (funnel configs may drift).
            service = Service.objects.filter(
                slug=service_slug, is_active=True
            ).first()

        now = timezone.now()

        # Idempotency: same normalized phone + same message inside the window
        # returns the existing lead instead of creating a duplicate.
        existing = Lead.objects.filter(
            phone_normalized=phone_normalized,
            message=data["message"],
            created_at__gte=now - IDEMPOTENCY_WINDOW,
        ).first()
        if existing is not None:
            return Response(
                {"detail": "ok", "reference": existing.reference},
                status=status.HTTP_200_OK,
            )

        with transaction.atomic():
            lead = Lead.objects.create(
                reference=next_reference(get_reference_prefix()),
                name=data["name"],
                phone=data["phone"],
                phone_normalized=phone_normalized,
                email=data["email"],
                message=data["message"],
                service=service,
                stage=get_default_stage(),
                source=data["source"],
                custom_fields=data["custom_fields"],
                attribution=data["attribution"],
                consent_marketing=data["consent_marketing"],
                lang=data["lang"],
            )
            StageTransition.objects.create(
                lead=lead,
                from_stage=None,
                to_stage=lead.stage,
                changed_by="system",
            )
            recent_duplicate = (
                Lead.objects.filter(
                    phone_normalized=phone_normalized,
                    created_at__gte=now - DUPLICATE_WINDOW,
                )
                .exclude(pk=lead.pk)
                .order_by("-created_at")
                .first()
            )
            if recent_duplicate is not None:
                LeadActivity.objects.create(
                    lead=lead,
                    type=LeadActivity.Type.SYSTEM,
                    body=f"Possible duplicate of {recent_duplicate.reference}",
                    actor="system",
                )

        notify_owner(lead)
        send_autoresponder(lead)

        return Response(
            {"detail": "ok", "reference": lead.reference},
            status=status.HTTP_201_CREATED,
        )
