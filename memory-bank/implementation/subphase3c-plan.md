# Sub-phase 3C — Testing & Production Readiness Bootstrap (PLAN)

**Objective**
- Make dashboard components production-ready by adding CI gates, deterministic smoke e2e tests, a canary/preview validation flow, minimal telemetry, and a short `DEPLOYMENT.md`.

**Scope**
- CI: lint → unit tests (Vitest) → build → publish preview → Playwright e2e → optional canary evaluation
- Tests: deterministic Vitest smoke tests + Playwright preview e2e (OverviewCards, ChartGrid, RecentActivity, RealtimeErrorBoundary)
- Observability: minimal telemetry abstraction and a lightweight synthetic healthcheck for canary evaluation

**Deliverables**
- `.github/workflows/ci.yml` (CI: lint, test, build, publish preview, run e2e)
- `frontend/playwright.config.ts` and `frontend/e2e/*` Playwright tests
- `frontend/src/lib/telemetry.ts` (stub abstraction)
- `scripts/canary-healthcheck.sh` (synthetic healthcheck for canary validation)
- `DEPLOYMENT.md` (short runbook + env vars checklist)
- `memory-bank/implementation/subphase3c-plan.md` (this document)

**Implementation Steps (high level)**
1. Ensure Vitest CI script exists (`npm run test:ci`) and `vitest.config.ts` is CI-friendly.
2. Add Playwright and `test:e2e` script; configure `playwright.config.ts` to use `PREVIEW_URL` as baseURL.
3. Create small deterministic Playwright tests that run against preview builds (mock external realtime and API where necessary).
4. Add CI workflow that builds the app, publishes a preview URL (platform-specific), and runs Playwright e2e against that preview.
5. Add `scripts/canary-healthcheck.sh` to validate preview/canary health and run it as part of the canary job.
6. Add `frontend/src/lib/telemetry.ts` stub and wire it to `RealtimeErrorBoundary` (captureError/reportError hooks).
7. Create `DEPLOYMENT.md` with env vars, build steps, healthcheck URL, and rollback notes.
8. Run CI, iterate on flaky tests and minimal lint/TS fixes if surfaced.

**Checklist**
- [ ] Confirm `test:ci` and `test:e2e` npm scripts
- [ ] Add Playwright config & minimal test suite (OverviewCards, ChartGrid, RecentActivity, RealtimeErrorBoundary)
- [ ] Create `.github/workflows/ci.yml` to run lint → test:ci → build → publish preview → test:e2e
- [ ] Add `scripts/canary-healthcheck.sh` and integrate into canary job
- [ ] Add `frontend/src/lib/telemetry.ts` and wire error capture in `RealtimeErrorBoundary`
- [ ] Create `DEPLOYMENT.md` (env vars + runbook)
- [ ] Verify CI passes and canary evaluation works (auto-rollback on threshold breach)

**Estimates**
- Playwright + tests: 2–3 hours
- CI preview + e2e integration: 1–2 hours (platform-dependent)
- Telemetry stub + wiring: 30–60 minutes
- Healthcheck & runbook: 30–45 minutes

**Risks & Mitigations**
- Flaky e2e due to network/realtime: mitigate with request interception and deterministic fixtures
- CI duration increase: run Playwright only for PRs to main or on-demand for longer runs
- Platform preview integration: if preview API not available, run Playwright against a published preview URL provided by the deployment platform or run a local static preview step

**Next Mode**: IMPLEMENT — create/commit CI workflow, Playwright tests, telemetry stub, and canary healthcheck; iterate until CI is stable.
