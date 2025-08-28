# TASKS.MD - SOURCE OF TRUTH

## PROJECT STATUS
- Status: COMPLETE
- Current Mode: ARCHIVE
- Current Phase: Phase 4B - Dashboard Component Real-time Integration (Analytics Wiring)
- Next Step: NONE

## ACTIVE TASK - LEVEL 2 - Dashboard Analytics MVP (API Wiring Fallback)
- Task: Wire dashboard KPIs, charts, and activity feed to existing Next API routes using React Query when realtime is disconnected or unavailable
- Priority: HIGH
- Status: ARCHIVED

## DESCRIPTION
Provide reliable data to the dashboard by fetching from `/api/dashboard/*` when realtime (Supabase) is not connected. Preserve realtime when available; otherwise, auto-fallback to API data with smooth UI.

## COMPLEXITY
- Level: 2 (Simple Enhancement)
- Type: Enhancement (data wiring + fetch hooks)

## TECHNOLOGY STACK
- Framework: Next.js 15 (React 19)
- Language: TypeScript 5
- Data Fetching: React Query (@tanstack/react-query) — already installed
- API: Next app routes

## TECHNOLOGY VALIDATION CHECKPOINTS
- [x] React Query present in dependencies
- [x] API routes exist: `stats`, `charts`, `activity`
- [x] Test/build baseline green (`npm run test`, `npm run build` passed)
- [x] No SSR crash risk (Supabase lazy client confirmed)

## REQUIREMENTS
- **Fallback logic**: If `isConnected === false` or no realtime data, fetch from API
- **KPI mapping**: Use `stats` fields: `totalPlayers`, `totalGames`, `activeTournaments` → map to UI; use `averageElo` as `%` placeholder for Win Rate
- **Charts mapping**: Convert `charts` response `{labels, values}` into Chart.js datasets
- **Activity mapping**: Use `activity.activities[]`; format `time` human-readable
- **UX**: Keep animations/spinners; no layout shifts

## AFFECTED FILES / LOCATIONS
- Add: `frontend/src/lib/api.ts` (fetch helpers)
- Add: `frontend/src/hooks/useDashboardData.ts` (React Query hooks)
- Edit: `frontend/src/components/dashboard/OverviewCards.tsx` (fallback to `useDashboardStats`)
- Edit: `frontend/src/components/dashboard/ChartGrid.tsx` (fallback to `useDashboardCharts`)
- Edit: `frontend/src/components/dashboard/RecentActivity.tsx` (fallback to `useRecentActivity`)

## IMPLEMENTATION PLAN
1) Data layer
   - Create `lib/api.ts` with:
     - `getDashboardStats()` → GET `/api/dashboard/stats`
     - `getDashboardCharts(params)` → GET `/api/dashboard/charts?timeframe=...`
     - `getRecentActivity(params)` → GET `/api/dashboard/activity?limit=...`
2) Hooks
   - Create `hooks/useDashboardData.ts` with React Query hooks:
     - `useDashboardStats()` (staleTime 15s)
     - `useDashboardCharts(timeframe=30)` (staleTime 30s)
     - `useRecentActivity(limit=10)` (staleTime 15s)
3) Component wiring
   - `OverviewCards`: when `!isConnected || !metrics`, use `stats` values; format numbers with locale
   - `ChartGrid`: when `!isConnected || !realtimeChartData`, build Chart.js datasets from API `{labels, values}`
   - `RecentActivity`: when `!isConnected || realtimeActivities.length===0`, use API activities; format time
4) Testing & validation
   - Smoke: render components with mocked disconnected state and ensure API data appears
   - Build: `npm run build` remains clean

## CHECKLIST
- [x] API helpers created (`lib/api.ts`)
- [x] React Query hooks created (`hooks/useDashboardData.ts`)
- [x] `OverviewCards` uses API fallback
- [x] `ChartGrid` uses API fallback
- [x] `RecentActivity` uses API fallback
- [x] Tests/build pass

## DEPENDENCIES
- Existing: React Query, Next API routes, realtime store/hooks
- No new npm packages expected

## RISKS & MITIGATIONS
- API shape mismatch with chart components
  - Mitigation: centralize conversion in hooks; add defensive defaults
- Time formatting differences
  - Mitigation: use `toLocaleTimeString()`; fallback labels
- Double-fetch when realtime toggles rapidly
  - Mitigation: React Query dedup + short stale times

## SUCCESS CRITERIA
- Dashboard shows live data when realtime available; shows API data otherwise
- Smooth UX with minimal placeholders
- Clean tests and build

