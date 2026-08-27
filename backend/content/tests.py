from unittest import mock

from django.core import mail
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase

from rest_framework.test import APITestCase

from .localize import pick
from .models import FAQItem, Service, SiteConfig, TeamMember, Testimonial

CONFIG_URL = "/api/content/config/"
SERVICES_URL = "/api/content/services/"
TESTIMONIALS_URL = "/api/content/testimonials/"
FAQ_URL = "/api/content/faq/"
TEAM_URL = "/api/content/team/"
CONTACT_URL = "/api/content/contact/"

CACHE_CONTROL_VALUE = "public, max-age=300"


def valid_contact_payload(**overrides):
    payload = {
        "name": "Test Customer",
        "phone": "+880 1700-000000",
        "email": "customer@example.com",
        "message": "I need help with a repair.",
        "website": "",
    }
    payload.update(overrides)
    return payload



class SiteConfigSingletonTests(TestCase):
    def test_get_solo_creates_pk_1(self):
        config = SiteConfig.get_solo()
        self.assertEqual(config.pk, 1)
        self.assertEqual(SiteConfig.objects.count(), 1)

    def test_saving_new_instances_never_duplicates(self):
        SiteConfig(site_name="First").save()
        SiteConfig(site_name="Second").save()
        second = SiteConfig(site_name="Third")
        second.save()
        self.assertEqual(second.pk, 1)
        self.assertEqual(SiteConfig.objects.count(), 1)
        self.assertEqual(SiteConfig.get_solo().site_name, "Third")

    def test_get_solo_returns_existing_row(self):
        SiteConfig(site_name="Existing").save()
        self.assertEqual(SiteConfig.get_solo().site_name, "Existing")
        self.assertEqual(SiteConfig.objects.count(), 1)


class LocalizeTests(TestCase):
    def test_pick_prefers_bn_when_present(self):
        service = Service(name_en="Repairs", name_bn="মেরামত")
        self.assertEqual(pick(service, "name", "bn"), "মেরামত")

    def test_pick_falls_back_to_en_when_bn_empty(self):
        service = Service(name_en="Repairs", name_bn="")
        self.assertEqual(pick(service, "name", "bn"), "Repairs")

    def test_pick_defaults_to_en(self):
        service = Service(name_en="Repairs", name_bn="মেরামত")
        self.assertEqual(pick(service, "name", "en"), "Repairs")
        self.assertEqual(pick(service, "name", "fr"), "Repairs")


class ConfigEndpointTests(APITestCase):
    def setUp(self):
        config = SiteConfig.get_solo()
        config.site_name = "Acme Services"
        config.tagline_en = "Trusted local service."
        config.tagline_bn = "বিশ্বস্ত স্থানীয় সেবা।"
        config.phone_primary = "01700-000000"
        config.email = "owner@example.com"
        config.whatsapp_number = "8801700000000"
        config.address_en = "12 Demo Street"
        config.address_bn = "১২ ডেমো স্ট্রিট"
        config.hours_en = "Open daily"
        config.hours_bn = ""  # deliberately empty for fallback test
        config.google_maps_embed_url = "https://www.google.com/maps?q=Dhaka&output=embed"
        config.facebook_url = "https://facebook.com/acme"
        config.meta_title_en = "Acme Services"
        config.save()

    def test_shape_matches_contract(self):
        response = self.client.get(CONFIG_URL)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(
            set(data.keys()),
            {
                "site_name",
                "tagline",
                "phone_primary",
                "phone_secondary",
                "email",
                "whatsapp_number",
                "address",
                "hours",
                "maps_embed_url",
                "social",
                "meta",
            },
        )
        self.assertEqual(
            set(data["social"].keys()),
            {"facebook", "instagram", "youtube", "linkedin"},
        )
        self.assertEqual(set(data["meta"].keys()), {"title", "description"})
        self.assertEqual(data["site_name"], "Acme Services")
        self.assertEqual(data["tagline"], "Trusted local service.")
        self.assertEqual(
            data["maps_embed_url"],
            "https://www.google.com/maps?q=Dhaka&output=embed",
        )
        self.assertEqual(data["social"]["facebook"], "https://facebook.com/acme")
        self.assertEqual(data["social"]["instagram"], "")
        self.assertEqual(data["meta"]["title"], "Acme Services")
        self.assertEqual(data["meta"]["description"], "")
        self.assertEqual(data["phone_secondary"], "")

    def test_lang_bn_returns_bn_values(self):
        response = self.client.get(CONFIG_URL, {"lang": "bn"})
        data = response.json()
        self.assertEqual(data["tagline"], "বিশ্বস্ত স্থানীয় সেবা।")
        self.assertEqual(data["address"], "১২ ডেমো স্ট্রিট")

    def test_lang_bn_falls_back_to_en_when_bn_empty(self):
        response = self.client.get(CONFIG_URL, {"lang": "bn"})
        data = response.json()
        self.assertEqual(data["hours"], "Open daily")

    def test_cache_control_header(self):
        response = self.client.get(CONFIG_URL)
        self.assertEqual(response["Cache-Control"], CACHE_CONTROL_VALUE)


