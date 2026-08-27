"""Phone normalization and WhatsApp deep-link helpers."""
import re
from urllib.parse import urlencode

SEPARATOR_RE = re.compile(r"[ \-().]")
BD_LOCAL_RE = re.compile(r"^01[3-9]\d{8}$")


def normalize_phone(raw: str) -> str:
    """Normalize ``raw`` to a digits-only international-ish form.

    - Strips spaces, dashes, parentheses and dots.
    - A single leading ``+`` is allowed and dropped; ``+`` anywhere else is
      invalid.
    - Bangladesh convenience: local ``01[3-9]XXXXXXXX`` (11 digits) gets a
      ``88`` country prefix; a leading ``00880...`` is collapsed to ``880...``.
    - The result must be 8-15 digits, otherwise ``ValueError`` is raised.
    """
    if raw is None:
        raise ValueError("Phone number is required.")
    value = SEPARATOR_RE.sub("", str(raw).strip())
    if value.startswith("+"):
        value = value[1:]
    if not value.isdigit():
        raise ValueError("Phone number contains invalid characters.")
    if value.startswith("00880"):
        value = value[2:]
    if BD_LOCAL_RE.fullmatch(value):
        value = "88" + value
    if not 8 <= len(value) <= 15:
        raise ValueError("Phone number must be 8-15 digits.")
    return value


def whatsapp_url(normalized: str, text: str = "") -> str:
    """Return a ``https://wa.me/`` link for a normalized phone number."""
    url = f"https://wa.me/{normalized}"
    if text:
        url = f"{url}?{urlencode({'text': text})}"
    return url
