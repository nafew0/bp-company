import uuid

from django.conf import settings
from django.db import models


class PipelineStage(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    color = models.CharField(max_length=20, default="#6B7280", help_text='Hex color, e.g. "#22C55E".')
    order = models.PositiveIntegerField(default=0)
    is_terminal = models.BooleanField(default=False)
    counts_as_converted = models.BooleanField(default=False)
    requires_reason = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.name


class Lead(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=30, unique=True, db_index=True)
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=30)
    phone_normalized = models.CharField(max_length=20, db_index=True)
    email = models.EmailField(blank=True)
    message = models.TextField(blank=True)
    service = models.ForeignKey(
        "content.Service",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="leads",
    )
    stage = models.ForeignKey(
        PipelineStage,
        on_delete=models.PROTECT,
        related_name="leads",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_leads",
    )
    source = models.CharField(max_length=100, blank=True)
    custom_fields = models.JSONField(default=dict, blank=True)
    attribution = models.JSONField(default=dict, blank=True)
    consent_marketing = models.BooleanField(default=False)
    lang = models.CharField(max_length=5, default="en")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.reference} — {self.name}"


class StageTransition(models.Model):
    lead = models.ForeignKey(
        Lead,
        on_delete=models.CASCADE,
        related_name="transitions",
    )
    from_stage = models.ForeignKey(
        PipelineStage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    to_stage = models.ForeignKey(
        PipelineStage,
        on_delete=models.PROTECT,
        related_name="+",
    )
    reason = models.TextField(blank=True)
    changed_by = models.CharField(max_length=150, help_text='Username or "system".')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.lead_id}: {self.from_stage_id} -> {self.to_stage_id}"


class LeadActivity(models.Model):
    class Type(models.TextChoices):
        NOTE = "note", "Note"
        CALL = "call", "Call"
        WHATSAPP_CLICK = "whatsapp_click", "WhatsApp click"
        EMAIL_SENT = "email_sent", "Email sent"
        SYSTEM = "system", "System"

    lead = models.ForeignKey(
        Lead,
        on_delete=models.CASCADE,
        related_name="activities",
    )
    type = models.CharField(max_length=20, choices=Type.choices)
    body = models.TextField()
    actor = models.CharField(max_length=150, help_text='Username or "system".')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "lead activities"

    def __str__(self):
        return f"{self.lead_id}: {self.type}"


class DocumentCounter(models.Model):
    """Generic monthly counter (references now, invoices later)."""

    scope = models.CharField(max_length=50, unique=True)
    value = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.scope}={self.value}"
