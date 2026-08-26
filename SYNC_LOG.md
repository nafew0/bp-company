# Sync Log — bp-company

Ledger of generic-code propagation between `bp-company` (template) and `applelab` (client #1).
See `SYNC_GATE.md` for the protocol. Statuses: `synced` / `PENDING` / `n/a`.
A Sync Gate cannot pass while a `PENDING` row exists for the phase being closed.

| Date | Phase | Commit(s) | Description | Class | Direction | Status |
|------|-------|-----------|-------------|-------|-----------|--------|
| 2026-08-27 | BP-0 | (baseline) | Pristine SaaS boilerplate import; applelab repo does not exist yet | generic | — | n/a |
| 2026-08-27 | BP-0 | backend strip | Removed subscriptions app/Stripe/bKash; user-stats admin dashboard; bKash archived to contrib/payments; rename sweep; pytest 61 green | generic | — (no client repo yet; AL-0 clones from here) | n/a |
| 2026-08-27 | BP-0 | frontend strip | Removed pricing/register/payments/subscription UI + Stripe CSP; placeholder Home; staff Dashboard; lint+build green | generic | — (no client repo yet) | n/a |
| 2026-08-27 | BP-0 | harness | Playwright e2e (5 smoke specs), seed_e2e, CI workflows, sync protocol docs (SYNC_GATE, PR template), README/QUICKSTART rewrite | generic | — (no client repo yet) | n/a |
| 2026-08-27 | BP-1 | theme+kit | Theme token system (tokens.css + Tailwind preset), site kit primitives (Button/Section/Container/Eyebrow/Card/Reveal/Divider/forms/Stepper), /styleguide route (env-gated), 6 styleguide e2e specs | generic | — (no client repo yet; AL-0 re-themes tokens.css) | n/a |
| 2026-08-27 | BP-2 | i18n | next-intl infra: src/i18n (config/routing/request/navigation), middleware (public-only matcher), messages en+bn, [locale] segment + LocaleFrame (lang + alt-script font), LanguageToggle, 6 i18n e2e specs | generic | — (no client repo yet; AL-0 fills bn.json + Bengali font) | n/a |
| 2026-08-27 | BP-3 | content backend | content app: SiteConfig singleton, Service/Testimonial/FAQItem/TeamMember, bilingual APIs (?lang + EN fallback, Cache-Control), contact endpoint (honeypot + 5/hr throttle + fail-safe email), seed_demo (Acme Services), 39 tests (suite: 100) | generic | — (no client repo yet) | n/a |
| 2026-08-27 | BP-3 | public shell + home | SiteNavbar (dialog drawer) + SiteFooter, section kit (Hero/Services/Testimonials/Faq/Contact), ContactForm, MapEmbed (click-to-load, CSP delta frame-src google), FaqAccordion, social SVG icons, content fetchers (fail-soft, ISR 60s), seo.ts (hreflang/LocalBusiness JSON-LD), sitemap/robots, 8 content e2e specs (suite: 25) | generic | — (no client repo yet) | n/a |
