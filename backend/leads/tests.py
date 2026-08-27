import threading
from datetime import datetime, timedelta, timezone as dt_timezone
from io import StringIO
from unittest import mock

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.core.management import call_command
from django.db import connection
from django.test import SimpleTestCase, TestCase, TransactionTestCase
from django.utils import timezone

from rest_framework.test import APITestCase

from content.models import Service, SiteConfig

from .models import (
    DocumentCounter,
    Lead,
    LeadActivity,
    PipelineStage,
    StageTransition,
)
from .phones import normalize_phone, whatsapp_url
from .pipeline import ensure_default_stages, get_default_stage
from .references import next_reference

User = get_user_model()

CAPTURE_URL = "/api/leads/capture/"
ADMIN_LEADS_URL = "/api/admin/leads/"
ADMIN_BOARD_URL = "/api/admin/leads/board/"
ADMIN_SUMMARY_URL = "/api/admin/leads/summary/"
ADMIN_STAGES_URL = "/api/admin/pipeline/stages/"
ADMIN_STAGES_REORDER_URL = "/api/admin/pipeline/stages/reorder/"

OWNER_EMAIL = "owner@example.com"


def capture_payload(**overrides):
    payload = {
        "name": "Test Customer",
        "phone": "01712-345678",
        "email": "customer@example.net",
        "message": "Please fix my laptop.",
        "service": "",
        "source": "homepage-hero",
        "lang": "en",
        "consent_marketing": True,
        "custom_fields": {},
        "attribution": {},
        "website": "",
    }
    payload.update(overrides)
    return payload


def make_lead(stage, *, reference, name="Lead", phone="01712345678", **kwargs):
    return Lead.objects.create(
        reference=reference,
        name=name,
        phone=phone,
        phone_normalized=normalize_phone(phone),
        stage=stage,
        **kwargs,
    )



class NormalizePhoneTests(SimpleTestCase):
    def test_bd_local_gets_country_code(self):
        self.assertEqual(normalize_phone("01712345678"), "8801712345678")

    def test_bd_local_all_operator_prefixes(self):
        for digit in "3456789":
            number = f"01{digit}12345678"
            self.assertEqual(normalize_phone(number), f"88{number}")

    def test_plus_880_form(self):
        self.assertEqual(normalize_phone("+8801712345678"), "8801712345678")

    def test_spaces_dashes_parens_dots_stripped(self):
        self.assertEqual(normalize_phone("017 12-345.678"), "8801712345678")
        self.assertEqual(normalize_phone("+1 (415) 555-0132"), "14155550132")

    def test_00_prefix_collapsed(self):
        self.assertEqual(normalize_phone("008801712345678"), "8801712345678")

    def test_too_short_raises(self):
        with self.assertRaises(ValueError):
            normalize_phone("12345")

    def test_too_long_raises(self):
        with self.assertRaises(ValueError):
            normalize_phone("1234567890123456")

    def test_plus_in_middle_raises(self):
        with self.assertRaises(ValueError):
            normalize_phone("017+12345678")

    def test_letters_raise(self):
        with self.assertRaises(ValueError):
            normalize_phone("01712abc678")

    def test_empty_raises(self):
        with self.assertRaises(ValueError):
            normalize_phone("")

    def test_whatsapp_url_without_text(self):
        self.assertEqual(
            whatsapp_url("8801712345678"), "https://wa.me/8801712345678"
        )

    def test_whatsapp_url_encodes_text(self):
        url = whatsapp_url("8801712345678", "Hello there & welcome")
        self.assertEqual(
            url, "https://wa.me/8801712345678?text=Hello+there+%26+welcome"
        )


class NextReferenceTests(TestCase):
    def test_format_and_sequence(self):
        month = timezone.localtime().strftime("%Y%m")
        first = next_reference("LD")
        second = next_reference("LD")
        self.assertEqual(first, f"LD-{month}-00001")
        self.assertEqual(second, f"LD-{month}-00002")

    def test_prefixes_have_independent_scopes(self):
        month = timezone.localtime().strftime("%Y%m")
        self.assertEqual(next_reference("LD"), f"LD-{month}-00001")
        self.assertEqual(next_reference("INV"), f"INV-{month}-00001")

    def test_monthly_reset(self):
        next_reference("LD")
        next_reference("LD")
        future = datetime(2031, 1, 15, 12, 0, tzinfo=dt_timezone.utc)
        with mock.patch(
            "leads.references.timezone.localtime", return_value=future
        ):
            self.assertEqual(next_reference("LD"), "LD-203101-00001")
        month = timezone.localtime().strftime("%Y%m")
        self.assertEqual(next_reference("LD"), f"LD-{month}-00003")

    def test_default_prefix_comes_from_settings(self):
        with self.settings(LEADS_REFERENCE_PREFIX="ZZ"):
            self.assertTrue(next_reference().startswith("ZZ-"))


