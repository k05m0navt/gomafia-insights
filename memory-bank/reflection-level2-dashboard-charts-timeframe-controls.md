# Task Reflection: Level 2 — Dashboard Charts Timeframe Controls (7/30/90)

## Summary
Added an accessible 7/30/90d timeframe selector to `ChartGrid`, wired React Query API fallback to honor the selected timeframe when realtime is disconnected, and refined loading overlays to avoid flicker. Resolved two update-loop issues in realtime hooks/components.

## What Went Well
- Selector UX: Simple, accessible segmented control with keyboard and ARIA.
- Data wiring: `useDashboardCharts(timeframe)` integrates cleanly with existing fallback path.
- Build/test health: Green after changes; SSR-safe scheduling fix applied.

## Challenges
- Maximum update depth errors from realtime subscriptions and RecentActivity effects.
- SSR build error from direct `requestAnimationFrame` in server context.

## Solutions Applied
- Stored `onUpdate`/`onError` in refs inside `useRealtime` to avoid resubscribe loops and removed them from effect deps.
- Batched Zustand `set()` and throttled callbacks via a cross-environment scheduler (rAF in browser, setTimeout on server).
- Rewrote RecentActivity update-tracking using a ref to previous activities and guarded Set state to prevent redundant updates.

## Key Technical Insights
- Handler refs pattern prevents effect churn with external-stable callbacks.
- Cross-env scheduling avoids SSR pitfalls while preventing nested synchronous updates.
- Comparing activity arrays with ref + shallow checks prevents effect-triggered loops.

## Process Improvements
- Add a checklist to always review effect dependency arrays for stability before merging.
- Prefer refs for transient comparison state to avoid render-triggered loops.
- Include SSR-safety review when using browser-only APIs in shared modules.

## Technical Improvements
- Consider extracting a reusable "stableCallback" helper to memoize/retain latest handlers.
- Add lightweight tests around `useRealtime` to ensure no resubscribe on handler change.

## Next Steps
- Optional: Surface timeframe selector in `DashboardHeader` for global control.
- Add e2e smoke ensuring timeframe 7/30/90 drives API param when offline.

## Time Estimation Accuracy
- Estimated: 1.5h
- Actual: ~2.5h (extra time spent resolving update loop and SSR scheduling)
- Variance: ~+67%
- Reason: Hidden effect dependency and SSR scheduling edge cases.
