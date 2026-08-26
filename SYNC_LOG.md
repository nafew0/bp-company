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
