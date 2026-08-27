"""Validation for lead capture and shared lead field helpers."""
from rest_framework import serializers

from .phones import normalize_phone

ATTRIBUTION_ALLOWED_KEYS = (
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "fbclid",
    "gclid",
    "fbp",
    "fbc",
    "landing_page",
    "referrer",
)

CUSTOM_FIELDS_MAX_KEYS = 20
CUSTOM_FIELDS_MAX_KEY_LENGTH = 50
CUSTOM_FIELDS_MAX_VALUE_LENGTH = 500
ATTRIBUTION_MAX_VALUE_LENGTH = 500

PHONE_ERROR = "Enter a valid phone number."


def clean_custom_fields(value):
    """Validate/coerce a custom_fields payload into a flat str->str dict."""
    if value in (None, ""):
        return {}
    if not isinstance(value, dict):
        raise serializers.ValidationError("custom_fields must be an object.")
    if len(value) > CUSTOM_FIELDS_MAX_KEYS:
        raise serializers.ValidationError(
            f"custom_fields may contain at most {CUSTOM_FIELDS_MAX_KEYS} keys."
        )
    cleaned = {}
    for key, item in value.items():
        key = str(key)
        if len(key) > CUSTOM_FIELDS_MAX_KEY_LENGTH:
            raise serializers.ValidationError(
                f"custom_fields keys must be at most "
                f"{CUSTOM_FIELDS_MAX_KEY_LENGTH} characters."
            )
        if isinstance(item, (dict, list)):
            raise serializers.ValidationError(
                "custom_fields values must be flat (no nested objects or lists)."
            )
        if item is None:
            item = ""
        elif isinstance(item, bool):
            item = "true" if item else "false"
        cleaned[key] = str(item)[:CUSTOM_FIELDS_MAX_VALUE_LENGTH]
    return cleaned


def clean_attribution(value):
    """Keep only whitelisted attribution keys; coerce values to short strings."""
    if value in (None, ""):
        return {}
    if not isinstance(value, dict):
        raise serializers.ValidationError("attribution must be an object.")
    cleaned = {}
    for key in ATTRIBUTION_ALLOWED_KEYS:
        if key not in value:
            continue
        item = value[key]
        if item is None or isinstance(item, (dict, list)):
            continue
        cleaned[key] = str(item)[:ATTRIBUTION_MAX_VALUE_LENGTH]
    return cleaned


class LeadCaptureSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    phone = serializers.CharField(max_length=30)
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    message = serializers.CharField(
        max_length=5000, required=False, allow_blank=True, default=""
    )
    service = serializers.CharField(
        required=False, allow_blank=True, allow_null=True, default=""
    )
    source = serializers.CharField(
        max_length=100, required=False, allow_blank=True, default=""
    )
    lang = serializers.CharField(required=False, allow_blank=True, default="en")
    consent_marketing = serializers.BooleanField(required=False, default=False)
    custom_fields = serializers.JSONField(required=False, default=dict)
    attribution = serializers.JSONField(required=False, default=dict)
    # Honeypot — checked by the view before validation, never validated here.
    website = serializers.CharField(
        required=False, allow_blank=True, trim_whitespace=False, default=""
    )

    def validate_phone(self, value):
        try:
            self.context["phone_normalized"] = normalize_phone(value)
        except ValueError:
            raise serializers.ValidationError(PHONE_ERROR)
        return value

    def validate_lang(self, value):
        return value if value in {"en", "bn"} else "en"

    def validate_custom_fields(self, value):
        return clean_custom_fields(value)

    def validate_attribution(self, value):
        return clean_attribution(value)
