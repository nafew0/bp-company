## What & why

<!-- Summary of the change and the phase it belongs to (e.g. BP-3, AL-5). -->

## Sync Gate (mandatory — see SYNC_GATE.md / Master_Build_Plan.md §3)

- [ ] Every commit is classified: `[generic]` / `[applelab]` / `[sync]` — none mixed, no unresolved `[generic?]`
- [ ] **Does this PR contain generic changes?** If yes, link the twin commit/PR in the other repo: <!-- link -->
- [ ] Harvested: all `[generic]` work made in the client repo is in `bp-company`
- [ ] Propagated: all template `[generic]` changes are in `applelab` (if it exists)
- [ ] No client strings/colors/model names leaked into template code
- [ ] `SYNC_LOG.md` updated in **both** repos; no `PENDING` rows left for this phase

## Tests

- [ ] `pytest` green
- [ ] `npm run lint` + `npm run build` green
- [ ] Playwright specs for this phase green (`npm run e2e`)
- [ ] Migrations apply on a fresh DB; seeds still run