## PLAN VERIFICATION
- Requirements documented: YES
- Technology stack validated: YES
- Affected components identified: YES
- Implementation steps detailed: YES
- Dependencies documented: YES
- Challenges & mitigations documented: YES
- Creative phases required: NO (Level 2)
- tasks.md updated with plan: YES

## Reflection Highlights
- **What Went Well**: Clean separation (API helpers/hooks), smooth UX, green build/tests
- **Challenges**: Chart dataset mapping, duplicate fetch avoidance, SSR safety
- **Lessons Learned**: Centralized conversions, tuned staleTime, lazy Supabase client
- **Next Steps**: Fix metadata warnings; expand tests for API fallback

- **RecentActivity**: Resolved hydration mismatch by using deterministic time formatting (formatTime helper)


## MODE TRANSITION
- Recommendation: IMPLEMENT MODE (Level 2)

## ARCHIVE
- Date: 2025-08-12
- Archive Document: [docs/archive/level2-dashboard-analytics-api-fallback_20250812.md](../docs/archive/level2-dashboard-analytics-api-fallback_20250812.md)
- Status: COMPLETE

## Reflection Highlights
- **What Went Well**: Warning removed; clean flat config; build remains green
- **Challenges**: Ensuring ignores don’t mask source files
- **Lessons Learned**: Flat config requires migrating all ignore patterns; keep scopes tight
- **Next Steps**: Monitor lint coverage on `src/**`; consider adding `npm run lint` in CI

## ACTIVE TASK - LEVEL 1 - ESLint Ignore Migration to Flat Config
- Task: Migrate legacy `.eslintignore` patterns into `eslint.config.mjs` `ignores` array and remove `.eslintignore` to eliminate deprecation warning
- Priority: MEDIUM
- Status: COMPLETE

## Reflection Highlights
- **What Went Well**: Warning removed; clean flat config; build remains green
- **Challenges**: Ensuring ignores don’t mask source files
- **Lessons Learned**: Flat config requires migrating all ignore patterns; keep scopes tight
- **Next Steps**: Monitor lint coverage on `src/**`; consider adding `npm run lint` in CI


## DESCRIPTION
Next.js build logs an ESLintIgnoreWarning because `.eslintignore` is no longer supported with flat config. Consolidate all ignore patterns into `eslint.config.mjs` and remove the legacy file.

## COMPLEXITY
- Level: 1 (Quick Fix)
- Type: Build Quality / Tooling Hygiene

## TECHNOLOGY STACK
- Framework: Next.js 15 (React 19)
- Linting: ESLint 9 (flat config)
- Language: TypeScript 5

## TECHNOLOGY VALIDATION CHECKPOINTS
- [x] `.eslintignore` patterns captured and added to `eslint.config.mjs` `ignores`
- [x] `.eslintignore` removed from repo
- [x] `npm run lint` passes locally (if configured) or `next build` shows no ESLintIgnoreWarning
- [x] `npm run build` passes

## AFFECTED FILES / LOCATIONS
- Edit: `frontend/eslint.config.mjs` (extend `ignores`)
- Remove: `frontend/.eslintignore`

## IMPLEMENTATION PLAN
1) Review existing `eslint.config.mjs` ignores and merge patterns from `.eslintignore`:
   - Add: `"src/generated/**/*"` (already present), `"**/prisma/**/*"`, `"**/*.generated.*"`, `"**/wasm*.js"`, `"node_modules/**/*"`, `"dist/**/*"`, `.DS_Store`, `"*.log"`
   - Keep existing: `"public/workers/**/*"`, `.next/**/*`, `out/**/*`, `build/**/*`
2) Remove `frontend/.eslintignore` file from the repo
3) Run `npm run build` to ensure the warning disappears and build remains green
4) Commit changes with message: "chore(eslint): migrate .eslintignore patterns to flat config and remove legacy file"

## CHECKLIST
- [x] Ignore patterns merged into flat config
- [x] `.eslintignore` removed
- [x] Build passes without ESLintIgnoreWarning

## DEPENDENCIES
- None

## RISKS & MITIGATIONS
- Risk: Over-ignoring source files (e.g., entire `prisma/` directory)
  - Mitigation: Limit to generated or non-source paths when possible; verify lint coverage on `src/**`

## SUCCESS CRITERIA
- No ESLintIgnoreWarning during `next build`
- Lint/build remains green

## PLAN VERIFICATION
- Requirements documented: YES
- Technology stack validated: YES
- Affected components identified: YES
- Implementation steps detailed: YES
- Dependencies documented: YES
- Challenges & mitigations documented: YES
- Creative phases required: NO (Level 1)
- tasks.md updated with plan: YES

## MODE TRANSITION
- Recommendation: IMPLEMENT MODE (Level 1)


