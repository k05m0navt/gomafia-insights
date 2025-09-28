# Archive: Level 2 — Dashboard Charts Timeframe Controls (7/30/90)

## Summary
Implemented an accessible timeframe selector in `ChartGrid` and wired API fallbacks to honor 7/30/90-day selection when realtime is disconnected. Improved loading overlays and resolved update-loop issues.

## Scope
- Type: Level 2 (Simple Enhancement)
- Components:
  - `frontend/src/components/dashboard/ChartGrid.tsx`
  - `frontend/src/hooks/useRealtime.ts`
  - `frontend/src/lib/realtime.ts`
  - `frontend/src/components/dashboard/RecentActivity.tsx`

## Key Changes
- Added timeframe selector (7/30/90) with ARIA and keyboard support.
- `useDashboardCharts(timeframe)` used for API fallback when offline.
- Unified loading overlays via `effectiveIsUpdating`.
- Fixed maximum update depth errors by:
  - Using handler refs in `useRealtime` to avoid resubscribe loops.
  - Batching Zustand updates with a cross-env scheduler (rAF in browser, setTimeout in SSR).
  - Refactoring `RecentActivity` update tracking to use refs and avoid redundant Set updates.

## Validation
- Tests: PASS
- Build: PASS
- SSR safety: Confirmed (no rAF usage on server paths).

## Risks & Notes
- Potential flicker on rapid timeframe changes mitigated by overlay; consider transition smoothing if needed.
- Future enhancement: global timeframe control in header.

## Links
- Reflection: `memory-bank/reflection-level2-dashboard-charts-timeframe-controls.md`
- Related APIs: `/api/dashboard/charts?timeframe=...`

