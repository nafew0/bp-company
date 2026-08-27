# Master Build Plan — BP-Company Template + AppleLab (Dual-Repo)

**Repos:**
- **Template:** `https://github.com/nafew0/bp-company.git` — reusable service-provider website boilerplate ("BP-Company")
- **Client #1:** `https://github.com/nafew0/applelab.git` — AppleLab website, derived from BP-Company

**Companion documents (authoritative for detail, as amended by §8 of this file):**
- `AppleLab_PRD.md` — AppleLab product requirements
- `AppleLab_Build_Plan.md` — deep per-phase specs & edge cases for AppleLab features
- `Design/uploads/AppleLab_Design_Plan.md` — AppleLab visual system (client theme)

**Target builder:** AI coding agent, executing **one phase at a time**
**Version:** 1.0 · **Date:** August 2026

---

## 0. How to use this document

1. Build phases **in order**: `BP-0 → BP-4` (template), then `AL-0 → AL-13` (AppleLab), then `BP-5 → BP-9` (template, need-driven). Do not start a phase until its dependencies are merged and green in **both** repos.
2. **Every phase ends with the Sync Gate (§3).** A phase is NOT complete — even if its feature works — until the Sync Gate checklist passes and both repos are pushed. This is the single most important rule in this document.
3. Detailed feature specs for AL phases live in `AppleLab_Build_Plan.md`; this document tells you **which repo to work in, what is generic vs client-specific, what to propagate, and what supersedes the old plan** (§8).
4. Testing is mandatory per phase: `pytest` (backend), build+lint (frontend), and **Playwright e2e** for user-facing flows (§4). CI must stay green in both repos.
5. Conventions from `AppleLab_Build_Plan.md` §3 (Decimal-only money, concurrency-safe sequential IDs, BD phone normalization, private media, EXIF stripping, bilingual `_en`/`_bn` fields, trailing-slash APIs) apply to **both repos globally**.

---

## 1. The Two-Repo System

### 1.1 Roles

| Repo | Role | Contains |
|---|---|---|
| `bp-company` | **Upstream template.** The permanent home of all generic code. | Auth + staff admin shell, theme-token system (neutral default theme), i18n infrastructure, `content` app, `leads` app (pipeline, capture, notifications), funnel section kit, marketing module (later), Playwright/CI harness, template docs. |
| `applelab` | **Client build #1.** Derived from `bp-company`; validates the template with a real business. | Everything above **plus** AppleLab theme, Bengali content, device catalog, repair intake (`repairs`), invoicing CRM (`crm`), AppleLab public pages, seeds, deploy config. |

### 1.2 Local working layout

```
Web Projects/
├── bp-company/                    ← clone of nafew0/bp-company (created in BP-0)
└── AppleLab Website/
    └── applelab/                  ← becomes the clone of nafew0/applelab (re-derived in AL-0)
        ├── Design/                ← PRESERVE (client design assets)
        ├── AppleLab_PRD.md        ← PRESERVE
        ├── AppleLab_Build_Plan.md ← PRESERVE
        └── Master_Build_Plan.md   ← PRESERVE (this file; committed to BOTH repos)
```

### 1.3 Git wiring (set up in BP-0 / AL-0, verify at every Sync Gate)

- In `applelab`: `git remote add template https://github.com/nafew0/bp-company.git`
- In `bp-company`: `git remote add applelab https://github.com/nafew0/applelab.git`
- **Identical directory structure** for all generic code in both repos (same paths for `backend/leads/…`, `frontend/src/components/…`, e2e specs, configs). This is what makes propagation a clean `git cherry-pick` or file copy. Never relocate a generic file in one repo only.

### 1.4 Commit discipline

- **Never mix generic and client-specific changes in one commit.**
- Prefix commit subjects: `[generic] …` for anything that belongs in the template; `[applelab] …` for client-only work; `[sync] …` for propagation commits.
- Small, focused `[generic]` commits — they must cherry-pick cleanly across repos.

### 1.5 What is GENERIC vs CLIENT (classification table)

| Area | Classification | Sync? |
|---|---|---|
| `accounts`, admin shell, `AdminLayout`/`AdminRoute`, `api.ts`, JWT/auth, throttles, CSP middleware | GENERIC | Always |
| `leads` app (Lead, PipelineStage, StageTransition, LeadActivity, capture API, reference numbers, phone/WhatsApp helpers, notifications) | GENERIC | Always |
| `content` app (SiteConfig, Service, Testimonial, FAQItem, TeamMember) + its public APIs | GENERIC | Always |
| i18n infrastructure (next-intl setup, middleware, `LanguageToggle`, message-file mechanism) | GENERIC | Always |
| UI primitives (Button, Section, Container, Card, Reveal, form kit, wizard/stepper framework, funnel sections) | GENERIC | Always |
| Playwright harness, CI workflows, PR template, seed-command framework | GENERIC | Always |
| Marketing module (attribution, Pixel/GTM loader, CAPI queue) — once built | GENERIC | Always |
| Theme token **values** (`theme.css` / Tailwind preset), fonts, logo, favicon | CLIENT | Never (mechanism is generic; values are per-client) |
| `messages/en.json` / `bn.json` **content** | CLIENT | Never (structure/keys mechanism is generic) |
| `repairs` app (device catalog, RepairDetail, wizard specifics) | CLIENT (AppleLab) | No — but **harvest** generic patterns out of it |
| `crm` app (invoicing) | CLIENT (AppleLab) for now | Promote to template when a 2nd client needs invoicing |
| AppleLab public pages/copy/SEO content, seeds with real NAP | CLIENT | Never |
| `.env` values, deploy config | CLIENT/secret | Never commit secrets to either repo |

