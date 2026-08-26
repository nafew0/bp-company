import re

from rest_framework import serializers

PHONE_ALLOWED_RE = re.compile(r"^[0-9+() \-]+$")


class ContactSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    phone = serializers.CharField(max_length=40)
    email = serializers.EmailField(required=False, allow_blank=True)
    message = serializers.CharField(max_length=5000)
    # Honeypot field — handled by the view, never validated here.
    website = serializers.CharField(
        required=False, allow_blank=True, trim_whitespace=False
    )

    def validate_phone(self, value):
        if not PHONE_ALLOWED_RE.fullmatch(value):
            raise serializers.ValidationError(
                "Phone number may only contain digits, spaces, +, -, ( and )."
            )
        stripped = re.sub(r"[ \-]", "", value)
        if not 6 <= len(stripped) <= 20:
            raise serializers.ValidationError(
                "Phone number must be 6-20 characters long."
            )
        return value
