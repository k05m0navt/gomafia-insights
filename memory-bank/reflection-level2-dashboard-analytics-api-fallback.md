# Task Reflection: Level 2 — Dashboard Analytics MVP (API Wiring Fallback)

## Summary
Implemented API data fallbacks using React Query for KPIs, charts, and activity when realtime is disconnected, preserving realtime behavior when available. Added a React Query provider and non-intrusive wiring in `OverviewCards`, `ChartGrid`, and `RecentActivity`.

## What Went Well
- Clean separation: API helpers + hooks kept components minimal
- Smooth UX: preserved animations with minimal layout shifts
- Stability: tests and production build remained green

## Challenges
- Mapping charts API shape to Chart.js datasets
- Avoiding duplicate fetches during realtime status toggles
- Ensuring SSR-safety with client-only data paths

## Lessons Learned
- Centralized conversion logic prevents UI coupling to API shapes
- Short `staleTime` + disabled queries on realtime connected state keeps traffic efficient
- Lazy Supabase client allowed safe integration without leaking envs to SSR

## Process Improvements
- Add a shared number/date formatting utility for consistent display
- Document API response contracts near `lib/api.ts`

## Technical Improvements
- Consider queryKey scoping per dashboard route to support future params
- Add error boundaries/toasts on API fallback failures

## Next Steps
- Minor: Fix Next metadata viewport/themeColor warnings
- Minor: Expand tests to cover API fallback rendering


## RecentActivity Hydration Fix
- **Summary**: Fixed a React hydration mismatch in `frontend/src/components/dashboard/RecentActivity.tsx` where server and client produced different time strings (e.g., `3:49:50 PM` vs `15:49:50`).
- **Cause**: Locale-dependent `toLocaleTimeString()` used during client-side conversion of timestamps, leading to different string formats between server and client render.
- **Solution**: Introduced a deterministic `formatTime` helper used for activity timestamps and `lastUpdated` to normalize to `HH:MM:SS` (24-hour) format across server and client.
- **Testing**: Ran `npm run build` and verified successful production build; manual sanity check of component rendering in dev.
- **Action Item**: Add centralized `utils/formatting.ts` to share `formatTime` and other locale-safe formatters across dashboard components.