**Gray-area rule:** if you're unsure, build it in the client repo, mark the commit `[generic?]`, and decide at the Sync Gate. Never silently decide "client-only" for something a printing company would also want — that's the test: *"Would a printing / cleaning / dental service website want this?"* If yes → GENERIC.

### 1.6 Shared-code editing rules

1. **Template-first rule:** when a planned change touches a GENERIC file, make it in `bp-company` first, then propagate to `applelab` — even mid-AL-phase. Harvest-after (client → template) is only for genericity *discovered* during client work.
2. **Never fork generic files.** If AppleLab needs different behavior in a generic component, add a config/prop/override point in the template version and use it from AppleLab. Editing a generic file divergently in one repo is a defect.
3. Client extension points live in clearly separated files/apps, never inline in generic modules.

---

## 2. SYNC_LOG.md (exists in BOTH repos — the memory of the protocol)

Each repo carries a root-level `SYNC_LOG.md`. **Every phase appends to it.** Format:

```markdown
# Sync Log
| Date | Phase | Commit(s) | Description | Class | Direction | Status |
|------|-------|-----------|-------------|-------|-----------|--------|
| 2026-08-30 | BP-3 | a1b2c3d | Lead capture endpoint + spam guard | generic | template→applelab | synced |
| 2026-09-04 | AL-4 | e4f5g6h | Wizard stepper framework | generic | applelab→template | synced |
| 2026-09-04 | AL-4 | i7j8k9l | Device photo HEIC handling | generic | applelab→template | PENDING |
| 2026-09-05 | AL-4 | m0n1o2p | AppleLab wizard copy + bn strings | client | — | n/a |
```

