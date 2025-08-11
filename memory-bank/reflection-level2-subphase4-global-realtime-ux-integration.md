# Task Reflection: Level 2 — Sub-phase 4 Global Realtime UX Integration

## Summary
Implemented safe, user-visible realtime integration across the app. Introduced a lazy Supabase client (`getSupabase()`), guarded all realtime store methods, added a client-only bootstrap to auto-connect on mount, and injected it into `app/layout.tsx`. Existing `RealtimeStatusIndicator` now reflects connection state reliably. Test suite passes and production build is clean, even when Supabase env vars are absent.

## What Went Well
- Lazy client pattern removed build-time/env coupling and prevented SSR crashes
- Minimal, targeted edits: store guards and a small bootstrap provider
- Clean CI signals: `npm run test` and `npm run build` both green

## Challenges
- Avoiding SSR import side effects from the Supabase client
- Ensuring unsubscribe/removeChannel calls are safe when client is unavailable
- Keeping the header UX minimal while surfacing controls

## Solutions
- Replaced top-level client export with `getSupabase()` and in-method resolution
- Guarded `connect/subscribe/unsubscribe` paths; degrade to status='error' with a friendly message if unconfigured
- Added `'use client'` to hooks and created `RealtimeBootstrap` for client-only auto-connect

## Lessons Learned
- Top-level env validation in shared libs is risky for Next 15 + React 19; prefer lazy init
- Client/server boundaries must be explicit for third-party SDKs
- Small bootstrap providers are a clean way to initialize cross-cutting services

## Process Improvements
- Standardize a "lazy external client + bootstrap" checklist for SDK integrations
- Add a default guard pattern for unsubscribe paths across realtime modules

## Technical Improvements
- Consider extracting a tiny connection-state selector hook to reduce re-renders in indicator consumers
- Convert metadata viewport/themeColor to Next 15 `generateViewport` to remove build warnings

## Next Steps
- Archive this sub-phase and move to the next roadmap item
- Add a small visual regression test or Storybook story for the status indicator (optional)

## Validation
- Tests: PASS (2/2)
- Build: PASS (clean)
- UX: Indicator displays status and controls without regressions
