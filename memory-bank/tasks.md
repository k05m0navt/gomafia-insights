# TASKS.MD - SOURCE OF TRUTH

## PROJECT STATUS
- Status: COMPLETED
- Current Mode: COMPLETED
- Current Phase: Phase 4B - Dashboard Component Real-time Integration (Production Readiness)
- Next Step: VAN

## ACTIVE TASK - LEVEL 2 - Sub-phase 3C Testing & Production Readiness Bootstrap
- Task: Establish unit test infrastructure and initial smoke tests for critical components
- Priority: HIGH
- Status: IMPLEMENTATION COMPLETE → REFLECTION COMPLETE — Ready to ARCHIVE

## TASK OBJECTIVE
- Primary Goal: Add Vitest + React Testing Library setup compatible with Next 15 and React 19
- Deliverables:
  - Test runner and JSDOM environment configured
  - Scripts: test and test:watch
  - Example tests: RealtimeErrorBoundary fallback renders; DashboardHeader renders core UI
  - CI-ready configuration (no interactive steps)

## TECHNOLOGY STACK
- Framework: Next.js 15 (React 19)
- Language: TypeScript 5
- Test Runner: Vitest
- Test Env: jsdom
- UI Testing: @testing-library/react + @testing-library/jest-dom

## TECHNOLOGY VALIDATION CHECKPOINTS
- [x] Technology stack clearly defined
- [ ] Required devDependencies identified and added to package.json
- [ ] Vitest config created with jsdom + setupFiles
- [ ] Hello World test executes (simple React component renders)
- [ ] Test build passes: `npm run test`
- [ ] App build unaffected: `npm run build`

## IMPLEMENTATION PLAN
### Phase 1: Test Infrastructure
1. Add devDependencies:
   - vitest, jsdom, @testing-library/react, @testing-library/jest-dom, @types/testing-library__jest-dom (or ambient types via setup)
2. Create `frontend/vitest.config.ts` with:
   - environment: 'jsdom'
   - setupFiles: ['src/setupTests.ts']
   - include patterns: `['src/**/*.test.{ts,tsx}']`
   - resolve.alias for `@/*` if used
3. Create `frontend/src/setupTests.ts` to extend `expect` with `jest-dom` and RTL config
4. Update `frontend/package.json` scripts:
   - "test": "vitest --run"
   - "test:watch": "vitest"

### Phase 2: Smoke Tests
1. Add `frontend/src/components/realtime/__tests__/RealtimeErrorBoundary.test.tsx`
   - Renders a child that throws → fallback UI visible
2. Add `frontend/src/components/dashboard/__tests__/DashboardHeader.test.tsx`
   - Renders header → asserts title and key controls present

### Phase 3: Validation
1. Run `npm run test` (expect all passing)
2. Run `npm run build` (should remain clean)

## AFFECTED FILES / LOCATIONS
- Config: `frontend/vitest.config.ts`, `frontend/src/setupTests.ts`, `frontend/package.json`
- Tests: 
  - `frontend/src/components/realtime/__tests__/RealtimeErrorBoundary.test.tsx`
  - `frontend/src/components/dashboard/__tests__/DashboardHeader.test.tsx`
- Components under test (no edits expected):
  - `frontend/src/components/realtime/RealtimeErrorBoundary.tsx`
  - `frontend/src/components/dashboard/DashboardHeader.tsx`

## DEPENDENCIES
- devDependencies: vitest, jsdom, @testing-library/react, @testing-library/jest-dom, @types/testing-library__jest-dom

## POTENTIAL CHALLENGES & MITIGATIONS
- Next 15 + ESM with Vitest: use Vitest (not Jest); ensure ESM-compatible imports in config
- React 19 concurrent rendering warnings: use RTL's `render` and await updates; avoid legacy `act` calls
- DOM APIs in tests: jsdom provides `window`/`navigator`; mock timers when necessary
- UI libs (framer-motion, lucide-react, react-hot-toast): for smoke tests, avoid animation timing assertions; mock `react-hot-toast` as needed
- Tailwind classes: not required for behavior; assert text/roles instead of classes

## TESTING STRATEGY
- Scope: Smoke tests to validate baseline rendering and error boundary behavior
- Non-goals: Full interaction/e2e; to be added later (Playwright)

## SUCCESS CRITERIA
- npm run test passes locally (0 failures)
- next build unaffected (no new errors)
- Two smoke tests pass and are stable

## CHECKLIST
- [ ] Infra: devDependencies added
- [ ] Config: vitest.config.ts and src/setupTests.ts created
- [ ] Scripts: test and test:watch added to package.json
- [ ] Tests: RealtimeErrorBoundary smoke test added
- [ ] Tests: DashboardHeader (or OverviewCards) smoke test added
- [ ] Validation: tests and build pass

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
- Recommendation: IMPLEMENT MODE (no creative design needed)

- [x] Infra: devDependencies added
- [x] Config: vitest.config.ts and src/setupTests.ts created
- [x] Scripts: test and test:watch added to package.json
- [x] Tests: RealtimeErrorBoundary smoke test added
- [x] Tests: DashboardHeader (or OverviewCards) smoke test added
- [x] Validation: tests and build pass

## Reflection Highlights
- **What Went Well**: Vitest + RTL configured cleanly with jsdom; two smoke tests added; CI-safe mocks for `react-hot-toast`, `framer-motion`, and `lucide-react`
- **Challenges**: Vite React plugin missing, PostCSS plugin shape errors with Next 15, `vi` type leakage into app build
- **Solutions**: Removed plugin dependency in Vitest config; fixed PostCSS config to object form; excluded tests and `src/setupTests.ts` from TS build
- **Results**: `npm run test` passes (2/2); `npm run build` clean
- **Next Steps**: ARCHIVE NOW
- **Reflection Doc**: [memory-bank/reflection-level2-subphase3c-testing-production-readiness.md](reflection-level2-subphase3c-testing-production-readiness.md)

## ARCHIVE
- Date: 2025-08-11
- Archive Document: [docs/archive/subphase3c-testing-readiness_20250811.md](../docs/archive/subphase3c-testing-readiness_20250811.md)
- Status: COMPLETED
