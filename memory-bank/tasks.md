# TASKS.MD - SOURCE OF TRUTH

## PROJECT STATUS
- Status: IN_PROGRESS
- Current Mode: PLAN
- Current Phase: Phase 4B - Dashboard Component Real-time Integration (Analytics Wiring)
- Next Step: IMPLEMENT

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


## MODE TRANSITION
- Recommendation: IMPLEMENT MODE (Level 2)

## ARCHIVE
- Date: 2025-08-12
- Archive Document: [docs/archive/level2-dashboard-analytics-api-fallback_20250812.md](../docs/archive/level2-dashboard-analytics-api-fallback_20250812.md)
- Status: COMPLETED

## ACTIVE TASK - LEVEL 1 - ESLint Ignore Migration to Flat Config
- Task: Migrate legacy `.eslintignore` patterns into `eslint.config.mjs` `ignores` array and remove `.eslintignore` to eliminate deprecation warning
- Priority: MEDIUM
- Status: PLANNING

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
- [ ] `.eslintignore` patterns captured and added to `eslint.config.mjs` `ignores`
- [ ] `.eslintignore` removed from repo
- [ ] `npm run lint` passes locally (if configured) or `next build` shows no ESLintIgnoreWarning
- [ ] `npm run build` passes

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
- [ ] Ignore patterns merged into flat config
- [ ] `.eslintignore` removed
- [ ] Build passes without ESLintIgnoreWarning

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
