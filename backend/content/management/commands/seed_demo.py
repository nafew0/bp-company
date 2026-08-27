"""Seed demo CMS content for the Acme Services template site.

Idempotent: uses update_or_create on natural keys, so running it repeatedly
never duplicates rows.
"""
from django.core.management import call_command
from django.core.management.base import BaseCommand

from content.models import FAQItem, Service, SiteConfig, TeamMember, Testimonial

SERVICES = [
    {
        "slug": "general-repairs",
        "name_en": "General Repairs",
        "name_bn": "সাধারণ মেরামত",
        "icon": "wrench",
        "summary_en": "Fast, reliable repairs for everyday problems, big or small.",
        "summary_bn": "ছোট-বড় সব সমস্যার দ্রুত ও নির্ভরযোগ্য মেরামত।",
        "body_en": (
            "Our technicians handle everyday repair jobs of every size. From a "
            "quick fix to a full overhaul, we diagnose the problem, quote a fair "
            "price up front, and get the work done right the first time.\n\n"
            "Every repair is backed by our workmanship guarantee, so you can "
            "book with confidence."
        ),
        "body_bn": (
            "আমাদের টেকনিশিয়ানরা সব ধরনের মেরামতের কাজ করেন। আগে থেকে ন্যায্য "
            "দাম জানিয়ে আমরা প্রথমবারেই কাজটি সঠিকভাবে সম্পন্ন করি।"
        ),
        "display_order": 1,
    },
    {
        "slug": "pickup-delivery",
        "name_en": "Pickup & Delivery",
        "name_bn": "পিকআপ ও ডেলিভারি",
        "icon": "truck",
        "summary_en": "We collect from your door and return it fixed — no queues.",
        "summary_bn": "আপনার দরজা থেকে সংগ্রহ করে মেরামত শেষে ফেরত দিই — লাইনে দাঁড়াতে হয় না।",
        "body_en": (
            "Skip the trip. Schedule a pickup and our rider will collect your "
            "item from your home or office, keep you updated while we work, and "
            "deliver it back as soon as the job is done.\n\n"
            "Pickup and delivery are available across the city, seven days a "
            "week."
        ),
        "body_bn": (
            "সময় বাঁচান। পিকআপ বুক করলে আমাদের রাইডার আপনার বাসা বা অফিস থেকে "
            "জিনিসটি নিয়ে আসবে এবং কাজ শেষে ফেরত পৌঁছে দেবে।"
        ),
        "display_order": 2,
    },
    {
        "slug": "warranty-service",
        "name_en": "Warranty Service",
        "name_bn": "ওয়ারেন্টি সার্ভিস",
        "icon": "shield-check",
        "summary_en": "Every job covered by a written service warranty.",
        "summary_bn": "প্রতিটি কাজের সাথে লিখিত সার্ভিস ওয়ারেন্টি।",
        "body_en": (
            "All of our work comes with a written warranty. If the same issue "
            "comes back within the coverage period, we fix it again free of "
            "charge — no arguments, no hidden conditions.\n\n"
            "Bring your receipt or simply give us your phone number and we will "
            "find your job in our records."
        ),
        "body_bn": (
            "আমাদের প্রতিটি কাজে লিখিত ওয়ারেন্টি থাকে। ওয়ারেন্টির মেয়াদের মধ্যে একই "
            "সমস্যা ফিরে এলে আমরা বিনামূল্যে আবার ঠিক করে দিই।"
        ),
        "display_order": 3,
    },
    {
        "slug": "express-service",
        "name_en": "Express Service",
        "name_bn": "এক্সপ্রেস সার্ভিস",
        "icon": "zap",
        "summary_en": "Same-day turnaround for urgent jobs, done while you wait.",
        "summary_bn": "জরুরি কাজের জন্য একই দিনে সার্ভিস, অপেক্ষা করতে করতেই সম্পন্ন।",
        "body_en": (
            "When you cannot wait, choose express. Priority handling puts your "
            "job at the front of the queue and most express jobs are completed "
            "the same day — many while you wait in our comfortable lounge.\n\n"
            "Express slots are limited each day, so call ahead to reserve one."
        ),
        "body_bn": (
            "অপেক্ষা করার সময় না থাকলে এক্সপ্রেস সার্ভিস নিন। বেশিরভাগ এক্সপ্রেস কাজ "
            "একই দিনে শেষ হয়।"
        ),
        "display_order": 4,
    },
    {
        "slug": "parts-replacement",
        "name_en": "Parts Replacement",
        "name_bn": "যন্ত্রাংশ প্রতিস্থাপন",
        "icon": "package",
        "summary_en": "Genuine parts fitted by trained hands, guaranteed to last.",
        "summary_bn": "প্রশিক্ষিত হাতে লাগানো আসল যন্ত্রাংশ, দীর্ঘস্থায়ী হওয়ার নিশ্চয়তা।",
        "body_en": (
            "We stock genuine and top-grade compatible parts for the most "
            "common makes and models. Every replacement part is tested before "
            "and after fitting, and old parts are always returned to you on "
            "request.\n\n"
            "If a part is not in stock we can usually source it within two to "
            "three working days."
        ),
        "body_bn": (
            "আমরা আসল ও উন্নত মানের যন্ত্রাংশ ব্যবহার করি। প্রতিটি যন্ত্রাংশ লাগানোর "
            "আগে ও পরে পরীক্ষা করা হয়।"
        ),
        "display_order": 5,
    },
    {
        "slug": "expert-consultation",
        "name_en": "Expert Consultation",
        "name_bn": "বিশেষজ্ঞ পরামর্শ",
        "icon": "headset",
        "summary_en": "Free advice from experienced technicians before you spend.",
        "summary_bn": "খরচ করার আগে অভিজ্ঞ টেকনিশিয়ানদের কাছ থেকে বিনামূল্যে পরামর্শ।",
        "body_en": (
            "Not sure whether to repair or replace? Talk to us first. Our "
            "senior technicians will inspect your item, explain the options in "
            "plain language, and give you an honest recommendation with a "
            "written estimate.\n\n"
            "Consultations are free — in person, over the phone, or on "
            "WhatsApp."
        ),
        "body_bn": (
            "মেরামত করবেন নাকি নতুন কিনবেন — সিদ্ধান্ত নিতে আমাদের সাথে কথা বলুন। "
            "পরামর্শ সম্পূর্ণ বিনামূল্যে।"
        ),
        "display_order": 6,
    },
]

