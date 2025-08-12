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