class ServiceEndpointTests(APITestCase):
    def setUp(self):
        self.second = Service.objects.create(
            name_en="Beta Service",
            name_bn="",
            slug="beta-service",
            icon="truck",
            summary_en="Beta summary",
            summary_bn="",
            body_en="Beta body",
            display_order=2,
        )
        self.first = Service.objects.create(
            name_en="Alpha Service",
            name_bn="আলফা সার্ভিস",
            slug="alpha-service",
            icon="wrench",
            summary_en="Alpha summary",
            summary_bn="আলফা সারসংক্ষেপ",
            body_en="Alpha body",
            body_bn="আলফা বিস্তারিত",
            display_order=1,
        )
        Service.objects.create(
            name_en="Hidden Service",
            slug="hidden-service",
            summary_en="Hidden summary",
            is_active=False,
        )

    def test_list_active_only_and_ordered(self):
        response = self.client.get(SERVICES_URL)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertEqual([item["slug"] for item in data], ["alpha-service", "beta-service"])
        item = data[0]
        self.assertEqual(
            set(item.keys()), {"id", "slug", "icon", "name", "summary", "image"}
        )
        self.assertEqual(item["name"], "Alpha Service")
        self.assertEqual(item["icon"], "wrench")
        self.assertIsNone(item["image"])
        self.assertNotIn("body", item)

    def test_list_bn_with_per_field_fallback(self):
        response = self.client.get(SERVICES_URL, {"lang": "bn"})
        data = response.json()
        self.assertEqual(data[0]["name"], "আলফা সার্ভিস")
        self.assertEqual(data[0]["summary"], "আলফা সারসংক্ষেপ")
        # Beta has no bn values → falls back to en.
        self.assertEqual(data[1]["name"], "Beta Service")
        self.assertEqual(data[1]["summary"], "Beta summary")

    def test_detail_includes_body(self):
        response = self.client.get(f"{SERVICES_URL}alpha-service/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(
            set(data.keys()),
            {"id", "slug", "icon", "name", "summary", "image", "body"},
        )
        self.assertEqual(data["body"], "Alpha body")

    def test_detail_bn(self):
        response = self.client.get(f"{SERVICES_URL}alpha-service/", {"lang": "bn"})
        self.assertEqual(response.json()["body"], "আলফা বিস্তারিত")

    def test_detail_unknown_slug_404(self):
        response = self.client.get(f"{SERVICES_URL}no-such-service/")
        self.assertEqual(response.status_code, 404)

    def test_detail_inactive_404(self):
        response = self.client.get(f"{SERVICES_URL}hidden-service/")
        self.assertEqual(response.status_code, 404)

    def test_cache_control_header(self):
        response = self.client.get(SERVICES_URL)
        self.assertEqual(response["Cache-Control"], CACHE_CONTROL_VALUE)


