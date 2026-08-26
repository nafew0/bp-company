import logging

from django.conf import settings
from django.core.mail import EmailMessage
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .localize import pick, request_lang
from .models import FAQItem, Service, SiteConfig, TeamMember, Testimonial
from .serializers import ContactSerializer

logger = logging.getLogger(__name__)

CACHE_CONTROL_VALUE = "public, max-age=300"


class PublicCachedAPIView(APIView):
    """Public read endpoint: anonymous access + short shared-cache header."""

    permission_classes = [AllowAny]

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        if request.method == "GET" and response.status_code == 200:
            response["Cache-Control"] = CACHE_CONTROL_VALUE
        return response


def _image_url(request, image_field):
    if not image_field:
        return None
    return request.build_absolute_uri(image_field.url)


def _service_summary_payload(service, request, lang):
    return {
        "id": service.id,
        "slug": service.slug,
        "icon": service.icon,
        "name": pick(service, "name", lang),
        "summary": pick(service, "summary", lang),
        "image": _image_url(request, service.image),
    }


class SiteConfigView(PublicCachedAPIView):
    def get(self, request):
        config = SiteConfig.get_solo()
        lang = request_lang(request)
        return Response(
            {
                "site_name": config.site_name,
                "tagline": pick(config, "tagline", lang),
                "phone_primary": config.phone_primary,
                "phone_secondary": config.phone_secondary,
                "email": config.email,
                "whatsapp_number": config.whatsapp_number,
                "address": pick(config, "address", lang),
                "hours": pick(config, "hours", lang),
                "maps_embed_url": config.google_maps_embed_url,
                "social": {
                    "facebook": config.facebook_url,
                    "instagram": config.instagram_url,
                    "youtube": config.youtube_url,
                    "linkedin": config.linkedin_url,
                },
                "meta": {
                    "title": pick(config, "meta_title", lang),
                    "description": pick(config, "meta_description", lang),
                },
            }
        )


class ServiceListView(PublicCachedAPIView):
    def get(self, request):
        lang = request_lang(request)
        services = Service.objects.filter(is_active=True)
        return Response(
            [_service_summary_payload(service, request, lang) for service in services]
        )


class ServiceDetailView(PublicCachedAPIView):
    def get(self, request, slug):
        service = get_object_or_404(Service, slug=slug, is_active=True)
        lang = request_lang(request)
        payload = _service_summary_payload(service, request, lang)
        payload["body"] = pick(service, "body", lang)
        return Response(payload)


class TestimonialListView(PublicCachedAPIView):
    def get(self, request):
        lang = request_lang(request)
        testimonials = Testimonial.objects.order_by(
            "-is_featured", "display_order", "-created_at"
        )
        return Response(
            [
                {
                    "id": testimonial.id,
                    "customer_name": testimonial.customer_name,
                    "rating": testimonial.rating,
                    "body": pick(testimonial, "body", lang),
                    "source": testimonial.source,
                    "is_featured": testimonial.is_featured,
                }
                for testimonial in testimonials
            ]
        )


class FAQListView(PublicCachedAPIView):
    def get(self, request):
        lang = request_lang(request)
        items = FAQItem.objects.filter(is_active=True)
        category = request.query_params.get("category")
        if category:
            items = items.filter(category=category)
        return Response(
            [
                {
                    "id": item.id,
                    "category": item.category,
                    "question": pick(item, "question", lang),
                    "answer": pick(item, "answer", lang),
                }
                for item in items
            ]
        )


class TeamListView(PublicCachedAPIView):
    def get(self, request):
        lang = request_lang(request)
        members = TeamMember.objects.filter(is_active=True)
        return Response(
            [
                {
                    "id": member.id,
                    "name": member.name,
                    "role": pick(member, "role", lang),
                    "bio": pick(member, "bio", lang),
                    "photo": _image_url(request, member.photo),
                }
                for member in members
            ]
        )


class ContactView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "contact"

    def post(self, request):
        honeypot = request.data.get("website") if hasattr(request.data, "get") else None
        if honeypot:
            logger.info("Contact form honeypot triggered; dropping submission.")
            return Response({"detail": "ok"}, status=status.HTTP_201_CREATED)

        serializer = ContactSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        config = SiteConfig.get_solo()
        if not config.email:
            logger.warning(
                "Contact form submitted but SiteConfig email is empty; "
                "notification not sent."
            )
            return Response({"detail": "ok"}, status=status.HTTP_201_CREATED)

        customer_email = data.get("email", "")
        body_lines = [
            f"Name: {data['name']}",
            f"Phone: {data['phone']}",
            f"Email: {customer_email or '-'}",
            "",
            "Message:",
            data["message"],
        ]
        email_message = EmailMessage(
            subject=f"[{config.site_name}] New contact from {data['name']}",
            body="\n".join(body_lines),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[config.email],
            reply_to=[customer_email] if customer_email else None,
        )
        try:
            email_message.send()
        except Exception:
            logger.exception("Failed to send contact notification email.")

        return Response({"detail": "ok"}, status=status.HTTP_201_CREATED)