TESTIMONIALS = [
    {
        "customer_name": "Rahim Uddin",
        "rating": 5,
        "body_en": (
            "Excellent service. They picked up my item in the morning and "
            "delivered it back fixed the same evening. Highly recommended."
        ),
        "body_bn": (
            "চমৎকার সার্ভিস। সকালে জিনিস নিয়ে গিয়ে সন্ধ্যার মধ্যেই মেরামত করে "
            "ফেরত দিয়েছে। অবশ্যই সুপারিশ করব।"
        ),
        "is_featured": True,
        "display_order": 1,
    },
    {
        "customer_name": "Fatema Khatun",
        "rating": 5,
        "body_en": (
            "Honest pricing and very polite staff. They explained everything "
            "before starting the work and finished on time."
        ),
        "body_bn": (
            "ন্যায্য দাম এবং খুবই ভদ্র কর্মী। কাজ শুরুর আগে সবকিছু বুঝিয়ে বলেছে "
            "এবং সময়মতো শেষ করেছে।"
        ),
        "is_featured": True,
        "display_order": 2,
    },
    {
        "customer_name": "Tanvir Ahmed",
        "rating": 4,
        "body_en": (
            "Good experience overall. The express service saved my day when I "
            "needed an urgent fix before travelling."
        ),
        "body_bn": "",
        "is_featured": True,
        "display_order": 3,
    },
    {
        "customer_name": "Sadia Islam",
        "rating": 5,
        "body_en": (
            "The warranty is real — a minor issue came back and they fixed it "
            "again for free without any hassle."
        ),
        "body_bn": "",
        "is_featured": False,
        "display_order": 4,
    },
    {
        "customer_name": "Mohammad Karim",
        "rating": 4,
        "body_en": (
            "Genuine parts and careful work. Slightly busy on weekends but "
            "worth the wait."
        ),
        "body_bn": "",
        "is_featured": False,
        "display_order": 5,
    },
]