class TestimonialEndpointTests(APITestCase):
    def setUp(self):
        Testimonial.objects.create(
            customer_name="Plain Person",
            rating=4,
            body_en="Good work",
            is_featured=False,
            display_order=1,
        )
        Testimonial.objects.create(
            customer_name="Star Person",
            rating=5,
            body_en="Great work",
            body_bn="দারুণ কাজ",
            is_featured=True,
            display_order=2,
        )

    def test_shape_and_featured_first(self):
        response = self.client.get(TESTIMONIALS_URL)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]["customer_name"], "Star Person")
        self.assertEqual(
            set(data[0].keys()),
            {"id", "customer_name", "rating", "body", "source", "is_featured"},
        )
        self.assertEqual(data[0]["source"], "google")
        self.assertTrue(data[0]["is_featured"])

    def test_bn_with_fallback(self):
        response = self.client.get(TESTIMONIALS_URL, {"lang": "bn"})
        data = response.json()
        self.assertEqual(data[0]["body"], "দারুণ কাজ")
        self.assertEqual(data[1]["body"], "Good work")


class FAQEndpointTests(APITestCase):
    def setUp(self):
        FAQItem.objects.create(
            question_en="General question?",
            answer_en="General answer.",
            answer_bn="সাধারণ উত্তর।",
            category="general",
            display_order=1,
        )
        FAQItem.objects.create(
            question_en="Pricing question?",
            answer_en="Pricing answer.",
            category="pricing",
            display_order=2,
        )
        FAQItem.objects.create(
            question_en="Inactive question?",
            answer_en="Hidden.",
            is_active=False,
        )

    def test_list_active_only(self):
        response = self.client.get(FAQ_URL)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 2)
        self.assertEqual(
            set(data[0].keys()), {"id", "category", "question", "answer"}
        )
        self.assertEqual(data[0]["question"], "General question?")

    def test_category_filter(self):
        response = self.client.get(FAQ_URL, {"category": "pricing"})
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["category"], "pricing")

    def test_bn_fallback(self):
        response = self.client.get(FAQ_URL, {"lang": "bn"})
        data = response.json()
        self.assertEqual(data[0]["answer"], "সাধারণ উত্তর।")
        self.assertEqual(data[1]["answer"], "Pricing answer.")


class TeamEndpointTests(APITestCase):
    def setUp(self):
        TeamMember.objects.create(
            name="Alice",
            role_en="Manager",
            role_bn="ম্যানেজার",
            bio_en="Bio of Alice",
            display_order=1,
        )
        TeamMember.objects.create(
            name="Bob",
            role_en="Technician",
            display_order=2,
        )
        TeamMember.objects.create(
            name="Ghost",
            role_en="Former",
            is_active=False,
        )

    def test_list_active_only_shape(self):
        response = self.client.get(TEAM_URL)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 2)
        self.assertEqual(
            set(data[0].keys()), {"id", "name", "role", "bio", "photo"}
        )
        self.assertEqual(data[0]["name"], "Alice")
        self.assertIsNone(data[0]["photo"])

    def test_bn_role(self):
        response = self.client.get(TEAM_URL, {"lang": "bn"})
        data = response.json()
        self.assertEqual(data[0]["role"], "ম্যানেজার")
        self.assertEqual(data[1]["role"], "Technician")


