"""Concurrency-safe document reference generation.

References look like ``LD-202608-00042``: prefix, local year+month, and a
5-digit counter that resets each month. The counter row is locked with
``select_for_update`` so concurrent captures never produce duplicates.
"""
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import DocumentCounter


def get_reference_prefix():
    return getattr(settings, "LEADS_REFERENCE_PREFIX", "LD")


def next_reference(prefix: str = None) -> str:
    """Return the next reference ``{prefix}-{YYYYMM}-{NNNNN}`` for this month."""
    if prefix is None:
        prefix = get_reference_prefix()
    month = timezone.localtime().strftime("%Y%m")
    scope = f"{prefix}:{month}"
    with transaction.atomic():
        DocumentCounter.objects.get_or_create(scope=scope)
        counter = DocumentCounter.objects.select_for_update().get(scope=scope)
        counter.value += 1
        counter.save(update_fields=["value"])
        return f"{prefix}-{month}-{counter.value:05d}"