FAQS = [
    {
        "question_en": "What areas do you serve?",
        "question_bn": "আপনারা কোন কোন এলাকায় সেবা দেন?",
        "answer_en": (
            "We serve the whole city from our Demo Street workshop, and our "
            "pickup and delivery riders cover all major neighbourhoods seven "
            "days a week."
        ),
        "answer_bn": (
            "আমরা পুরো শহর জুড়ে সেবা দিই। আমাদের পিকআপ ও ডেলিভারি রাইডাররা সপ্তাহের "
            "সাত দিনই প্রধান এলাকাগুলোতে যায়।"
        ),
        "category": "general",
        "display_order": 1,
    },
    {
        "question_en": "Do I need an appointment?",
        "question_bn": "আমার কি অ্যাপয়েন্টমেন্ট লাগবে?",
        "answer_en": (
            "Walk-ins are welcome during opening hours, but booking ahead by "
            "phone or WhatsApp guarantees a slot and cuts your waiting time."
        ),
        "answer_bn": (
            "খোলা থাকার সময়ে সরাসরি আসতে পারেন, তবে ফোন বা হোয়াটসঅ্যাপে আগে বুক "
            "করলে অপেক্ষার সময় কমে যায়।"
        ),
        "category": "general",
        "display_order": 2,
    },
    {
        "question_en": "How much does a typical repair cost?",
        "question_bn": "সাধারণ একটি মেরামতে কত খরচ হয়?",
        "answer_en": (
            "Costs depend on the job, but we always give a written estimate "
            "before starting. Diagnosis and consultation are completely free."
        ),
        "answer_bn": (
            "খরচ কাজের ওপর নির্ভর করে, তবে কাজ শুরুর আগে আমরা সবসময় লিখিত "
            "প্রাক্কলন দিই। পরীক্ষা ও পরামর্শ সম্পূর্ণ বিনামূল্যে।"
        ),
        "category": "pricing",
        "display_order": 3,
    },
    {
        "question_en": "Which payment methods do you accept?",
        "question_bn": "আপনারা কোন কোন পেমেন্ট পদ্ধতি গ্রহণ করেন?",
        "answer_en": (
            "We accept cash, all major cards, and mobile payments including "
            "bKash and Nagad. Corporate clients can request monthly invoicing."
        ),
        "answer_bn": (
            "আমরা নগদ টাকা, সব ধরনের কার্ড এবং বিকাশ ও নগদসহ মোবাইল পেমেন্ট গ্রহণ "
            "করি।"
        ),
        "category": "pricing",
        "display_order": 4,
    },
    {
        "question_en": "How long is the service warranty?",
        "question_bn": "সার্ভিস ওয়ারেন্টি কত দিনের?",
        "answer_en": (
            "Most repairs carry a 90-day written warranty on both parts and "
            "labour. The exact period is printed on your receipt."
        ),
        "answer_bn": (
            "বেশিরভাগ মেরামতে যন্ত্রাংশ ও কাজ উভয়ের ওপর ৯০ দিনের লিখিত ওয়ারেন্টি "
            "থাকে। নির্দিষ্ট মেয়াদ রসিদে লেখা থাকে।"
        ),
        "category": "warranty",
        "display_order": 5,
    },
    {
        "question_en": "What does the warranty not cover?",
        "question_bn": "ওয়ারেন্টিতে কী কী অন্তর্ভুক্ত নয়?",
        "answer_en": (
            "The warranty covers the repaired fault only. Physical damage, "
            "liquid damage, and unrelated new faults are not covered."
        ),
        "answer_bn": (
            "ওয়ারেন্টি শুধু মেরামত করা ত্রুটির জন্য প্রযোজ্য। ভাঙা, পানিতে ক্ষতি বা "
            "নতুন অন্য সমস্যা এর আওতায় পড়ে না।"
        ),
        "category": "warranty",
        "display_order": 6,
    },
]

