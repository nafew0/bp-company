from django.core.management.base import BaseCommand

from leads.models import PipelineStage
from leads.pipeline import ensure_default_stages


class Command(BaseCommand):
    help = "Create the default lead pipeline stages (idempotent)."

    def handle(self, *args, **options):
        ensure_default_stages()
        self.stdout.write(
            self.style.SUCCESS(
                f"Pipeline stages ensured ({PipelineStage.objects.count()} total)."
            )
        )