class ContactEndpointTests(APITestCase):
    def setUp(self):
        cache.clear()  # reset throttle counters between tests
        config = SiteConfig.get_solo()
        config.site_name = "Acme Services"
        config.email = "owner@example.com"
        config.save()

    def tearDown(self):
        cache.clear()

    def test_success_sends_email(self):
        response = self.client.post(
            CONTACT_URL, valid_contact_payload(), format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json(), {"detail": "ok"})
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertEqual(message.to, ["owner@example.com"])
        self.assertEqual(
            message.subject, "[Acme Services] New contact from Test Customer"
        )
        self.assertIn("Test Customer", message.body)
        self.assertIn("+880 1700-000000", message.body)
        self.assertIn("I need help with a repair.", message.body)
        self.assertEqual(message.reply_to, ["customer@example.com"])

    def test_no_reply_to_without_email(self):
        response = self.client.post(
            CONTACT_URL, valid_contact_payload(email=""), format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(mail.outbox), 1)
        self.assertFalse(mail.outbox[0].reply_to)

    def test_no_cache_control_on_post(self):
        response = self.client.post(
            CONTACT_URL, valid_contact_payload(), format="json"
        )
        self.assertNotEqual(
            response.headers.get("Cache-Control"), CACHE_CONTROL_VALUE
        )

    def test_honeypot_returns_201_without_email(self):
        response = self.client.post(
            CONTACT_URL,
            valid_contact_payload(website="https://spam.example.com"),
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json(), {"detail": "ok"})
        self.assertEqual(len(mail.outbox), 0)

    def test_missing_required_fields(self):
        response = self.client.post(CONTACT_URL, {}, format="json")
        self.assertEqual(response.status_code, 400)
        errors = response.json()
        self.assertIn("name", errors)
        self.assertIn("phone", errors)
        self.assertIn("message", errors)
        self.assertNotIn("website", errors)

    def test_bad_phone_chars(self):
        response = self.client.post(
            CONTACT_URL, valid_contact_payload(phone="abc123456"), format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("phone", response.json())

    def test_phone_too_short_after_stripping(self):
        response = self.client.post(
            CONTACT_URL, valid_contact_payload(phone="1-2-3"), format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("phone", response.json())

    def test_bad_email(self):
        response = self.client.post(
            CONTACT_URL, valid_contact_payload(email="not-an-email"), format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.json())

    def test_name_too_long(self):
        response = self.client.post(
            CONTACT_URL, valid_contact_payload(name="x" * 101), format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("name", response.json())

    def test_empty_config_email_still_201(self):
        config = SiteConfig.get_solo()
        config.email = ""
        config.save()
        response = self.client.post(
            CONTACT_URL, valid_contact_payload(), format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(mail.outbox), 0)

    def test_email_failure_still_201(self):
        with mock.patch(
            "content.views.EmailMessage.send", side_effect=RuntimeError("smtp down")
        ):
            response = self.client.post(
                CONTACT_URL, valid_contact_payload(), format="json"
            )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json(), {"detail": "ok"})

    def test_throttle_sixth_request_429(self):
        from unittest import mock
        from rest_framework.throttling import SimpleRateThrottle

        with mock.patch.dict(
            SimpleRateThrottle.THROTTLE_RATES, {"contact": "5/hour"}
        ):
            self._run_throttle_scenario()

    def _run_throttle_scenario(self):
        for _ in range(5):
            response = self.client.post(
                CONTACT_URL, valid_contact_payload(), format="json"
            )
            self.assertEqual(response.status_code, 201)
        response = self.client.post(
            CONTACT_URL, valid_contact_payload(), format="json"
        )
        self.assertEqual(response.status_code, 429)


class SeedCommandTests(TestCase):
    def _counts(self):
        return {
            "config": SiteConfig.objects.count(),
            "services": Service.objects.count(),
            "testimonials": Testimonial.objects.count(),
            "faq": FAQItem.objects.count(),
            "team": TeamMember.objects.count(),
        }

    def test_seed_demo_idempotent(self):
        call_command("seed_demo")
        first_counts = self._counts()
        self.assertEqual(
            first_counts,
            {
                "config": 1,
                "services": 6,
                "testimonials": 5,
                "faq": 6,
                "team": 3,
            },
        )
        call_command("seed_demo")
        self.assertEqual(self._counts(), first_counts)

    def test_seed_demo_content_values(self):
        call_command("seed_demo")
        config = SiteConfig.get_solo()
        self.assertEqual(config.site_name, "Acme Services")
        self.assertEqual(config.email, "owner@example.com")
        icons = set(Service.objects.values_list("icon", flat=True))
        self.assertEqual(
            icons, {"wrench", "truck", "shield-check", "zap", "package", "headset"}
        )
        self.assertEqual(
            Testimonial.objects.filter(is_featured=True).count(), 3
        )
        self.assertEqual(
            set(FAQItem.objects.values_list("category", flat=True)),
            {"general", "pricing", "warranty"},
        )
        self.assertTrue(
            Testimonial.objects.exclude(body_bn="").count() >= 2
        )

    def test_seed_e2e_includes_demo_content(self):
        call_command("seed_e2e")
        self.assertEqual(Service.objects.count(), 6)
        self.assertEqual(SiteConfig.objects.count(), 1)
        # Running again stays idempotent.
        call_command("seed_e2e")
        self.assertEqual(Service.objects.count(), 6)