## ARCHIVE — Level 1 ESLint Ignore Migration
- Date: 2025-08-12
- Archive Document: [docs/archive/level1-eslint-ignore-migration_20250812.md](../docs/archive/level1-eslint-ignore-migration_20250812.md)
- Status: COMPLETED

## ACTIVE TASK - LEVEL 1 - Framer Motion Test Mock Cleanup
- Task: Eliminate React DOM prop warnings in tests by refining `framer-motion` mock to strip motion-only props (`whileHover`, `whileTap`, `initial`, `animate`, `exit`, `layout`, `transition`) before rendering DOM nodes.
- Priority: LOW
- Status: COMPLETE

## DESCRIPTION
Current unit tests pass but emit warnings like: "React does not recognize the `whileHover`/`whileTap` prop on a DOM element" due to the test mock mapping `motion.*` to plain DOM elements and spreading all props. Update the mock to omit motion-only props to keep test output clean.

## COMPLEXITY
- Level: 1 (Quick Fix)
- Type: Test Hygiene

## TECHNOLOGY STACK
- Test Runner: Vitest 2 (jsdom)
- Library: framer-motion

## TECHNOLOGY VALIDATION CHECKPOINTS
- [x] Centralized mock in `src/setupTests.ts` for `framer-motion`
- [x] Mock strips motion-only props safely
- [x] All tests still pass with zero React DOM prop warnings

## AFFECTED FILES / LOCATIONS
- Edit: `frontend/src/setupTests.ts` (add `framer-motion` mock that omits motion props)
- Optional: Remove per-test `framer-motion` mocks in `__tests__` if redundant

## IMPLEMENTATION PLAN
1) In `src/setupTests.ts`, add a `vi.mock('framer-motion', ...)` that:
   - Exposes `AnimatePresence` passthrough
   - Maps `motion.*` to components that forwardRefs to simple elements while omitting motion props
   - Omits props: `whileHover`, `whileTap`, `initial`, `animate`, `exit`, `transition`, `layout`
2) Ensure typings are lenient in tests (use `any` where needed) to avoid TS friction.
3) Run `npm run test` and confirm no warnings; keep tests green.
4) If any test defines its own `framer-motion` mock, consider removing or letting global mock override it.

## CHECKLIST
- [x] Global mock implemented in `setupTests.ts`
- [x] Test suite passes
- [x] No React DOM prop warnings in test output

## RISKS & MITIGATIONS
- Risk: Different tests rely on specific motion behavior
  - Mitigation: Keep animations disabled and only strip props; do not change layout/DOM shape

## SUCCESS CRITERIA
- Tests pass cleanly with zero React DOM prop warnings


## REFLECTION HIGHLIGHTS
- **What Went Well**: Global mock eliminated warnings; typings fixed; build clean.
- **Challenges**: Competing local mock; ESLint typing rules.
- **Lessons Learned**: Centralize mocks; add displayName; avoid `any`.
- **Next Steps**: None.

## PLAN VERIFICATION
- Requirements documented: YES
- Technology stack validated: YES
- Affected components identified: YES
- Implementation steps detailed: YES
- Dependencies documented: YES
- Challenges & mitigations documented: YES
- Creative phases required: NO (Level 1)
- tasks.md updated with plan: YES


## ARCHIVE — Level 1 Framer Motion Test Mock Cleanup
- Date: 2025-08-12
- Archive Document: [docs/archive/level1-framer-motion-test-mock-cleanup_20250812.md](../docs/archive/level1-framer-motion-test-mock-cleanup_20250812.md)
- Status: COMPLETED

## MODE TRANSITION
- Recommendation: IMPLEMENT MODE (Level 1)

- Status: COMPLETE

## Reflection Highlights (Timeframe Controls)
- **What Went Well**: Accessible selector; clean data wiring; green build/test; SSR-safe scheduler.
- **Challenges**: Update depth loops; SSR rAF usage.
- **Lessons Learned**: Use handler refs; batch store updates; guard effects with refs.
- **Next Steps**: Optional global selector; add e2e smoke for timeframe.

## Status
- [x] Implementation complete
- [x] Reflection complete
- [x] Archiving

## ARCHIVE — Level 2 Dashboard Charts Timeframe Controls
- Date: 2025-08-12
- Archive Document: [docs/archive/level2-dashboard-charts-timeframe-controls_20250812.md](../docs/archive/level2-dashboard-charts-timeframe-controls_20250812.md)
- Status: COMPLETED
## Sub-phase 3C — Testing & Production Readiness Bootstrap

