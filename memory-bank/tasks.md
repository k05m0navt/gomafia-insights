# TASKS.MD - SOURCE OF TRUTH

## PROJECT STATUS
- Status: IN_PROGRESS
- Current Mode: REFLECT
- Current Phase: Phase 4B - Dashboard Component Real-time Integration (Production Readiness)
- Next Step: ARCHIVE

## ACTIVE TASK - LEVEL 2 - Sub-phase 4: Global Realtime UX Integration
- Task: Integrate global connection status UI and controls; initialize realtime connection on app load
- Priority: HIGH
- Status: IMPLEMENTATION COMPLETE → REFLECTION COMPLETE — Ready to ARCHIVE

## TASK OBJECTIVE
- Primary Goal: Make realtime connection state visible and controllable across the app with accessible UX
- Deliverables:
  - `RealtimeStatusIndicator` integrated into `DashboardHeader` and app `layout`
  - Auto-connect on client mount with safe fallback (no env secrets required at build)
  - Connect/Disconnect/Retry controls surfaced in header
  - Non-blocking toasts for connection changes
  - Smoke tests for indicator render and control wiring

## TECHNOLOGY STACK
- Framework: Next.js 15 (React 19)
- Language: TypeScript 5
- State: Zustand realtime store (`useRealtimeStore`)
- Tests: Vitest + React Testing Library (jsdom)

## TECHNOLOGY VALIDATION CHECKPOINTS
- [x] Minimal Hello-world: render indicator in header without runtime errors
- [x] Build config: no SSR import of Supabase; client-only boundaries respected
- [x] Required dependencies present (already in package.json)
- [x] `npm run test` passes
- [x] `npm run build` remains clean

## IMPLEMENTATION PLAN
### 0) Safety & Client Boundary
1. Refactor `frontend/src/lib/supabase.ts` to lazy-init client:
   - Export `getSupabase()` returning a cached client or `null` if env missing
   - Remove top-level `throw`; guard env inside `getSupabase()`
2. Update `frontend/src/lib/realtime.ts` to import `getSupabase` and resolve client inside methods (`connect`, `subscribe`, etc.). If `null`, set `connectionHealth.status='error'` with friendly message and skip.
3. Add `'use client'` to `frontend/src/hooks/useRealtime.ts` to enforce client boundary.

### 1) App Integration
1. Create `frontend/src/components/providers/RealtimeBootstrap.tsx` (client) that calls `connect()` on mount (only if `getSupabase()` resolves).
2. Inject `<RealtimeBootstrap />` in `frontend/src/app/layout.tsx` just before `<Toaster />`.

### 2) Header Controls & UX
1. Ensure `RealtimeStatusIndicator` reflects `connectionHealth.status`, `totalUpdates`.
2. Add actions (Connect/Disconnect/Retry) wired to `useRealtimeConnection()`.
3. Toasts: connection established/closed/error already handled in store; verify messages.
4. Accessibility: labels on buttons, focus management when panel opens.

### 3) Testing
1. `RealtimeStatusIndicator` smoke test: renders for each mocked status.
2. `DashboardHeader` test: indicator present; triggers call mocked actions.
3. Mock hooks via `vi.mock('src/hooks/useRealtime', ...)` to avoid real Supabase.

### 4) Validation
1. Run `npm run test` (passing)
2. Run `npm run build` (clean; no SSR env crashes)

## AFFECTED FILES / LOCATIONS
- Edit: `frontend/src/lib/supabase.ts` (lazy client)
- Edit: `frontend/src/lib/realtime.ts` (use `getSupabase` inside methods)
- Edit: `frontend/src/hooks/useRealtime.ts` (`'use client'`)
- Add: `frontend/src/components/providers/RealtimeBootstrap.tsx` (client)
- Edit: `frontend/src/app/layout.tsx` (inject bootstrap)
- Tests: `frontend/src/components/realtime/__tests__/RealtimeStatusIndicator.test.tsx`, `frontend/src/components/dashboard/__tests__/DashboardHeader.test.tsx`

## DEPENDENCIES
- Existing: Zustand store `useRealtimeStore`, toast system, components above
- No new npm packages expected

## RISKS & MITIGATIONS
- Supabase env missing causes runtime error:
  - Mitigation: lazy `getSupabase()` + guarded connect path; show error in indicator not crash build
- Server/client boundary issues:
  - Mitigation: add `'use client'` to hooks and provider; avoid importing Supabase in server-only files

## SUCCESS CRITERIA
- Visible, accurate connection status in header
- Working controls without regressions
- Clean test and build

## CHECKLIST
- [x] Safety: lazy Supabase client + guards
- [x] Client boundary: `'use client'` added where required
- [x] Bootstrap: auto-connect on mount (client-only)
- [x] Controls: connect/disconnect/retry
- [x] Tests: indicator + header wiring
- [x] Validation: tests and build pass

## PLAN VERIFICATION
- Requirements documented: YES
- Technology stack validated (on paper): YES
- Affected components identified: YES
- Implementation steps detailed: YES
- Dependencies documented: YES
- Challenges & mitigations documented: YES
- Creative phases required: NO (Level 2)
- tasks.md updated with plan: YES

## MODE TRANSITION
- Recommendation: IMPLEMENT MODE (Level 2)


## Reflection Highlights
- **What Went Well**: Lazy client pattern, minimal bootstrap, green CI
- **Challenges**: SSR side effects, safe unsubscribe when client missing
- **Solutions**: Guarded store methods, client-only hook/provider, friendly error state
- **Results**: Tests 2/2 PASS; Next build clean
- **Next Steps**: ARCHIVE NOW
- **Reflection Doc**: [memory-bank/reflection-level2-subphase4-global-realtime-ux-integration.md](reflection-level2-subphase4-global-realtime-ux-integration.md)


## ARCHIVE
- Date: 2025-08-12
- Archive Document: [docs/archive/subphase4-global-realtime-ux-integration_20250812.md](../docs/archive/subphase4-global-realtime-ux-integration_20250812.md)
- Status: COMPLETED
