# BP-Company — Service-Provider Website Template

A reusable **Django 5.2 + Next.js 16** boilerplate for building service-provider company websites (repair shops, printing services, clinics, agencies, …) whose job is to **advertise services, run marketing funnels, and capture + manage leads** — a deliberately small "GoHighLevel-core" without the platform bloat.

> **⚠️ This repo is half of a two-repo system.** Read **`Master_Build_Plan.md`** (controlling document) and **`SYNC_GATE.md`** before making any change. Generic code here propagates to client repos (first client: [`nafew0/applelab`](https://github.com/nafew0/applelab)); generic improvements made in client repos get harvested back. Every phase of work ends with the **Sync Gate**.

## What this template provides (roadmap: see Master_Build_Plan.md)

| Area | Status |
|---|---|
| BP-0 — SaaS-stripped foundation: JWT auth, staff accounts, custom React admin shell, Celery/Redis, email infra, Playwright + CI harness | ✅ this phase |
| BP-1 — Theme token system (per-client re-theming) + UI primitives + styleguide | ✅ |
| BP-2 — i18n infrastructure (next-intl, locale-routed public site, EN/BN example) | ✅ |
| BP-3 — `content` app (SiteConfig, Services, Testimonials, FAQs, Team) + public shell + demo site | ✅ |
| BP-4 — `leads` app: pipeline stages, capture API, attribution, notifications, WhatsApp, kanban admin | ✅ |
| BP-5+ — funnel section kit, Meta Pixel/CAPI marketing module, drip sequences, booking-lite | planned |

## Stack

- **Backend:** Django 5.2, DRF, SimpleJWT (HttpOnly refresh cookie), PostgreSQL 16, Redis (optional in dev), Celery
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 3.4, shadcn/ui, TanStack Query/Table, Recharts, Lucide
- **Testing:** pytest + pytest-django, ESLint, **Playwright** e2e (`frontend/e2e/`)
- **CI:** GitHub Actions (`.github/workflows/ci.yml`) — backend, frontend, e2e jobs; red CI blocks all further phases

## Layout

```
backend/
├── bp_company/       # Django project (settings, urls, celery, audit)
├── accounts/         # Auth, users, staff admin API (/api/auth/*, /api/admin/*)
└── contrib/payments/ # Archived bKash service files (not importable; for a future deposits feature)
frontend/
├── src/app/          # Routes: / · /login · /dashboard · /profile · /admin/* · auth flows
├── src/views/        # Page components (admin panel under views/admin/)
├── src/services/     # Axios API clients (JWT auto-refresh)
├── src/components/   # Navbar, route guards, shadcn/ui
└── e2e/              # Playwright specs
```

There is **no public user registration and no subscriptions/payments surface** — visitors are anonymous; staff accounts are provisioned by admins (`createsuperuser`, then Admin → Users).

## Getting started

See **`QUICKSTART.md`**. TL;DR: create a Postgres DB, `backend/.env` from `.env.example`, `migrate` + `createsuperuser` + `runserver`; `frontend/.env` from `.env.example`, `npm install` + `npm run dev`; log in at `http://localhost:3000/login` → `/admin`.

## Working agreement (for humans and AI coding agents)

1. One phase at a time, in `Master_Build_Plan.md` order; a phase is done only when its **DoD and the Sync Gate** pass.
2. Commit prefixes: `[generic]` / `[applelab]` / `[sync]` — never mixed.
3. No client strings, colors, or model names in template code — the neutral demo theme must always work.
4. Tests are not optional: pytest + build/lint + the phase's Playwright specs, green in CI, in both repos.
5. Update `SYNC_LOG.md` with every propagation.

## Starting a new client site

```bash
./setup.sh
```

The generator asks for a project name, display name, directory, and database, then produces a fully renamed, ready-to-run project (like the old `{{PROJECT_NAME}}` template, but generated from this **living, tested** tree — substitution happens at generation time, so the template itself keeps its 188 backend tests + Playwright suite running in CI). It copies the tree, renames the Django package and every `bp_company`/`bp-company`/`BP-Company` reference, generates `.env` files with fresh secrets, creates the database, installs backend+frontend dependencies, migrates, seeds the pipeline stages (demo content optional), and initializes a git repo with a `template` remote pointing back here (baseline recorded in `TEMPLATE_VERSION` + `SYNC_LOG.md`).

Non-interactive: `./setup.sh --name acmeco --display "AcmeCo" --dir ../acmeco --db-name acmeco_db --db-user "$(whoami)" --db-password "" [--origin <git-url>] [--seed-demo] [--skip-install] [--no-db] [--force] [--recreate-db]`

Existing targets are handled safely: an existing **directory** prompts *"continue and overwrite?"* (interactive) or requires `--force` — only generated files (`backend/`, `frontend/`, template docs) are replaced, your own files, git history and `SYNC_LOG.md` are kept; an existing **database** prompts *"drop and recreate?"* or requires `--recreate-db`, otherwise it is used as-is with a stale-tables warning. Guards refuse `/`, `$HOME`, the template folder itself, and any parent folder of the template.

Then: re-theme `frontend/src/theme/tokens.css`, set locales in `frontend/src/i18n/config.ts`, configure SiteConfig, and build funnels on the section kit. Checklist polish lands in BP-9.