## Description
Bootstrap testing and production-readiness for Phase 4B dashboard components (OverviewCards, ChartGrid, RecentActivity, RealtimeErrorBoundary). Ensure build & tests are robust, lint issues resolved, and production config / monitoring basics are in place.

## Complexity
Level: 2 (Enhancement)
Type: Testing & Production Readiness

## Technology Stack
- Framework: Next.js 15 (React 19)
- Language: TypeScript 5
- Testing: Vitest (jsdom) + React Testing Library
- Data Fetching: React Query
- Build: Next build

## Technology Validation Checkpoints
- [ ] npm ci installs cleanly
- [ ] npm run build completes without errors
- [ ] npm run test passes headless
- [ ] ESLint configured and npm run lint passes or agreed exception documented
- [ ] Minimal smoke e2e (Playwright / Cypress) runs or documented alternative

## Status
- [x] Initialization complete
- [ ] Planning complete
- [ ] Technology validation complete
- [ ] Implementation steps

## Implementation Plan
1. Testing baseline & CI
   - [ ] Add/confirm vitest config for CI (headless, reporters)
   - [ ] Add npm run test:ci script (headless + coverage)
   - [ ] Create smoke test(s) for OverviewCards, ChartGrid, RecentActivity rendering with both realtime and API fallback
   - [ ] Add test that mounts RealtimeErrorBoundary with simulated error and verifies fallback UI

2. Build & lint gates
   - [ ] Run npm run build locally and surface any TypeScript/ESLint errors
   - [ ] Resolve remaining ESLint errors; for Supabase/type conflicts, document minimal ESLint exception with rationale
   - [ ] Add GitHub Actions workflow that runs: npm ci, npm run lint, npm run test:ci, npm run build

3. Monitoring & telemetry bootstrap
   - [ ] Add basic client-side error reporting hook (stub) wired to RealtimeErrorBoundary (no external provider required — abstraction only)
   - [ ] Ensure performance monitor and connection pool expose basic metrics for production (sampling enabled/disabled via env)

4. Release config & docs
   - [ ] Validate next.config.ts production settings (compress, image settings)
   - [ ] Add short DEPLOYMENT.md checklist for production rollout steps and required env vars

5. Verification & regression
   - [ ] Run smoke CI on a feature branch; fix regressions
   - [ ] Confirm dashboard shows realtime when connected and API fallback when disconnected (manual/automated check)

## Subtasks (30–60 min each)
- Run full npm ci && npm run build && npm run test
- Create/extend vitest smoke tests for key components
- Fix ESLint/TS failures surfaced by build
- Add CI workflow file
- Create DEPLOYMENT.md with env var checklist
- Add small telemetry/error-reporting abstraction

## Dependencies
- Existing Next API routes (/api/dashboard/*)
- React Query provider in layout (already present)
- Current performance/monitoring primitives (sampling toggle)

## Challenges & Mitigations
- **Build-blocking ESLint rules from external libs**: Mitigation — document exceptions and prefer minimal config changes; add targeted eslint-disable with comments only where necessary.
- **Flaky tests for realtime behavior**: Mitigation — mock realtime store and add deterministic fixtures; keep e2e smoke minimal.
- **Double-fetch / race conditions**: Mitigation — rely on React Query deduping and short stale times; add test ensuring only one API call per lifecycle.

## Testing Strategy
- Unit + component tests (Vitest + RTL) for core components
- One smoke e2e or headless rendering check for primary flows (connected vs disconnected)
- CI gating: lint → tests → build

## Success Criteria
- CI passes (lint, test, build) on feature branch
- Dashboard displays realtime data when available and API fallback otherwise
- DEPLOYMENT.md created and reviewed
- Minimal telemetry stub wired to RealtimeErrorBoundary

## Creative Phases Required
- [ ] NA (Level 2)

→ NEXT RECOMMENDED MODE: IMPLEMENT MODE


COMPLETED

### Description
Add `data-collection/tools/verify_parsing.py` to fetch live pages or use fixtures, build minimal raw payloads, call model parsers, run `validate_data()`, and print summaries. Must not perform any DB writes.

### Checklist
- [ ] Create `data-collection/tools/verify_parsing.py` (non-destructive)
- [ ] Support flags: `--players`, `--tournaments`, `--fixtures`, `--live`, `--save-html`, `--fail-on-error`
- [ ] Run against sample IDs / fixtures
- [ ] Collect failing HTMLs into `data-collection/tests/fixtures/`
- [ ] Add fixture-based unit tests for edge cases


### REFLECTION: Parser Verification
- Status: REFLECTION COMPLETE (creative->reflect)
- Branch: van/verify-gomafia-parsing-20250828T000000Z
- Notes: Player parsing OK; participant lists require API discovery or JS-rendering.
