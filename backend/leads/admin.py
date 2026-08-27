from django.contrib import admin

from .models import DocumentCounter, Lead, LeadActivity, PipelineStage, StageTransition


@admin.register(PipelineStage)
class PipelineStageAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "order", "is_terminal", "is_active")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ("reference", "name", "phone", "stage", "created_at")
    list_filter = ("stage", "service")
    search_fields = ("reference", "name", "phone", "phone_normalized", "email")
    readonly_fields = ("id", "reference", "created_at", "updated_at")


@admin.register(StageTransition)
class StageTransitionAdmin(admin.ModelAdmin):
    list_display = ("lead", "from_stage", "to_stage", "changed_by", "created_at")


@admin.register(LeadActivity)
class LeadActivityAdmin(admin.ModelAdmin):
    list_display = ("lead", "type", "actor", "created_at")
    list_filter = ("type",)


@admin.register(DocumentCounter)
class DocumentCounterAdmin(admin.ModelAdmin):
    list_display = ("scope", "value")
