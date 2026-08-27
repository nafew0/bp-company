"""Pipeline stage bootstrap helpers."""
from .models import PipelineStage

DEFAULT_STAGES = [
    {"slug": "new", "name": "New", "color": "#3B82F6", "order": 0},
    {"slug": "contacted", "name": "Contacted", "color": "#8B5CF6", "order": 1},
    {"slug": "qualified", "name": "Qualified", "color": "#F59E0B", "order": 2},
    {"slug": "booked", "name": "Booked", "color": "#06B6D4", "order": 3},
    {
        "slug": "won",
        "name": "Won",
        "color": "#22C55E",
        "order": 4,
        "is_terminal": True,
        "counts_as_converted": True,
    },
    {
        "slug": "lost",
        "name": "Lost",
        "color": "#EF4444",
        "order": 5,
        "is_terminal": True,
        "requires_reason": True,
    },
]


def ensure_default_stages():
    """Create the default pipeline stages. Idempotent (matched by slug)."""
    for data in DEFAULT_STAGES:
        defaults = {key: value for key, value in data.items() if key != "slug"}
        PipelineStage.objects.get_or_create(slug=data["slug"], defaults=defaults)


def get_default_stage():
    """First active stage by order; bootstraps defaults when none exist."""
    stage = PipelineStage.objects.filter(is_active=True).first()
    if stage is not None:
        return stage
    if not PipelineStage.objects.exists():
        ensure_default_stages()
        return PipelineStage.objects.filter(is_active=True).first()
    # Degenerate case: stages exist but all are archived. Fall back to the
    # first stage overall so capture never hard-fails.
    return PipelineStage.objects.first()
