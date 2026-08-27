from django.urls import path

from . import admin_views

app_name = "leads_admin"

urlpatterns = [
    path("leads/", admin_views.AdminLeadsView.as_view(), name="leads-list"),
    path(
        "leads/board/",
        admin_views.AdminLeadsBoardView.as_view(),
        name="leads-board",
    ),
    path(
        "leads/summary/",
        admin_views.AdminLeadsSummaryView.as_view(),
        name="leads-summary",
    ),
    path(
        "leads/<uuid:lead_id>/",
        admin_views.AdminLeadDetailView.as_view(),
        name="leads-detail",
    ),
    path(
        "leads/<uuid:lead_id>/stage/",
        admin_views.AdminLeadStageView.as_view(),
        name="leads-stage",
    ),
    path(
        "leads/<uuid:lead_id>/activities/",
        admin_views.AdminLeadActivitiesView.as_view(),
        name="leads-activities",
    ),
    path(
        "pipeline/stages/",
        admin_views.AdminPipelineStagesView.as_view(),
        name="pipeline-stages",
    ),
    path(
        "pipeline/stages/reorder/",
        admin_views.AdminPipelineStageReorderView.as_view(),
        name="pipeline-stages-reorder",
    ),
    path(
        "pipeline/stages/<int:stage_id>/",
        admin_views.AdminPipelineStageDetailView.as_view(),
        name="pipeline-stage-detail",
    ),
]
