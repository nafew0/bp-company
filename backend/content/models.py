from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class SiteConfig(models.Model):
    """Singleton holding site-wide contact/branding configuration."""

    site_name = models.CharField(max_length=120, default="Acme Services")
    tagline_en = models.CharField(max_length=200, blank=True)
    tagline_bn = models.CharField(max_length=200, blank=True)
    phone_primary = models.CharField(max_length=30, blank=True)
    phone_secondary = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    whatsapp_number = models.CharField(max_length=20, blank=True)
    address_en = models.TextField(blank=True)
    address_bn = models.TextField(blank=True)
    hours_en = models.CharField(max_length=200, blank=True)
    hours_bn = models.CharField(max_length=200, blank=True)
    google_maps_embed_url = models.URLField(blank=True)
    facebook_url = models.URLField(blank=True)
    instagram_url = models.URLField(blank=True)
    youtube_url = models.URLField(blank=True)
    linkedin_url = models.URLField(blank=True)
    meta_title_en = models.CharField(max_length=160, blank=True)
    meta_title_bn = models.CharField(max_length=160, blank=True)
    meta_description_en = models.CharField(max_length=320, blank=True)
    meta_description_bn = models.CharField(max_length=320, blank=True)
    meta_pixel_id = models.CharField(max_length=50, blank=True)
    ga4_measurement_id = models.CharField(max_length=50, blank=True)
    gtm_container_id = models.CharField(max_length=50, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "site configuration"
        verbose_name_plural = "site configuration"

    def save(self, *args, **kwargs):
        self.pk = 1
        kwargs.pop("force_insert", None)
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return self.site_name


class Service(models.Model):
    name_en = models.CharField(max_length=120)
    name_bn = models.CharField(max_length=120, blank=True)
    slug = models.SlugField(unique=True)
    icon = models.CharField(
        max_length=50, blank=True, help_text="Lucide icon name, e.g. 'wrench'."
    )
    summary_en = models.CharField(max_length=300)
    summary_bn = models.CharField(max_length=300, blank=True)
    body_en = models.TextField(blank=True)
    body_bn = models.TextField(blank=True)
    image = models.ImageField(upload_to="services/", blank=True)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "name_en"]

    def __str__(self):
        return self.name_en


class Testimonial(models.Model):
    __test__ = False  # keep pytest from collecting this model as a test class

    customer_name = models.CharField(max_length=100)
    rating = models.PositiveSmallIntegerField(
        default=5, validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    body_en = models.TextField()
    body_bn = models.TextField(blank=True)
    source = models.CharField(max_length=50, default="google")
    is_featured = models.BooleanField(default=False)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["display_order", "-created_at"]

    def __str__(self):
        return self.customer_name


class FAQItem(models.Model):
    category = models.CharField(max_length=50, default="general")
    question_en = models.CharField(max_length=300)
    question_bn = models.CharField(max_length=300, blank=True)
    answer_en = models.TextField()
    answer_bn = models.TextField(blank=True)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["display_order", "id"]
        verbose_name = "FAQ item"

    def __str__(self):
        return self.question_en


class TeamMember(models.Model):
    name = models.CharField(max_length=100)
    role_en = models.CharField(max_length=100)
    role_bn = models.CharField(max_length=100, blank=True)
    bio_en = models.TextField(blank=True)
    bio_bn = models.TextField(blank=True)
    photo = models.ImageField(upload_to="team/", blank=True)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["display_order", "name"]

    def __str__(self):
        return self.name