TEAM = [
    {
        "name": "Ariful Haque",
        "role_en": "Founder & Lead Technician",
        "role_bn": "প্রতিষ্ঠাতা ও প্রধান টেকনিশিয়ান",
        "bio_en": (
            "Arif founded Acme Services after fifteen years in the trade and "
            "still inspects every complex job himself."
        ),
        "bio_bn": (
            "পনের বছরের অভিজ্ঞতা নিয়ে আরিফ অ্যাকমি সার্ভিসেস প্রতিষ্ঠা করেন এবং এখনও "
            "প্রতিটি জটিল কাজ নিজে দেখে দেন।"
        ),
        "display_order": 1,
    },
    {
        "name": "Nusrat Jahan",
        "role_en": "Customer Service Manager",
        "role_bn": "কাস্টমার সার্ভিস ম্যানেজার",
        "bio_en": (
            "Nusrat keeps every customer informed from booking to delivery and "
            "handles all warranty claims personally."
        ),
        "bio_bn": (
            "বুকিং থেকে ডেলিভারি পর্যন্ত নুসরাত প্রতিটি গ্রাহককে আপডেট রাখেন এবং সব "
            "ওয়ারেন্টি দাবি নিজে দেখভাল করেন।"
        ),
        "display_order": 2,
    },
    {
        "name": "Shafiqul Islam",
        "role_en": "Senior Technician",
        "role_bn": "সিনিয়র টেকনিশিয়ান",
        "bio_en": (
            "Shafiq specialises in express jobs and parts replacement, with a "
            "reputation for same-day miracles."
        ),
        "bio_bn": (
            "শফিক এক্সপ্রেস কাজ ও যন্ত্রাংশ প্রতিস্থাপনে বিশেষজ্ঞ; একই দিনে কাজ শেষ "
            "করার জন্য তার সুনাম আছে।"
        ),
        "display_order": 3,
    },
]


DEMO_LEADS = [
    {
        "reference": "LD-DEMO-0001",
        "name": "Kamrul Hasan",
        "phone": "01712-345001",
        "email": "kamrul@example.net",
        "message": "My laptop fan is very loud, can you check it?",
        "service": "general-repairs",
        "stage": "new",
        "source": "homepage-hero",
        "attribution": {"utm_source": "facebook", "utm_medium": "cpc"},
        "custom_fields": {"device": "Laptop", "brand": "Lenovo"},
        "activities": [("note", "Customer prefers a call after 6pm.")],
    },
    {
        "reference": "LD-DEMO-0002",
        "name": "Sharmin Akter",
        "phone": "+8801812345002",
        "email": "sharmin@example.net",
        "message": "Need a pickup from Dhanmondi for a broken blender.",
        "service": "pickup-delivery",
        "stage": "contacted",
        "source": "services-page",
        "attribution": {"utm_source": "google", "gclid": "demo-gclid-0002"},
        "activities": [("call", "Called and confirmed the pickup address.")],
    },
    {
        "reference": "LD-DEMO-0003",
        "name": "Rasel Mia",
        "phone": "01913345003",
        "email": "",
        "message": "How much for an express screen replacement?",
        "service": "express-service",
        "stage": "qualified",
        "source": "whatsapp-funnel",
        "custom_fields": {"budget": "5000", "urgency": "today"},
        "activities": [("whatsapp_click", "WhatsApp opened")],
    },
    {
        "reference": "LD-DEMO-0004",
        "name": "Nasrin Sultana",
        "phone": "01614345004",
        "email": "nasrin@example.net",
        "message": "Booked for Saturday morning, please confirm.",
        "service": "warranty-service",
        "stage": "booked",
        "source": "contact-form",
    },
    {
        "reference": "LD-DEMO-0005",
        "name": "Arif Chowdhury",
        "phone": "01715345005",
        "email": "arif@example.net",
        "message": "Parts replacement for my printer.",
        "service": "parts-replacement",
        "stage": "won",
        "source": "referral",
        "attribution": {"utm_source": "google", "utm_campaign": "brand"},
    },
    {
        "reference": "LD-DEMO-0006",
        "name": "Tania Rahman",
        "phone": "01816345006",
        "email": "",
        "message": "Asked about a full appliance overhaul.",
        "service": "expert-consultation",
        "stage": "lost",
        "lost_reason": "Went with a cheaper competitor.",
        "source": "facebook-ads",
        "attribution": {"utm_source": "facebook", "fbclid": "demo-fbclid-0006"},
    },
    {
        "reference": "LD-DEMO-0007",
        "name": "Mahmudul Karim",
        "phone": "01917345007",
        "email": "mahmud@example.net",
        "message": "আমার ফ্রিজ ঠান্ডা হচ্ছে না, দ্রুত সাহায্য দরকার।",
        "service": "general-repairs",
        "stage": "new",
        "source": "homepage-hero",
        "lang": "bn",
    },
    {
        "reference": "LD-DEMO-0008",
        "name": "Sabbir Ahmed",
        "phone": "01618345008",
        "email": "sabbir@example.net",
        "message": "Do you replace phone batteries while I wait?",
        "service": "express-service",
        "stage": "contacted",
        "source": "faq-page",
        "activities": [
            ("note", "Battery model checked; part is in stock."),
            ("whatsapp_click", "WhatsApp opened"),
        ],
    },
]


