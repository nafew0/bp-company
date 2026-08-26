"""Seed deterministic data for Playwright e2e runs.

Idempotent: safe to run repeatedly. Only for dev/CI databases.
"""
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand

E2E_ADMIN_EMAIL = "e2e-admin@example.com"
E2E_ADMIN_USERNAME = "e2e-admin"
E2E_ADMIN_PASSWORD = "e2e-Admin-Pass-1234"  # test-only credential, never used in production


class Command(BaseCommand):
    help = "Seed deterministic users/data for Playwright e2e tests (idempotent)."

    def handle(self, *args, **options):
        User = get_user_model()
        admin, created = User.objects.get_or_create(
            username=E2E_ADMIN_USERNAME,
            defaults={
                "email": E2E_ADMIN_EMAIL,
                "first_name": "E2E",
                "last_name": "Admin",
            },
        )
        admin.email = E2E_ADMIN_EMAIL
        admin.is_staff = True
        admin.is_superuser = True
        admin.is_active = True
        if hasattr(admin, "email_verified"):
            admin.email_verified = True
        admin.set_password(E2E_ADMIN_PASSWORD)
        admin.save()
        self.stdout.write(
            self.style.SUCCESS(
                f"e2e admin {'created' if created else 'updated'}: {E2E_ADMIN_USERNAME}"
            )
        )
        call_command("seed_demo", stdout=self.stdout)
