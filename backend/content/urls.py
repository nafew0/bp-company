from django.urls import path

from . import views

app_name = "content"

urlpatterns = [
    path("config/", views.SiteConfigView.as_view(), name="config"),
    path("services/", views.ServiceListView.as_view(), name="service-list"),
    path(
        "services/<slug:slug>/",
        views.ServiceDetailView.as_view(),
        name="service-detail",
    ),
    path("testimonials/", views.TestimonialListView.as_view(), name="testimonial-list"),
    path("faq/", views.FAQListView.as_view(), name="faq-list"),
    path("team/", views.TeamListView.as_view(), name="team-list"),
    path("contact/", views.ContactView.as_view(), name="contact"),
]