class Command(BaseCommand):
    help = "Seed demo CMS content for the Acme Services template (idempotent)."

    def handle(self, *args, **options):
        config = SiteConfig.get_solo()
        config.site_name = "Acme Services"
        config.tagline_en = "Trusted local service, done right."
        config.tagline_bn = "বিশ্বস্ত স্থানীয় সেবা, সঠিকভাবে সম্পন্ন।"
        config.phone_primary = "01700-000000"
        config.email = "owner@example.com"
        config.whatsapp_number = "8801700000000"
        config.address_en = "12 Demo Street, Dhaka 1205"
        config.address_bn = "১২ ডেমো স্ট্রিট, ঢাকা ১২০৫"
        config.hours_en = "Open daily 10:00–20:00"
        config.hours_bn = "প্রতিদিন খোলা ১০:০০–২০:০০"
        config.google_maps_embed_url = (
            "https://www.google.com/maps?q=Dhaka&output=embed"
        )
        config.save()
        self.stdout.write("SiteConfig seeded.")

        for data in SERVICES:
            data = dict(data)
            slug = data.pop("slug")
            Service.objects.update_or_create(slug=slug, defaults=data)
        self.stdout.write(f"Services seeded: {len(SERVICES)}")

        for data in TESTIMONIALS:
            data = dict(data)
            customer_name = data.pop("customer_name")
            Testimonial.objects.update_or_create(
                customer_name=customer_name, defaults=data
            )
        self.stdout.write(f"Testimonials seeded: {len(TESTIMONIALS)}")

        for data in FAQS:
            data = dict(data)
            question_en = data.pop("question_en")
            FAQItem.objects.update_or_create(question_en=question_en, defaults=data)
        self.stdout.write(f"FAQ items seeded: {len(FAQS)}")

        for data in TEAM:
            data = dict(data)
            name = data.pop("name")
            TeamMember.objects.update_or_create(name=name, defaults=data)
        self.stdout.write(f"Team members seeded: {len(TEAM)}")

        self.seed_leads()

        self.stdout.write(self.style.SUCCESS("Demo content seeded (idempotent)."))

    def seed_leads(self):
        """Seed pipeline stages plus demo leads.

        Leads are constructed directly (never through the capture endpoint)
        so seeding sends no notifications, and fixed references keep the
        whole block idempotent.
        """
        from leads.models import LeadActivity, PipelineStage, StageTransition
        from leads.phones import normalize_phone

        call_command("seed_pipeline")

        from leads.models import Lead

        new_stage = PipelineStage.objects.get(slug="new")
        for data in DEMO_LEADS:
            data = dict(data)
            reference = data.pop("reference")
            stage = PipelineStage.objects.get(slug=data.pop("stage"))
            service = Service.objects.filter(slug=data.pop("service", "")).first()
            activities = data.pop("activities", [])
            lost_reason = data.pop("lost_reason", "")
            phone = data.pop("phone")
            lead, _ = Lead.objects.update_or_create(
                reference=reference,
                defaults={
                    "name": data.pop("name"),
                    "phone": phone,
                    "phone_normalized": normalize_phone(phone),
                    "email": data.pop("email", ""),
                    "message": data.pop("message", ""),
                    "service": service,
                    "stage": stage,
                    "source": data.pop("source", ""),
                    "lang": data.pop("lang", "en"),
                    "attribution": data.pop("attribution", {}),
                    "custom_fields": data.pop("custom_fields", {}),
                },
            )
            StageTransition.objects.get_or_create(
                lead=lead,
                from_stage=None,
                to_stage=new_stage,
                defaults={"changed_by": "system"},
            )
            if stage.pk != new_stage.pk:
                StageTransition.objects.get_or_create(
                    lead=lead,
                    from_stage=new_stage,
                    to_stage=stage,
                    defaults={"changed_by": "demo", "reason": lost_reason},
                )
            for activity_type, body in activities:
                LeadActivity.objects.get_or_create(
                    lead=lead,
                    type=activity_type,
                    body=body,
                    defaults={"actor": "demo"},
                )
        self.stdout.write(f"Demo leads seeded: {len(DEMO_LEADS)}")
