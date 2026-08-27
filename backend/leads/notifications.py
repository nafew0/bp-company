"""Owner notification + customer auto-responder emails for new leads.

Both functions swallow (and log) every exception: lead capture must never
fail because email delivery did.
"""
import logging

from django.conf import settings
from django.core.mail import EmailMessage

from content.models import SiteConfig

from .models import LeadActivity

logger = logging.getLogger(__name__)

AUTORESPONDER_TEMPLATES = {
    "en": {
        "subject": "Thanks for contacting {site_name} (ref {reference})",
        "body": (
            "Hi {name},\n\n"
            "Thank you for reaching out to {site_name}. We have received your "
            "request and our team will get back to you shortly.\n\n"
            "Your reference number is {reference} — please mention it if you "
            "call or message us about this request.\n\n"
            "Best regards,\n"
            "{site_name}"
        ),
    },
    "bn": {
        "subject": "{site_name}-এ যোগাযোগের জন্য ধন্যবাদ (রেফারেন্স {reference})",
        "body": (
            "প্রিয় {name},\n\n"
            "{site_name}-এ যোগাযোগ করার জন্য আপনাকে ধন্যবাদ। আমরা আপনার অনুরোধটি "
            "পেয়েছি এবং আমাদের টিম শীঘ্রই আপনার সাথে যোগাযোগ করবে।\n\n"
            "আপনার রেফারেন্স নম্বর: {reference} — এই অনুরোধ সম্পর্কে ফোন বা "
            "মেসেজ করলে নম্বরটি উল্লেখ করুন।\n\n"
            "শুভেচ্ছান্তে,\n"
            "{site_name}"
        ),
    },
}


def _attribution_summary(attribution):
    if not attribution:
        return "-"
    return ", ".join(f"{key}={value}" for key, value in attribution.items())


def notify_owner(lead):
    """Email the site owner about a new lead. Never raises."""
    try:
        config = SiteConfig.get_solo()
        if not config.email:
            logger.warning(
                "Lead %s captured but SiteConfig email is empty; owner not notified.",
                lead.reference,
            )
            return
        service_name = lead.service.name_en if lead.service else "-"
        body_lines = [
            f"Name: {lead.name}",
            f"Phone: {lead.phone}",
            f"Email: {lead.email or '-'}",
            f"Service: {service_name}",
            f"Source: {lead.source or '-'}",
            f"Attribution: {_attribution_summary(lead.attribution)}",
            "",
            "Message:",
            lead.message or "-",
        ]
        EmailMessage(
            subject=f"[{config.site_name}] New lead {lead.reference} — {lead.name}",
            body="\n".join(body_lines),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[config.email],
            reply_to=[lead.email] if lead.email else None,
        ).send()
        LeadActivity.objects.create(
            lead=lead,
            type=LeadActivity.Type.SYSTEM,
            body="Owner notified",
            actor="system",
        )
    except Exception:
        logger.exception("Failed to send owner notification for lead %s.", lead.pk)


def send_autoresponder(lead):
    """Send the customer a localized thank-you email. Never raises."""
    try:
        if not lead.email:
            return
        config = SiteConfig.get_solo()
        if config.email and lead.email.lower() == config.email.lower():
            # Loop prevention: never auto-respond to the owner's own address.
            return
        lang = lead.lang if lead.lang in AUTORESPONDER_TEMPLATES else "en"
        template = AUTORESPONDER_TEMPLATES[lang]
        context = {
            "site_name": config.site_name,
            "name": lead.name,
            "reference": lead.reference,
        }
        EmailMessage(
            subject=template["subject"].format(**context),
            body=template["body"].format(**context),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[lead.email],
        ).send()
        LeadActivity.objects.create(
            lead=lead,
            type=LeadActivity.Type.EMAIL_SENT,
            body=f"Auto-responder sent ({lang})",
            actor="system",
        )
    except Exception:
        logger.exception("Failed to send auto-responder for lead %s.", lead.pk)
