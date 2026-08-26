from django.contrib import admin

from .models import FAQItem, Service, SiteConfig, TeamMember, Testimonial


@admin.register(SiteConfig)
class SiteConfigAdmin(admin.ModelAdmin):
    list_display = ["site_name", "phone_primary", "email", "updated_at"]

    def has_add_permission(self, request):
        # Singleton: allow adding only while no row exists.
        return not SiteConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ["name_en", "slug", "icon", "display_order", "is_active", "updated_at"]
    list_editable = ["display_order", "is_active"]
    list_filter = ["is_active"]
    search_fields = ["name_en", "name_bn", "slug"]
    prepopulated_fields = {"slug": ["name_en"]}


@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = [
        "customer_name",
        "rating",
        "source",
        "is_featured",
        "display_order",
        "created_at",
    ]
    list_editable = ["is_featured", "display_order"]
    list_filter = ["is_featured", "source", "rating"]
    search_fields = ["customer_name", "body_en"]


@admin.register(FAQItem)
class FAQItemAdmin(admin.ModelAdmin):
    list_display = ["question_en", "category", "display_order", "is_active"]
    list_editable = ["display_order", "is_active"]
    list_filter = ["category", "is_active"]
    search_fields = ["question_en", "question_bn"]


@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ["name", "role_en", "display_order", "is_active"]
    list_editable = ["display_order", "is_active"]
    list_filter = ["is_active"]
    search_fields = ["name", "role_en"]