Rules:
- `Status` is one of `synced` / `PENDING` / `n/a`.
- **A Sync Gate cannot pass while any `PENDING` row exists** for the phase being closed (older PENDING rows must be justified in the row's Description or resolved).
- When propagating, record the receiving repo's commit hash in the row (append `→ <hash>`).

---

## 3. THE SYNC GATE (mandatory, end of EVERY phase, no exceptions)

Run this checklist before declaring any phase done:

1. **Inventory:** `git log` the phase's commits. Classify every commit `[generic]` / `[applelab]` / resolve any `[generic?]` using §1.5.
2. **Harvest (client → template):** every `[generic]` commit made in `applelab` is cherry-picked/copied into `bp-company` **now**. Resolve path/theme differences (generic code must run under the neutral theme with no AppleLab references — no AppleLab strings, brand colors, or model names in template code).
3. **Propagate (template → client):** every `[generic]` change made in `bp-company` during this phase is cherry-picked/copied into `applelab` **now** (once `applelab` exists).
4. **Test BOTH repos:** in each repo that received changes — `pytest` green, `npm run build` + lint green, relevant **Playwright** specs green, migrations apply on a fresh DB, seeds still run.
5. **Log:** update `SYNC_LOG.md` in **both** repos (mirror entries). No `PENDING` rows remain for this phase.
6. **Push both repos.** CI green on GitHub for both.
7. Only then: mark the phase complete.

**Enforcement aids (created in BP-0):**
- `.github/PULL_REQUEST_TEMPLATE.md` in both repos containing the Sync Gate checklist verbatim, including the question: *“Does this PR contain generic changes? If yes, link the twin commit/PR in the other repo.”*
- A `SYNC_GATE.md` quick-reference at repo root of both repos (copy of this section), so an agent opening either repo cold cannot miss the protocol.

---

## 4. Testing standard (both repos)

### 4.1 Layers

| Layer | Tool | Scope |
|---|---|---|
| Backend unit/API | `pytest` + `pytest-django` (already in template) | Models (numbering, totals, transitions), serializers, every endpoint: happy + auth + validation + edge, permissions public-vs-staff |
| Frontend build | `next build` + ESLint | Every phase |
| **E2E** | **Playwright** (`@playwright/test`, Chromium minimum; add WebKit for AppleLab pre-launch QA) | Every user-facing flow of the phase |

### 4.2 Playwright setup (installed in BP-0, inherited by applelab)

- Lives at `frontend/e2e/` with `playwright.config.ts`; `npm run e2e` / `npm run e2e:ui`.
- Runs against real servers: Django (`manage.py runserver`, dedicated test DB seeded via a `seed_e2e` management command) + Next (`next build && next start`). A `scripts/e2e-up.sh` boots both; config uses `webServer` where practical.
- Conventions: `data-testid` on interactive elements; no arbitrary sleeps (use expect polling); each spec independent + re-runnable (seed resets); file-upload fixtures live in `frontend/e2e/fixtures/` (include a small JPEG, PNG, oversized file, and HEIC sample).
- **Bilingual runs (applelab):** key public flows execute twice via test parametrization (`/en/...` and `/bn/...`).

### 4.3 CI (GitHub Actions, both repos — created in BP-0, kept identical)

`.github/workflows/ci.yml`: on push/PR → jobs:
1. `backend`: Postgres + Redis services, `pip install`, `migrate`, `pytest`.
2. `frontend`: `npm ci`, lint, `next build`.
3. `e2e`: boot backend (seeded) + frontend, `playwright install --with-deps chromium`, run e2e suite, upload trace/screenshots on failure.

A red CI on either repo blocks all further phases.

---

## 5. Architecture decisions locked (from discussion)

1. **Clone-per-client** template model (no multi-tenancy). Design lead/event schemas stably so a central reporting tool could be added later.
2. **Funnels are code-built** from a reusable section kit; admin edits content, never layout. No page builder.
3. **Typed forms + `custom_fields` JSONB** on Lead. No dynamic form builder.
4. Follow-up layer scope (in order of delivery): proper pipeline staging → owner notifications + WhatsApp → lead auto-responder → drip sequences (BP-7) → booking/calendar-lite (BP-8).
5. Public site bilingual-capable (i18n infra in template; EN default, BN as the worked example); **admin panel stays English**.
6. SaaS surface (subscriptions/pricing/public registration/Stripe UI) is **deleted** in the template (unlike the old in-place AppleLab plan which only hid it). bKash service files are archived under `contrib/` for future deposit features.

---

# STAGE A — TEMPLATE FOUNDATION (work in `bp-company`)

> No applelab repo exists yet, so Sync Gates in Stage A only verify: classification done, no client-specific content leaked into the template, SYNC_LOG rows added, CI green, pushed.

---

## Phase BP-0 — Repo bootstrap, SaaS strip, test/CI/sync harness

**Goal:** `bp-company` exists on GitHub as a clean, building, tested, SaaS-free starter with the entire dual-repo protocol in place.

**Work**
1. Copy the SaaS boilerplate source (`AppleLab Website/template/` — backend + frontend + scripts) into a new local `Web Projects/bp-company/` folder. `git init`, initial commit of the pristine copy (so the strip is diffable), add remotes per §1.3, push to `nafew0/bp-company`.
2. **Strip the SaaS surface (delete, don't hide):**
   - Backend: remove `subscriptions` from `INSTALLED_APPS` and root urls; delete the app (archive `bkash_service.py`, `bkash_sns.py` to `backend/contrib/payments/` with a README); remove subscription imports from `accounts/admin_views.py` (payments dashboard endpoints, plan metrics) — replace the admin dashboard payload with placeholder stats (leads stats arrive in BP-4); delete Stripe deps from `requirements.txt`.
   - Frontend: delete `pricing`, `register` (public), `payment/*` routes + views, `Pricing.tsx`, `PaymentSuccess/Failed.tsx`, subscription badge in navbar, `payments.ts`/`subscriptions.ts` services, Stripe CSP entries, `AdminPayments` page + nav entry. Keep `login`, password-reset flows, `profile` (staff self-service), `AdminUsers`, `AdminSettings`.
   - Staff creation path documented: `createsuperuser` + Admin Users page (no public signup).
3. **Harness:** Playwright per §4.2 (with a first smoke spec: home placeholder renders, staff can log in, `/admin` gate works); CI per §4.3; `SYNC_LOG.md`, `SYNC_GATE.md`, PR template; `README.md` describing the template + the two-repo protocol; commit this `Master_Build_Plan.md` at repo root.
4. Rename Django project references from the copied template as needed (`applelab` project dir in the old copy → neutral `config` or `bp` project name).

**Edge cases**
- Removing `subscriptions` breaks imports in `accounts` (admin views/serializers reference payments/plans) — find every import (`grep -r subscriptions backend/`) and fix; migrations for a deleted app must not linger in other apps' dependencies.
- `AuthContext`/`Dashboard.tsx` may fetch subscription endpoints — remove those calls; staff dashboard renders without them.
- `.env.example` cleaned of Stripe vars; no secrets committed; `.gitignore` covers `venv/`, `node_modules/`, `.env`, `.next/`, media.

**DoD**
- [ ] Fresh clone → `setup` → both servers run; staff login → `/admin` works; zero references to subscriptions/Stripe/pricing remain (grep-clean).
- [ ] `pytest` green (fix/remove tests that covered deleted features); build + lint green; Playwright smoke green; CI green on GitHub.
- [ ] SYNC_LOG/SYNC_GATE/PR template/README in place. **Sync Gate passed.**

---

## Phase BP-1 — Theme token system + UI primitives (neutral theme)

**Goal:** A swappable per-client theming layer plus the generic UI kit, shipped with a clean neutral default theme.

**Work**
- Single theme entrypoint: `frontend/src/theme/tokens.css` (CSS custom properties) + `frontend/src/theme/preset.ts` consumed by `tailwind.config.js` `theme.extend`. **All** colors/radii/shadows/spacing/type-scale/fonts flow from tokens — a client re-theme touches ONLY these two files plus assets (logo/favicon/fonts).
- Neutral default theme (grayscale + one accent), structured to hold any client palette (the token *names* mirror `AppleLab_Design_Plan.md` §9 — blue/accent scales, semantic tokens, status colors — so AppleLab's values drop in at AL-0).
- Generic primitives (per `AppleLab_Build_Plan.md` Phase 1 spec, genericized): `Button` (primary/secondary/ghost/sm, pill-capable via token), `Section` (background variants), `Container` widths, `Eyebrow`, `Card`, `Reveal` (IntersectionObserver + stagger + `prefers-reduced-motion`), `SectionDivider`, form controls (Input/Select/Textarea/Checkbox with error states), `Stepper` shell (multi-step form chrome — the wizard skeleton).
- Dev-only `/_styleguide` route rendering everything (used by e2e + future client theming QA).
- **Font slots:** `--font-display/-text/-brand` + `--font-alt-script` (the slot AppleLab will fill with Bengali) defined in tokens; loading mechanism generic.

**Edge cases:** token changes must not break the existing admin screens (scope or migrate admin styles deliberately); primitives must render acceptably under an arbitrary palette (no hardcoded hexes anywhere — grep-clean); reduced-motion honored.

**Tests:** styleguide Playwright spec (all primitives render, button states, stepper next/back); visual sanity via screenshot assertions on the styleguide (loose thresholds).

**DoD:** tokens + primitives + styleguide shipped; zero hardcoded colors outside `theme/`; CI green. **Sync Gate passed.**

---

## Phase BP-2 — i18n infrastructure (next-intl)

**Goal:** Locale-routed public site machinery; admin/auth stay English. (Generalizes `AppleLab_Build_Plan.md` Phase 2 — that spec's edge cases apply verbatim.)

**Work:** `next-intl` middleware ([locale] segment for public routes only; `admin`, `login`, auth, `api`, `media`, static excluded); `messages/en.json` (complete, neutral copy) + `messages/bn.json` (mirrors keys — machine-draft values marked for client replacement); `LanguageToggle` (persists `NEXT_LOCALE`, keeps current path); locale-aware Link helpers; `<html lang>` + font-slot switch per locale; enabled-locales config (a client can ship EN-only by config).

**Edge cases:** missing key → EN fallback (dev-logged, never raw keys in prod); `/` redirect honors cookie then `Accept-Language`; deep links shareable; middleware matcher doesn't intercept `/api`/`/media`; single-locale config removes the toggle cleanly.

**Tests:** Playwright — toggle EN↔BN preserves path; cookie persists across reload; admin unaffected; e2e runs the stylegude flow in both locales.

**DoD:** i18n live behind config; both message files structurally complete; CI green. **Sync Gate passed.**

---

## Phase BP-3 — `content` app + generic public shell

**Goal:** The CMS backbone + navbar/footer/SEO base every client site starts from. (Generalizes `AppleLab_Build_Plan.md` Phases 3–4; those edge cases apply.)

**Work**
- Backend `content` app: `SiteConfig` (singleton: NAP, `whatsapp_number`, hours, socials, maps embed, analytics IDs, default meta), `Service` (generic offering: `name_en/bn`, slug, icon, `summary`, `body`, image, order, active — **this is the generic ancestor of "device categories"**), `Testimonial`, `FAQItem`, `TeamMember`. Public read APIs with `?lang=` + EN fallback; short-TTL cache headers. Idempotent `seed_demo` command (neutral demo business: "Acme Services").
- Frontend: public `Navbar` (logo slot, links, locale toggle, primary CTA slot) + `Footer` (columns from SiteConfig) + base metadata/OG helpers + `LocalBusiness` JSON-LD helper + sitemap/robots scaffolding; a simple generic Home assembled from primitives (hero, services grid from API, testimonials, FAQ, contact/map section) — this doubles as the template's living demo.
- Generic `Contact` form → email to `SiteConfig.email` (honeypot + throttle) — the first lead-ish flow (real leads in BP-4).

**Edge cases:** singleton SiteConfig enforced; empty content sections collapse (no empty shells); maps embed behind CSP delta + click-to-load until consent (consent banner arrives in BP-4 or client hardening — ship click-to-load now); NAP single-sourced.

**Tests:** pytest for APIs (lang fallback, empty states, singleton); Playwright — demo home renders EN+BN, contact form submits (mail captured via console/backend flag), navbar/footer navigation, mobile drawer.

**DoD:** demo site browsable end-to-end from seed; CI green. **Sync Gate passed.**

---

## Phase BP-4 — `leads` app: pipeline, capture, notifications, lead admin

**Goal:** The GHL-lite core — the reason this template exists. **This is the machinery AppleLab's repair flow will run on.**

**Work — backend (`leads` app)**
- `PipelineStage`: `name`, `slug`, `color`, `order`, `is_terminal`, `counts_as_converted`, `requires_reason`, `is_active` (archivable, not deletable once referenced). Seed default set: New → Contacted → Qualified → Booked → Won / Lost (Lost: `requires_reason`).
- `Lead`: UUID pk; `reference` (unique, human ID — **generic sequential reference service**: configurable prefix `{PREFIX}-{YYYYMM}-{NNNNN}`, concurrency-safe per `AppleLab_Build_Plan.md` §3.4, monthly reset); `name`, `phone` (+ normalized field, §4.3 BD rules with a config hook for other regions), `email`, `service` FK (nullable), `message`, `custom_fields` JSONB, `stage` FK, `assigned_to` FK(User, null), `source` (form/funnel identifier), `attribution` JSONB (`utm_*`, `fbclid`, `gclid`, `fbp/fbc`, `landing_page`, `referrer` — captured now, consumed fully by BP-6), `consent_marketing` bool, `lang`, timestamps.
- `StageTransition`: lead FK, from/to stage, `reason`, `changed_by`, `created_at` (auto-row on every change; powers time-in-stage).
- `LeadActivity`: lead FK, `type` (note/call/whatsapp_click/email_sent/system), `body`, `actor`, `created_at`.
- Public `POST /api/leads/capture/`: throttled, honeypot, validates + normalizes, stamps attribution from payload, assigns default stage, fires notifications. Idempotency window against double-submit.
- Notifications: owner email on new lead (existing email pattern; failure never blocks capture); **lead auto-responder** (localized, per-form template, skipped when no email); WhatsApp deep-link helper (`wa.me` builder, §4.3).
- Staff APIs under `/api/admin/leads/…`: list (filter: stage/service/assignee/date/search over name/phone/reference), detail, patch (stage moves validated — terminal stages demand reason), activities CRUD, stage-config CRUD, `GET /api/admin/leads/summary/` (counts by stage, new today/week, conversion + time-in-stage basics).

**Work — frontend (admin)**
- `AdminLeads`: table view (react-table: reference, name, phone, service, stage chip, age, assignee) **and kanban board** (drag between stages; terminal drop prompts reason; optimistic update + rollback).
- `AdminLeadDetail`: profile, stage control, activity timeline + note composer, **WhatsApp button** (prefilled, disabled with reason when phone invalid), attribution panel (source/UTM display), assignment.
- `AdminPipelineSettings`: stage CRUD/reorder/colors.
- Dashboard widgets: leads by stage, new this week, conversion rate.
- **Public form kit:** `LeadForm` component (typed fields + hidden attribution fields auto-filled from a first-touch cookie helper `attribution.ts`) + `FunnelPage` wrapper (per-step event hook points, attribution persistence) + a **reference funnel** (`/f/demo`: landing → form → thank-you) in the demo site.

**Edge cases:** reference-number race (atomic — test with concurrent submits); stage archived while leads reference it (stays displayable, not selectable); kanban drag conflict between two staff (server wins, board refreshes); duplicate lead (same normalized phone within N days) → flagged on the new lead, not silently merged; attribution cookie absent (direct visit) → clean empty attribution; spam flood → throttle returns friendly error, no lead rows; auto-responder loops prevented (never respond to owner's own address); phone-only leads fine (email optional).

**Tests:** pytest — capture validation/normalization/idempotency/race, stage transition rules + reason enforcement, summary math, permissions. Playwright — full journey: visit demo funnel with `?utm_source=meta&fbclid=X` → submit form → thank-you; staff logs in → lead visible with reference + attribution → drag New→Contacted on kanban → note added → move to Lost requires reason; auto-responder + owner-mail flagged in backend test hooks.

**DoD:** demo funnel → pipeline → respond loop works end-to-end under the neutral theme; CI green. **Sync Gate passed.** Template is now **cloneable**.

---

# CLONE POINT

---

## Phase AL-0 — Derive `applelab` from the template + AppleLab identity

**Goal:** `nafew0/applelab` exists as a themed, bilingual, seeded derivation of `bp-company` — with the sync wiring live in both directions.

**Work**
1. Generate the project with the template's `setup.sh` (added after BP-4; supersedes plain cloning): `./setup.sh --name applelab --display "AppleLab" ...` — this renames the Django package to `backend/applelab/`, substitutes names, generates env/secrets, installs, migrates, and git-inits with the `template` remote and a recorded `TEMPLATE_VERSION` baseline. Re-point `origin` to `https://github.com/nafew0/applelab.git`; in `bp-company` add the `applelab` remote. Push. (App-level paths stay identical for cherry-picks; see SYNC_GATE.md on the renamed project package.)
2. Migrate the existing `AppleLab Website/applelab/` folder: **preserve** `Design/`, `AppleLab_PRD.md`, `AppleLab_Build_Plan.md`, `Master_Build_Plan.md`, `.env` values (never committed). First **verify** the old `backend/`+`frontend/` copies contain no hand-written changes vs the original template source (diff); they should be pristine — then replace the folder contents with the new clone + preserved files. (If any local edits are found, stop and reconcile explicitly.)
3. **Theme:** fill `theme/tokens.css` + `preset.ts` with the AppleLab values from `AppleLab_Design_Plan.md` §9 (brand blue/cyan scales, Apple grays, status colors, pill radius, type scale); wire `Geom Graphic` (wordmark only) + **Bengali font** (Noto Sans Bengali / Hind Siliguri) into `--font-alt-script`; logo/favicon from `Design/assets/`.
4. **i18n:** enable `en`+`bn`; translate `messages/bn.json` for all existing template keys (real Bengali, not placeholders — flag any uncertain strings for client review).
5. **Seed:** `seed_applelab` — SiteConfig with real NAP (PRD §1.2), WhatsApp `8801603710044`; lead reference prefix `APL`; pipeline stages configured to the repair lifecycle (see AL-2); a handful of real-ish testimonials/FAQs.
6. CI runs as inherited; Playwright smoke re-run bilingual.

**Edge cases:** Bengali renders in nav/footer/styleguide on non-Apple platforms; no neutral-theme leftovers ("Acme") in seeded UI; `SYNC_LOG.md` initialized referencing the template commit hash the clone derived from (the sync baseline).

**DoD:** AppleLab-branded bilingual shell + demo funnel running; both repos' remotes wired; CI green on `applelab`. **Sync Gate passed.**

---

# STAGE B — APPLELAB BUILD (work in `applelab`; harvest continuously)

> Detailed specs & edge cases: `AppleLab_Build_Plan.md` phases referenced below, **as amended by §8**. Every phase: watch for the listed **Harvest candidates** — they are `[generic]` commits destined for `bp-company` at the Sync Gate.

---

## Phase AL-1 — Device catalog (`repairs` app, part 1)

Old plan ref: Phase 4 (catalog portion). Build `DeviceCategory`, `DeviceModel` (year), `Issue` + cascading public APIs + idempotent `seed_catalog` (Appendices A/B of the old plan). `DeviceCategory` may *link* to a `content.Service` row for page content reuse.

**Edge cases:** as old-plan Phase 4 (empty years/models, inactive filtering, lang fallback, slug stability).
**Tests:** pytest for cascades + fallbacks; Playwright deferred to AL-3 (wizard consumes these APIs).
**Harvest candidates:** none expected (niche models) — but if a generic "cascading select" API/serializer pattern emerges, harvest the pattern/utilities.
**DoD:** catalog APIs + seed complete; CI green. **Sync Gate passed.**

## Phase AL-2 — Repair intake backend on the Lead core

Old plan ref: Phase 7, **amended (§8.3): no standalone `RepairRequest`.** Instead:
- `repairs.RepairDetail` — OneToOne to `leads.Lead`: `category` FK, `device_model` FK (nullable) + `device_model_other`, `issues` M2M + `issue_other`, description lives on `Lead.message`, photo relation `RepairPhoto` (private storage, EXIF-stripped, HEIC accepted/converted — all old-Phase-7 photo edge cases apply).
- Pipeline stages ARE the repair lifecycle (seeded in AL-0): Pending → Confirmed → Diagnosed → In Progress → Ready → Completed / Cancelled / No Fix (terminal ones `requires_reason` as appropriate; `counts_as_converted` on Completed). `StageTransition` replaces `RepairStatusHistory`. `Lead.reference` with `APL` prefix replaces `ticket_id`.
- Intake endpoint: extend/wrap the template capture endpoint (multipart variant) — **do not fork it**; add a capture-extension hook in the template if needed (template-first rule → make that hook a `[generic]` change in `bp-company`, propagate, then use it here).
- Owner email (existing template notification, enriched with repair fields + photo thumbnails), confirmation token for the wizard's confirmation page.

**Edge cases:** all of old Phase 7 (reference race, other-paths, HEIC/corrupt/oversized uploads, snapshot names against catalog edits, idempotency, XSS, filename sanitization).
**Tests:** pytest per old Phase 7 DoD, rewritten against Lead+RepairDetail.
**Harvest candidates:** multipart/file-upload support in the generic capture flow; private-media serving pattern; HEIC pipeline; capture-extension hook.
**DoD:** old Phase 7 DoD equivalents met. **Sync Gate passed.**

## Phase AL-3 — Repair request wizard (public funnel)

Old plan ref: Phase 8 — spec applies in full (category → year → model(+other) → issues(+other) → details/photos → contact → review → confirm; sessionStorage persistence; double-submit guard; bilingual; a11y; confirmation page with WhatsApp deep link). Build it on the template's `Stepper`/`FunnelPage`/`LeadForm` kit, extending the kit rather than forking it.

**Tests (Playwright, both locales):** happy path with photo fixture; "not listed" at model AND issue level; empty-catalog category path; refresh-persistence mid-wizard; double-submit; oversized/HEIC uploads; confirmation reload via token (no resubmit); WhatsApp link href correctness.
**Harvest candidates:** wizard step framework improvements, photo-upload component, phone input (BD format-as-you-type), review-summary pattern, confirmation-token page pattern.
**DoD:** old Phase 8 DoD. **Sync Gate passed.**

## Phase AL-4 — Public status tracker

Old plan ref: Phase 9 — spec applies (reference + phone-last4 lookup, public timeline from StageTransitions with `public_note`, enumeration-safe, rate-limited, bilingual page + home widget).
**Tests:** Playwright — found/not-found/wrong-phone identical messaging; pytest rate-limit + field exposure.
**Harvest candidates:** the whole "request status lookup" module is generic (any service business: "where is my order/job") — harvest as a template feature flag.
**DoD:** old Phase 9 DoD. **Sync Gate passed.**

## Phase AL-5 — Admin repair queue & detail

Old plan ref: Phase 10 — spec applies, re-based on the template's `AdminLeads`/`AdminLeadDetail`: extend via a repair panel (device, issues, photo gallery/lightbox), stage control already exists, WhatsApp button already exists (verify prefilled localized message with reference), "Create invoice from this request" button stubbed until AL-8.
**Tests:** Playwright — filter/search queue, open detail, view photos, stage change writes transition + optional customer notification (AL-6), WhatsApp disabled-state for invalid phone.
**Harvest candidates:** detail-panel extension mechanism (plugin slot in AdminLeadDetail), photo gallery component, queue filter improvements.
**DoD:** old Phase 10 DoD. **Sync Gate passed.**

## Phase AL-6 — Customer status notifications

Old plan ref: Phase 11 — spec applies (localized email per stage change, EN+BN templates, resend + suppress, debounce, no-email skip, failures never block).
**Harvest candidates:** stage-change notification framework (per-stage template mapping, suppress/resend) — clearly generic; build template-first in `bp-company` where practical.
**DoD:** old Phase 11 DoD. **Sync Gate passed.**

## Phase AL-7 — CRM backend: customers, invoices, payments

Old plan ref: Phases 12–13 — specs apply in full (`crm` app: Customer dedupe-by-phone + merge; Invoice/InvoiceItem/Payment; server-authoritative Decimal totals; concurrency-safe `INV-` numbering reusing the generic reference service; status derived from payments; edit-after-payment guards; AdminCustomers screens).
**Harvest candidates:** none yet — `crm` stays client-side until a second client needs invoicing (§1.5); the reference-number service is already generic.
**DoD:** old Phases 12–13 DoDs. **Sync Gate passed.**

## Phase AL-8 — Invoice split editor (A5) + finance dashboard

Old plan ref: Phases 14–15 — specs apply in full (left-fields / right-live-A5-preview editor; A5 `@page` print stylesheet incl. multi-page pagination; totals mirror server compute; EN/BN invoices with Bengali font embedded; record/void payments; finance summary + dashboard widgets + CSV export).
**Tests:** Playwright — build an invoice (items add/remove/reorder, discount), preview totals equal API totals, record partial then full payment → status transitions, print stylesheet asserts `size: A5`; pytest for all money math.
**DoD:** old Phases 14–15 DoDs incl. manual print QA (Chrome/Safari/Firefox). **Sync Gate passed.**

## Phase AL-9 — AppleLab public pages (home, services, about, contact, FAQ, warranty)

Old plan ref: Phases 5–6 — specs apply (Design-Plan section-by-section home; service pages per category with issues grid + wizard CTA preselecting category; FAQ/Warranty/About/Contact; deferred sections stubbed/hidden cleanly; "Instant Quote" CTAs replaced per amendment).
**Harvest candidates:** any new generic sections built here (pricing-teaser band, process timeline, dark-section variants) → funnel/section kit.
**DoD:** old Phases 5–6 DoDs, bilingual. **Sync Gate passed.**

## Phase AL-10 — SEO & structured data

Old plan ref: Phase 16 — applies in full (bilingual metadata, hreflang en/bn/x-default, sitemap both locales, robots, LocalBusiness/Service/FAQPage/BreadcrumbList JSON-LD, validation).
**Harvest candidates:** hreflang/sitemap/JSON-LD helpers → template SEO module.
**DoD:** old Phase 16 DoD. **Sync Gate passed.**

## Phase AL-11 — Security, privacy, consent hardening

Old plan ref: Phase 18 — applies in full (rate limits + honeypot everywhere, upload hardening verification, consent banner gating maps/analytics, privacy/terms pages, IDOR pass on media/references/invoices, CORS/hosts for the real domain).
**Harvest candidates:** consent-banner component + consent-gated script loader → template (BP-6 depends on it).
**DoD:** old Phase 18 DoD. **Sync Gate passed.**

## Phase AL-12 — QA: bilingual, a11y, performance

Old plan ref: Phase 19 — applies in full (full EN+BN sweep incl. emails/invoices, keyboard/screen-reader pass on wizard + invoice editor, Lighthouse mobile ≥90 / CWV targets, clean-DB end-to-end journey). Add WebKit to the Playwright matrix for this phase.
**DoD:** old Phase 19 DoD + full e2e suite green on Chromium & WebKit. **Sync Gate passed.**

## Phase AL-13 — Deploy & handoff

Old plan ref: Phase 20 — applies in full (VPS single-origin deploy, prod env, SPF/DKIM, media persistence + backups with tested restore, Sentry/UptimeRobot, client training, Search Console).
**DoD:** old Phase 20 DoD. **Sync Gate passed** (final harvest sweep: walk `SYNC_LOG.md` history for anything still PENDING).

---

# STAGE C — TEMPLATE GROWTH (work in `bp-company`; propagate to `applelab`)

> Each phase is built template-first under the neutral theme/demo site, then **propagated to `applelab` in the same phase** (that's the Sync Gate's step 3) so AppleLab benefits immediately and validates it.

## Phase BP-5 — Funnel & section kit consolidation
Consolidate everything harvested during Stage B into a coherent, documented kit: ~10 sections (hero, pain/promise, offer, form embed, proof, FAQ, CTA band, thank-you, status-lookup, booking placeholder), the wizard framework, `FunnelPage` event hooks. Rebuild the demo reference funnel with the final kit. Docs: "how to compose a funnel for a new client." **Tests:** styleguide + demo-funnel Playwright refreshed. Propagate any component API changes to `applelab`.

## Phase BP-6 — Marketing module (attribution → Pixel/GTM → Meta CAPI)
The old plan's Phase 17 + Phase 27(CAPI) land HERE, generic:
- First-touch attribution helper finalized (cookie TTL, cross-step persistence — already capturing since BP-4).
- Consent-gated Pixel + GTM/GA4 loader (IDs from SiteConfig; consent component from AL-11 propagated back).
- `marketing` app: `CAPIEvent` queue (event_name, event_time, `event_id` for dedup, hashed user_data, custom_data, status/response) + Celery sender to Graph API; SHA-256 normalization per Meta spec; **match-quality forwarding** (`fbp`/`fbc`, client IP, UA captured at lead submit); configurable event mapping (form submit → `Lead`; stage X → custom event; AL invoice-paid → `Purchase` optional). Meta Test Events support (test_event_code setting).
- Marketing dashboard: leads by source/campaign, conversion by stage per source.
**Edge cases:** no raw PII stored in events; dedup verified against browser Pixel (same event_id both sides); consent=declined → zero marketing calls; Graph API failures retry with backoff, poison events flagged; clock skew on event_time.
**Tests:** pytest hashing/normalization/dedup/queue; Playwright — consent flow (decline = no pixel requests via request interception; accept = pixel fires with matching event_id on lead submit).
**Propagate to `applelab`** and validate against the real AppleLab ad account (Test Events) — this is the module's real-world proof.

## Phase BP-7 — Drip / follow-up sequences
`Sequence` (per-form/service), `SequenceStep` (delay, template EN/BN, channel=email at v1), enrollment on capture, **stop conditions**: stage moved beyond entry stage, manual stop, reply-detected (webhook optional), unsubscribed. Celery beat scheduler; per-lead sequence state visible on `AdminLeadDetail`; unsubscribe link + suppression list (compliance).
**Edge cases:** enrollment races, editing a live sequence (versioning or affect-future-only), timezone-aware send windows (Dhaka business hours), dedupe when a lead re-submits, hard-bounce suppression.
**Tests:** pytest scheduling/stop-conditions with frozen time; Playwright admin sequence CRUD + lead timeline shows sends.
Propagate to `applelab` (AppleLab decides which forms enroll).

## Phase BP-8 — Booking / calendar-lite
`AvailabilityRule` (weekday/time-window/slot-length/capacity), `Booking` (lead FK, slot, status: booked/rescheduled/cancelled/no-show/completed), public slot API (capacity-aware), booking funnel section, reminders (email now, structure ready for WhatsApp/SMS later), admin day/week view + manual booking.
**Edge cases:** slot race at capacity (atomic reservation), DST-free but timezone-correct (Asia/Dhaka fixed per site config), reschedule/cancel token links, closed dates/holidays override, lead books twice.
**Tests:** pytest capacity/race/reschedule; Playwright — book a slot in the funnel, see it in admin, reschedule via link.
Propagate to `applelab` if/when AppleLab wants scheduled drop-offs.

## Phase BP-9 — Template packaging & new-client workflow
`NEW_CLIENT_CHECKLIST.md`: clone → rename → theme (tokens+fonts+logo) → locales → SiteConfig/seeds → pipeline stages → forms/funnels → notifications → analytics IDs → deploy. A `scripts/new_client.sh` scaffold helper (rename project, reset SYNC baseline, fresh SYNC_LOG). Template README finalized; demo site polished; a "template release" tag so client repos record which template version they derive from.
**DoD:** a dry-run: create a throwaway client ("printco-test") from the checklist in under a day of agent work, funnel → lead → pipeline working. Delete the throwaway.

---

## 8. Amendments to `AppleLab_Build_Plan.md` (authoritative supersessions)

The old plan remains the detailed spec for AL phases, **except**:

1. **Starting point:** AppleLab starts by cloning `bp-company` (AL-0), NOT by in-place triage of the SaaS boilerplate. Old Phase 0 and the §2 triage matrix are superseded by BP-0/AL-0. The SaaS surface is **deleted in the template**, not hidden.
2. **Old Phases 1–3 (design system, i18n, shell)** collapse into template phases BP-1/BP-2/BP-3 + AL-0 theming/translation. Their specs informed the template; their edge cases still apply wherever the features live.
3. **Data-model unification (supersedes old Phase 7 model shape):** there is no standalone `RepairRequest`. A repair request is a `leads.Lead` (reference `APL-YYYYMM-NNNNN` via the generic reference service) + `repairs.RepairDetail` (OneToOne) + `RepairPhoto`. Repair statuses are the site's configured `PipelineStage` set; `RepairStatusHistory` is `StageTransition`. All old-Phase-7 behavior/edge cases carry over onto this shape.
4. **Owner notification, auto-responder, WhatsApp helper** come from the template (BP-4); AppleLab configures and localizes rather than building.
5. **Old Phase 17 (analytics/Pixel) and old Phase 27 (Meta CAPI)** are merged and moved to template Phase BP-6, then propagated to AppleLab.
6. **Old Part VII** otherwise stands: quote engine (P21), AI chat (P22), blog (P23), trade-in (P24), corporate (P25), bKash deposits (P26) remain post-MVP AppleLab (or template) work; drip and booking now live at BP-7/BP-8.
7. **Old Appendix E (global DoD)** gains one line for both repos: **“Sync Gate passed (§3 of Master_Build_Plan.md).”**

---

## 9. Standing reminders for the coding agent (read at the start of EVERY phase)

- You are working in a **two-repo system**. Before writing code, state (to yourself, in the plan for the phase) which repo you're editing and which files are GENERIC vs CLIENT per §1.5.
- GENERIC change? → make it in `bp-company` first when practical (§1.6), propagate at the Sync Gate at latest.
- Discovered something generic while doing client work? → commit it separately as `[generic]`, harvest at the Sync Gate.
- **Never fork a generic file. Never let client strings/colors into the template. Never mix classifications in one commit.**
- The phase is done when: feature works · tests (pytest + Playwright) green · CI green in both repos · SYNC_LOG updated in both · both repos pushed.