class NextReferenceConcurrencyTests(TransactionTestCase):
    def test_concurrent_generation_produces_unique_references(self):
        threads_count, per_thread = 10, 5
        results = []
        errors = []
        lock = threading.Lock()

        def worker():
            try:
                local = [next_reference("LD") for _ in range(per_thread)]
                with lock:
                    results.extend(local)
            except Exception as exc:  # pragma: no cover - failure path
                with lock:
                    errors.append(exc)
            finally:
                connection.close()

        threads = [
            threading.Thread(target=worker) for _ in range(threads_count)
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        self.assertEqual(errors, [])
        self.assertEqual(len(results), threads_count * per_thread)
        self.assertEqual(len(set(results)), threads_count * per_thread)
        month = timezone.localtime().strftime("%Y%m")
        counter = DocumentCounter.objects.get(scope=f"LD:{month}")
        self.assertEqual(counter.value, threads_count * per_thread)


class PipelineBootstrapTests(TestCase):
    def test_ensure_default_stages_idempotent(self):
        ensure_default_stages()
        ensure_default_stages()
        self.assertEqual(PipelineStage.objects.count(), 6)
        slugs = list(PipelineStage.objects.values_list("slug", flat=True))
        self.assertEqual(
            slugs, ["new", "contacted", "qualified", "booked", "won", "lost"]
        )
        won = PipelineStage.objects.get(slug="won")
        self.assertTrue(won.is_terminal)
        self.assertTrue(won.counts_as_converted)
        lost = PipelineStage.objects.get(slug="lost")
        self.assertTrue(lost.is_terminal)
        self.assertTrue(lost.requires_reason)

    def test_get_default_stage_bootstraps_when_empty(self):
        self.assertEqual(PipelineStage.objects.count(), 0)
        stage = get_default_stage()
        self.assertEqual(stage.slug, "new")
        self.assertEqual(PipelineStage.objects.count(), 6)

    def test_get_default_stage_respects_order_and_active(self):
        ensure_default_stages()
        PipelineStage.objects.filter(slug="new").update(is_active=False)
        self.assertEqual(get_default_stage().slug, "contacted")

    def test_seed_pipeline_command_idempotent(self):
        call_command("seed_pipeline", stdout=StringIO())
        call_command("seed_pipeline", stdout=StringIO())
        self.assertEqual(PipelineStage.objects.count(), 6)


class LeadCaptureTests(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        ensure_default_stages()
        config = SiteConfig.get_solo()
        config.site_name = "Acme Services"
        config.email = OWNER_EMAIL
        config.save()
        self.service = Service.objects.create(
            slug="general-repairs",
            name_en="General Repairs",
            summary_en="Repairs",
        )

    def test_capture_creates_lead_with_stage_reference_and_transition(self):
        response = self.client.post(
            CAPTURE_URL,
            capture_payload(
                service="general-repairs",
                custom_fields={"device": "Laptop", "count": 3},
                attribution={
                    "utm_source": "facebook",
                    "utm_medium": "cpc",
                    "evil_key": "dropped",
                },
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["detail"], "ok")
        month = timezone.localtime().strftime("%Y%m")
        self.assertEqual(response.data["reference"], f"LD-{month}-00001")

        lead = Lead.objects.get()
        self.assertEqual(lead.reference, response.data["reference"])
        self.assertEqual(lead.stage.slug, "new")
        self.assertEqual(lead.phone_normalized, "8801712345678")
        self.assertEqual(lead.service, self.service)
        self.assertTrue(lead.consent_marketing)
        self.assertEqual(
            lead.custom_fields, {"device": "Laptop", "count": "3"}
        )
        self.assertEqual(
            lead.attribution, {"utm_source": "facebook", "utm_medium": "cpc"}
        )

        transition = lead.transitions.get()
        self.assertIsNone(transition.from_stage)
        self.assertEqual(transition.to_stage.slug, "new")
        self.assertEqual(transition.changed_by, "system")

    def test_capture_sends_owner_email_and_autoresponder(self):
        response = self.client.post(
            CAPTURE_URL, capture_payload(), format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(mail.outbox), 2)
        owner_mail, customer_mail = mail.outbox
        self.assertEqual(owner_mail.to, [OWNER_EMAIL])
        self.assertIn(response.data["reference"], owner_mail.subject)
        self.assertIn("New lead", owner_mail.subject)
        self.assertEqual(customer_mail.to, ["customer@example.net"])
        self.assertIn(response.data["reference"], customer_mail.body)

        lead = Lead.objects.get()
        bodies = set(lead.activities.values_list("body", flat=True))
        self.assertIn("Owner notified", bodies)
        self.assertIn("Auto-responder sent (en)", bodies)

    def test_capture_bn_autoresponder(self):
        response = self.client.post(
            CAPTURE_URL, capture_payload(lang="bn"), format="json"
        )
        self.assertEqual(response.status_code, 201)
        customer_mail = mail.outbox[-1]
        self.assertIn("ধন্যবাদ", customer_mail.body)
        self.assertIn(response.data["reference"], customer_mail.body)
        lead = Lead.objects.get()
        self.assertEqual(lead.lang, "bn")
        self.assertIn(
            "Auto-responder sent (bn)",
            set(lead.activities.values_list("body", flat=True)),
        )

    def test_autoresponder_skipped_without_email(self):
        self.client.post(CAPTURE_URL, capture_payload(email=""), format="json")
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [OWNER_EMAIL])

    def test_autoresponder_skipped_when_lead_email_is_owner(self):
        self.client.post(
            CAPTURE_URL,
            capture_payload(email=OWNER_EMAIL.upper()),
            format="json",
        )
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [OWNER_EMAIL])

    def test_owner_email_empty_still_creates_lead(self):
        config = SiteConfig.get_solo()
        config.email = ""
        config.save()
        response = self.client.post(
            CAPTURE_URL, capture_payload(email=""), format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(Lead.objects.count(), 1)

    def test_email_exception_does_not_break_capture(self):
        with mock.patch(
            "leads.notifications.EmailMessage.send",
            side_effect=Exception("smtp down"),
        ):
            response = self.client.post(
                CAPTURE_URL, capture_payload(), format="json"
            )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Lead.objects.count(), 1)

    def test_honeypot_creates_nothing(self):
        response = self.client.post(
            CAPTURE_URL, capture_payload(website="spam"), format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data, {"detail": "ok", "reference": None})
        self.assertEqual(Lead.objects.count(), 0)
        self.assertEqual(len(mail.outbox), 0)

    def test_missing_name_and_phone_400(self):
        response = self.client.post(
            CAPTURE_URL, {"email": "a@example.net"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("name", response.data)
        self.assertIn("phone", response.data)

    def test_invalid_phone_400(self):
        response = self.client.post(
            CAPTURE_URL, capture_payload(phone="12ab"), format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["phone"], ["Enter a valid phone number."]
        )

    def test_invalid_email_400(self):
        response = self.client.post(
            CAPTURE_URL, capture_payload(email="not-an-email"), format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)

    def test_nested_custom_fields_400(self):
        response = self.client.post(
            CAPTURE_URL,
            capture_payload(custom_fields={"nested": {"a": 1}}),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("custom_fields", response.data)

    def test_too_many_custom_fields_400(self):
        fields = {f"key{i}": "v" for i in range(21)}
        response = self.client.post(
            CAPTURE_URL, capture_payload(custom_fields=fields), format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_unknown_service_slug_treated_as_null(self):
        response = self.client.post(
            CAPTURE_URL, capture_payload(service="no-such-service"), format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertIsNone(Lead.objects.get().service)

    def test_inactive_service_slug_treated_as_null(self):
        self.service.is_active = False
        self.service.save()
        response = self.client.post(
            CAPTURE_URL, capture_payload(service="general-repairs"), format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertIsNone(Lead.objects.get().service)

    def test_invalid_lang_falls_back_to_en(self):
        self.client.post(CAPTURE_URL, capture_payload(lang="fr"), format="json")
        self.assertEqual(Lead.objects.get().lang, "en")

    def test_idempotency_window_returns_existing_reference(self):
        first = self.client.post(CAPTURE_URL, capture_payload(), format="json")
        second = self.client.post(CAPTURE_URL, capture_payload(), format="json")
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.data["reference"], first.data["reference"])
        self.assertEqual(Lead.objects.count(), 1)

    def test_duplicate_flag_after_idempotency_window(self):
        first = self.client.post(CAPTURE_URL, capture_payload(), format="json")
        Lead.objects.update(
            created_at=timezone.now() - timedelta(minutes=10)
        )
        second = self.client.post(
            CAPTURE_URL,
            capture_payload(message="A different problem this time."),
            format="json",
        )
        self.assertEqual(second.status_code, 201)
        self.assertEqual(Lead.objects.count(), 2)
        new_lead = Lead.objects.get(reference=second.data["reference"])
        self.assertTrue(
            new_lead.activities.filter(
                type="system",
                body=f"Possible duplicate of {first.data['reference']}",
            ).exists()
        )

    def test_capture_throttled_on_11th_request(self):
        from unittest import mock
        from rest_framework.throttling import SimpleRateThrottle

        with mock.patch.dict(
            SimpleRateThrottle.THROTTLE_RATES, {"lead_capture": "10/hour"}
        ):
            self._run_throttle_scenario()

    def _run_throttle_scenario(self):
        for i in range(10):
            response = self.client.post(
                CAPTURE_URL,
                capture_payload(
                    phone=f"017123456{i:02d}", message=f"Request {i}", email=""
                ),
                format="json",
            )
            self.assertEqual(response.status_code, 201)
        response = self.client.post(
            CAPTURE_URL, capture_payload(), format="json"
        )
        self.assertEqual(response.status_code, 429)

    def test_capture_bootstraps_stages_when_none_exist(self):
        PipelineStage.objects.all().delete()
        response = self.client.post(
            CAPTURE_URL, capture_payload(), format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(PipelineStage.objects.count(), 6)
        self.assertEqual(Lead.objects.get().stage.slug, "new")


class AdminLeadAPITestCase(APITestCase):
    """Shared fixtures for the staff lead APIs."""

    def setUp(self):
        super().setUp()
        cache.clear()
        ensure_default_stages()
        self.admin = User.objects.create_superuser(
            username="boss", email="boss@example.com", password="x-Pass-123"
        )
        self.staff_user = User.objects.create_user(
            username="agent",
            email="agent@example.com",
            password="x-Pass-123",
            is_staff=True,
        )
        self.regular_user = User.objects.create_user(
            username="visitor", email="visitor@example.com", password="x-Pass-123"
        )
        self.service = Service.objects.create(
            slug="general-repairs",
            name_en="General Repairs",
            summary_en="Repairs",
        )
        self.stage_new = PipelineStage.objects.get(slug="new")
        self.stage_contacted = PipelineStage.objects.get(slug="contacted")
        self.stage_won = PipelineStage.objects.get(slug="won")
        self.stage_lost = PipelineStage.objects.get(slug="lost")
        self.client.force_authenticate(user=self.admin)


class AdminLeadListTests(AdminLeadAPITestCase):
    def setUp(self):
        super().setUp()
        self.lead_a = make_lead(
            self.stage_new,
            reference="LD-TEST-0001",
            name="Alice Rahman",
            phone="01712345001",
            service=self.service,
            email="alice@example.net",
            source="homepage",
        )
        self.lead_b = make_lead(
            self.stage_contacted,
            reference="LD-TEST-0002",
            name="Babul Mia",
            phone="01812345002",
            assigned_to=self.staff_user,
        )
        self.lead_c = make_lead(
            self.stage_won,
            reference="LD-TEST-0003",
            name="Carol Das",
            phone="01912345003",
            assigned_to=self.admin,
        )

    def test_list_shape_and_pagination(self):
        response = self.client.get(ADMIN_LEADS_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            set(response.data.keys()), {"count", "next", "previous", "results"}
        )
        self.assertEqual(response.data["count"], 3)
        item = response.data["results"][0]
        self.assertEqual(
            set(item.keys()),
            {
                "id",
                "reference",
                "name",
                "phone",
                "email",
                "service",
                "stage",
                "assigned_to",
                "source",
                "created_at",
            },
        )
        # Default ordering: newest first.
        self.assertEqual(item["reference"], "LD-TEST-0003")

    def test_list_item_nested_shapes(self):
        response = self.client.get(ADMIN_LEADS_URL, {"search": "LD-TEST-0001"})
        item = response.data["results"][0]
        self.assertEqual(
            item["service"],
            {
                "id": self.service.id,
                "slug": "general-repairs",
                "name_en": "General Repairs",
            },
        )
        self.assertEqual(
            set(item["stage"].keys()), {"id", "slug", "name", "color"}
        )
        self.assertIsNone(item["assigned_to"])

    def test_filter_by_stage_and_service(self):
        response = self.client.get(ADMIN_LEADS_URL, {"stage": "contacted"})
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["reference"], "LD-TEST-0002"
        )
        response = self.client.get(
            ADMIN_LEADS_URL, {"service": "general-repairs"}
        )
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["reference"], "LD-TEST-0001"
        )

    def test_filter_assigned_to_me_none_and_uuid(self):
        response = self.client.get(ADMIN_LEADS_URL, {"assigned_to": "me"})
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["reference"], "LD-TEST-0003"
        )
        response = self.client.get(ADMIN_LEADS_URL, {"assigned_to": "none"})
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["reference"], "LD-TEST-0001"
        )
        response = self.client.get(
            ADMIN_LEADS_URL, {"assigned_to": str(self.staff_user.id)}
        )
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["reference"], "LD-TEST-0002"
        )

    def test_search_matches_name_reference_and_phone(self):
        for term, expected in [
            ("alice", "LD-TEST-0001"),
            ("LD-TEST-0002", "LD-TEST-0002"),
            ("8801912345003", "LD-TEST-0003"),
        ]:
            response = self.client.get(ADMIN_LEADS_URL, {"search": term})
            self.assertEqual(response.data["count"], 1, term)
            self.assertEqual(
                response.data["results"][0]["reference"], expected
            )

    def test_date_range_filter(self):
        Lead.objects.filter(pk=self.lead_a.pk).update(
            created_at=timezone.now() - timedelta(days=10)
        )
        today = timezone.localtime().date()
        response = self.client.get(
            ADMIN_LEADS_URL,
            {"date_from": (today - timedelta(days=1)).isoformat()},
        )
        self.assertEqual(response.data["count"], 2)
        response = self.client.get(
            ADMIN_LEADS_URL,
            {"date_to": (today - timedelta(days=5)).isoformat()},
        )
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["reference"], "LD-TEST-0001"
        )

    def test_ordering_whitelist(self):
        response = self.client.get(ADMIN_LEADS_URL, {"ordering": "created_at"})
        self.assertEqual(
            response.data["results"][0]["reference"], "LD-TEST-0001"
        )
        # Unknown ordering falls back to -created_at.
        response = self.client.get(ADMIN_LEADS_URL, {"ordering": "name"})
        self.assertEqual(
            response.data["results"][0]["reference"], "LD-TEST-0003"
        )

    def test_page_size_param(self):
        response = self.client.get(ADMIN_LEADS_URL, {"page_size": 2})
        self.assertEqual(len(response.data["results"]), 2)
        self.assertIsNotNone(response.data["next"])


class AdminBoardAndSummaryTests(AdminLeadAPITestCase):
    def setUp(self):
        super().setUp()
        make_lead(
            self.stage_new,
            reference="LD-TEST-0001",
            phone="01712345001",
            service=self.service,
        )
        make_lead(self.stage_new, reference="LD-TEST-0002", phone="01712345002")
        make_lead(self.stage_won, reference="LD-TEST-0003", phone="01712345003")
        make_lead(self.stage_won, reference="LD-TEST-0004", phone="01712345004")
        make_lead(self.stage_lost, reference="LD-TEST-0005", phone="01712345005")

    def test_board_shape_and_counts(self):
        response = self.client.get(ADMIN_BOARD_URL)
        self.assertEqual(response.status_code, 200)
        stages = response.data["stages"]
        self.assertEqual(
            [stage["slug"] for stage in stages],
            ["new", "contacted", "qualified", "booked", "won", "lost"],
        )
        board_new = stages[0]
        self.assertEqual(
            set(board_new.keys()),
            {
                "id",
                "slug",
                "name",
                "color",
                "order",
                "is_terminal",
                "requires_reason",
                "lead_count",
                "leads",
            },
        )
        self.assertEqual(board_new["lead_count"], 2)
        self.assertEqual(len(board_new["leads"]), 2)
        card = board_new["leads"][0]
        self.assertEqual(
            set(card.keys()),
            {"id", "reference", "name", "phone", "service_name", "created_at"},
        )
        # Newest first within a stage.
        self.assertEqual(card["reference"], "LD-TEST-0002")
        self.assertEqual(
            board_new["leads"][1]["service_name"], "General Repairs"
        )
        self.assertEqual(stages[1]["lead_count"], 0)
        self.assertEqual(stages[1]["leads"], [])

    def test_board_excludes_inactive_stages(self):
        PipelineStage.objects.filter(slug="booked").update(is_active=False)
        response = self.client.get(ADMIN_BOARD_URL)
        self.assertNotIn(
            "booked", [stage["slug"] for stage in response.data["stages"]]
        )

    def test_summary_math(self):
        Lead.objects.filter(reference="LD-TEST-0001").update(
            created_at=timezone.now() - timedelta(days=10)
        )
        response = self.client.get(ADMIN_SUMMARY_URL)
        self.assertEqual(response.status_code, 200)
        data = response.data
        self.assertEqual(data["total"], 5)
        self.assertEqual(data["new_today"], 4)
        self.assertEqual(data["new_this_week"], 4)
        self.assertEqual(data["new_this_month"], 5)
        self.assertEqual(data["conversion_rate"], 40.0)
        by_stage = {row["slug"]: row for row in data["by_stage"]}
        self.assertEqual(by_stage["new"]["count"], 2)
        self.assertEqual(by_stage["won"]["count"], 2)
        self.assertEqual(by_stage["contacted"]["count"], 0)
        self.assertEqual(
            set(by_stage["new"].keys()), {"slug", "name", "color", "count"}
        )

    def test_summary_zero_leads(self):
        Lead.objects.all().delete()
        response = self.client.get(ADMIN_SUMMARY_URL)
        self.assertEqual(response.data["total"], 0)
        self.assertEqual(response.data["conversion_rate"], 0.0)


class AdminLeadDetailTests(AdminLeadAPITestCase):
    def setUp(self):
        super().setUp()
        self.lead = make_lead(
            self.stage_new,
            reference="LD-TEST-0001",
            name="Alice Rahman",
            phone="01712-345001",
            service=self.service,
            email="alice@example.net",
            message="Fix it please",
            custom_fields={"device": "Laptop"},
            attribution={"utm_source": "facebook"},
        )
        StageTransition.objects.create(
            lead=self.lead,
            from_stage=None,
            to_stage=self.stage_new,
            changed_by="system",
        )
        self.detail_url = f"/api/admin/leads/{self.lead.id}/"

    def test_detail_shape(self):
        LeadActivity.objects.create(
            lead=self.lead, type="note", body="First note", actor="boss"
        )
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, 200)
        lead = response.data["lead"]
        self.assertEqual(lead["reference"], "LD-TEST-0001")
        self.assertEqual(lead["phone"], "01712-345001")
        self.assertEqual(lead["phone_normalized"], "8801712345001")
        self.assertEqual(
            lead["whatsapp_url"], "https://wa.me/8801712345001"
        )
        self.assertEqual(lead["custom_fields"], {"device": "Laptop"})
        self.assertEqual(lead["attribution"], {"utm_source": "facebook"})
        self.assertIn("requires_reason", lead["stage"])
        self.assertIn("is_terminal", lead["stage"])
        self.assertIn("consent_marketing", lead)
        self.assertIn("lang", lead)
        self.assertIn("updated_at", lead)

        activities = response.data["activities"]
        self.assertEqual(len(activities), 1)
        self.assertEqual(
            set(activities[0].keys()),
            {"id", "type", "body", "actor", "created_at"},
        )
        transitions = response.data["transitions"]
        self.assertEqual(len(transitions), 1)
        self.assertIsNone(transitions[0]["from_stage"])
        self.assertEqual(transitions[0]["to_stage"]["slug"], "new")
        self.assertIn("color", transitions[0]["to_stage"])

    def test_detail_404_for_unknown_lead(self):
        response = self.client.get(
            "/api/admin/leads/00000000-0000-0000-0000-000000000000/"
        )
        self.assertEqual(response.status_code, 404)

    def test_patch_updates_fields_and_renormalizes_phone(self):
        response = self.client.patch(
            self.detail_url,
            {
                "name": "Alice R.",
                "phone": "+8801912345999",
                "email": "",
                "source": "manual",
                "consent_marketing": True,
                "lang": "bn",
                "custom_fields": {"device": "Phone"},
                "assigned_to": str(self.staff_user.id),
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        lead = response.data["lead"]
        self.assertEqual(lead["name"], "Alice R.")
        self.assertEqual(lead["phone_normalized"], "8801912345999")
        self.assertEqual(lead["assigned_to"]["username"], "agent")
        self.assertEqual(lead["custom_fields"], {"device": "Phone"})
        self.assertTrue(lead["consent_marketing"])

    def test_patch_service_and_clear(self):
        response = self.client.patch(
            self.detail_url, {"service": None}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["lead"]["service"])
        response = self.client.patch(
            self.detail_url, {"service": "general-repairs"}, format="json"
        )
        self.assertEqual(
            response.data["lead"]["service"]["slug"], "general-repairs"
        )
        response = self.client.patch(
            self.detail_url, {"service": "nope"}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_patch_invalid_phone_400(self):
        response = self.client.patch(
            self.detail_url, {"phone": "abc"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data["phone"], ["Enter a valid phone number."]
        )

    def test_patch_non_staff_assignee_400(self):
        response = self.client.patch(
            self.detail_url,
            {"assigned_to": str(self.regular_user.id)},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("assigned_to", response.data)

    def test_patch_nested_custom_fields_400(self):
        response = self.client.patch(
            self.detail_url,
            {"custom_fields": {"a": {"b": 1}}},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_patch_cannot_change_stage(self):
        response = self.client.patch(
            self.detail_url, {"stage": "won"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["lead"]["stage"]["slug"], "new")


class AdminStageMoveTests(AdminLeadAPITestCase):
    def setUp(self):
        super().setUp()
        self.lead = make_lead(
            self.stage_new, reference="LD-TEST-0001", phone="01712345001"
        )
        self.stage_url = f"/api/admin/leads/{self.lead.id}/stage/"

    def test_stage_move_success_creates_transition(self):
        response = self.client.post(
            self.stage_url, {"stage": "contacted"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["lead"]["stage"]["slug"], "contacted"
        )
        transition = response.data["transition"]
        self.assertEqual(transition["from_stage"]["slug"], "new")
        self.assertEqual(transition["to_stage"]["slug"], "contacted")
        self.assertEqual(transition["changed_by"], "boss")
        self.lead.refresh_from_db()
        self.assertEqual(self.lead.stage.slug, "contacted")
        self.assertEqual(self.lead.transitions.count(), 1)

    def test_requires_reason_enforced(self):
        response = self.client.post(
            self.stage_url, {"stage": "lost"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("reason", response.data)
        response = self.client.post(
            self.stage_url,
            {"stage": "lost", "reason": "Budget too low"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["transition"]["reason"], "Budget too low"
        )

    def test_unknown_stage_400(self):
        response = self.client.post(
            self.stage_url, {"stage": "nope"}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_inactive_stage_not_selectable(self):
        self.stage_contacted.is_active = False
        self.stage_contacted.save()
        response = self.client.post(
            self.stage_url, {"stage": "contacted"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("stage", response.data)

    def test_same_stage_move_400(self):
        response = self.client.post(
            self.stage_url, {"stage": "new"}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_expected_stage_mismatch_409(self):
        response = self.client.post(
            self.stage_url,
            {"stage": "qualified", "expected_stage": "contacted"},
            format="json",
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["detail"], "stale")
        self.assertEqual(response.data["current_stage"]["slug"], "new")
        self.assertIn("color", response.data["current_stage"])

    def test_expected_stage_match_succeeds(self):
        response = self.client.post(
            self.stage_url,
            {"stage": "qualified", "expected_stage": "new"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)


class AdminActivitiesTests(AdminLeadAPITestCase):
    def setUp(self):
        super().setUp()
        self.lead = make_lead(
            self.stage_new, reference="LD-TEST-0001", phone="01712345001"
        )
        self.activities_url = f"/api/admin/leads/{self.lead.id}/activities/"

    def test_create_note(self):
        response = self.client.post(
            self.activities_url,
            {"type": "note", "body": "Spoke with the customer."},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["type"], "note")
        self.assertEqual(response.data["actor"], "boss")
        self.assertEqual(self.lead.activities.count(), 1)

    def test_note_requires_body(self):
        response = self.client.post(
            self.activities_url, {"type": "note"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("body", response.data)

    def test_whatsapp_click_default_body(self):
        response = self.client.post(
            self.activities_url, {"type": "whatsapp_click"}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["body"], "WhatsApp opened")

    def test_invalid_type_400(self):
        response = self.client.post(
            self.activities_url,
            {"type": "email_sent", "body": "nope"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)


class AdminPipelineStageTests(AdminLeadAPITestCase):
    def test_list_includes_inactive_ordered(self):
        self.stage_contacted.is_active = False
        self.stage_contacted.save()
        response = self.client.get(ADMIN_STAGES_URL)
        self.assertEqual(response.status_code, 200)
        slugs = [stage["slug"] for stage in response.data["stages"]]
        self.assertIn("contacted", slugs)
        self.assertEqual(len(slugs), 6)
        first = response.data["stages"][0]
        for key in (
            "id",
            "slug",
            "name",
            "color",
            "order",
            "is_terminal",
            "counts_as_converted",
            "requires_reason",
            "is_active",
            "lead_count",
        ):
            self.assertIn(key, first)

    def test_create_stage_with_auto_slug_and_default_color(self):
        response = self.client.post(
            ADMIN_STAGES_URL, {"name": "Follow Up"}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["slug"], "follow-up")
        self.assertEqual(response.data["color"], "#6B7280")
        self.assertFalse(response.data["is_terminal"])
        # Appended after the existing stages.
        self.assertGreater(response.data["order"], 5)

    def test_create_stage_duplicate_slug_400(self):
        response = self.client.post(
            ADMIN_STAGES_URL, {"name": "New Again", "slug": "new"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("slug", response.data)

    def test_create_stage_invalid_color_400(self):
        response = self.client.post(
            ADMIN_STAGES_URL,
            {"name": "Bad Color", "color": "red"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("color", response.data)

    def test_create_stage_short_hex_color_ok(self):
        response = self.client.post(
            ADMIN_STAGES_URL,
            {"name": "Short Hex", "color": "#ABC", "requires_reason": True},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["color"], "#ABC")
        self.assertTrue(response.data["requires_reason"])

    def test_create_stage_requires_name(self):
        response = self.client.post(ADMIN_STAGES_URL, {}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("name", response.data)

    def test_patch_stage(self):
        url = f"{ADMIN_STAGES_URL}{self.stage_contacted.id}/"
        response = self.client.patch(
            url,
            {"name": "Reached", "color": "#123456", "is_active": False},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.stage_contacted.refresh_from_db()
        self.assertEqual(self.stage_contacted.name, "Reached")
        self.assertEqual(self.stage_contacted.color, "#123456")
        self.assertFalse(self.stage_contacted.is_active)

    def test_patch_stage_invalid_color_400(self):
        url = f"{ADMIN_STAGES_URL}{self.stage_contacted.id}/"
        response = self.client.patch(url, {"color": "#12345G"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_delete_unreferenced_stage_hard_deletes(self):
        url = f"{ADMIN_STAGES_URL}{self.stage_contacted.id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 204)
        self.assertFalse(
            PipelineStage.objects.filter(slug="contacted").exists()
        )

    def test_delete_referenced_stage_archives(self):
        make_lead(
            self.stage_contacted, reference="LD-TEST-0001", phone="01712345001"
        )
        url = f"{ADMIN_STAGES_URL}{self.stage_contacted.id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"detail": "archived"})
        self.stage_contacted.refresh_from_db()
        self.assertFalse(self.stage_contacted.is_active)

    def test_reorder_stages(self):
        ids = list(
            PipelineStage.objects.values_list("id", flat=True)
        )
        reversed_ids = list(reversed(ids))
        response = self.client.post(
            ADMIN_STAGES_REORDER_URL, {"order": reversed_ids}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        slugs = [stage["slug"] for stage in response.data["stages"]]
        self.assertEqual(
            slugs, ["lost", "won", "booked", "qualified", "contacted", "new"]
        )

    def test_reorder_unknown_id_400(self):
        response = self.client.post(
            ADMIN_STAGES_REORDER_URL, {"order": [999999]}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_reorder_requires_list(self):
        response = self.client.post(
            ADMIN_STAGES_REORDER_URL, {"order": "abc"}, format="json"
        )
        self.assertEqual(response.status_code, 400)


class AdminPermissionTests(AdminLeadAPITestCase):
    def setUp(self):
        super().setUp()
        self.lead = make_lead(
            self.stage_new, reference="LD-TEST-0001", phone="01712345001"
        )
        self.endpoints = [
            ("get", ADMIN_LEADS_URL),
            ("get", ADMIN_BOARD_URL),
            ("get", ADMIN_SUMMARY_URL),
            ("get", f"/api/admin/leads/{self.lead.id}/"),
            ("patch", f"/api/admin/leads/{self.lead.id}/"),
            ("post", f"/api/admin/leads/{self.lead.id}/stage/"),
            ("post", f"/api/admin/leads/{self.lead.id}/activities/"),
            ("get", ADMIN_STAGES_URL),
            ("post", ADMIN_STAGES_URL),
            ("patch", f"{ADMIN_STAGES_URL}{self.stage_new.id}/"),
            ("delete", f"{ADMIN_STAGES_URL}{self.stage_new.id}/"),
            ("post", ADMIN_STAGES_REORDER_URL),
        ]

    def test_anonymous_gets_401(self):
        self.client.force_authenticate(user=None)
        for method, url in self.endpoints:
            response = getattr(self.client, method)(url, {}, format="json")
            self.assertEqual(response.status_code, 401, f"{method} {url}")

    def test_non_staff_gets_403(self):
        self.client.force_authenticate(user=self.regular_user)
        for method, url in self.endpoints:
            response = getattr(self.client, method)(url, {}, format="json")
            self.assertEqual(response.status_code, 403, f"{method} {url}")


class SeedDemoTests(TestCase):
    def counts(self):
        return {
            "services": Service.objects.count(),
            "stages": PipelineStage.objects.count(),
            "leads": Lead.objects.count(),
            "transitions": StageTransition.objects.count(),
            "activities": LeadActivity.objects.count(),
        }

    def test_seed_demo_twice_is_idempotent(self):
        call_command("seed_demo", stdout=StringIO())
        first = self.counts()
        self.assertEqual(first["stages"], 6)
        self.assertEqual(first["leads"], 8)
        self.assertGreater(first["transitions"], 8)
        self.assertGreater(first["activities"], 0)
        self.assertEqual(len(mail.outbox), 0)

        call_command("seed_demo", stdout=StringIO())
        self.assertEqual(self.counts(), first)

        won_lead = Lead.objects.get(reference="LD-DEMO-0005")
        self.assertEqual(won_lead.stage.slug, "won")
        lost_lead = Lead.objects.get(reference="LD-DEMO-0006")
        lost_transition = lost_lead.transitions.get(to_stage__slug="lost")
        self.assertTrue(lost_transition.reason)
        self.assertEqual(
            Lead.objects.get(reference="LD-DEMO-0001").attribution.get(
                "utm_source"
            ),
            "facebook",
        )
        self.assertEqual(
            Lead.objects.get(reference="LD-DEMO-0002").phone_normalized,
            "8801812345002",
        )
