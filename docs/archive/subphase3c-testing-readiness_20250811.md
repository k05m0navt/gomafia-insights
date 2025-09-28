# Task Archive: Sub-phase 3C — Testing & Production Readiness Bootstrap (Level 2)

## Metadata
- Complexity: Level 2 (Enhancement)
- Date Completed: 2025-08-11
- Related: Reflection — memory-bank/reflection-level2-subphase3c-testing-production-readiness.md

## Summary
Established unit testing baseline with Vitest + React Testing Library for Next 15/React 19, added jsdom environment and setup, wrote smoke tests for `RealtimeErrorBoundary` and `DashboardHeader`, and verified tests and production build are clean.

## Requirements
- Add test runner and JSDOM environment
- Provide scripts: test, test:watch
- Add at least two smoke tests
- Ensure `next build` remains clean

## Implementation
- Vitest minimal config using esbuild JSX automatic; setup file registered
- PostCSS config updated to object form for Next 15 compatibility
- Excluded test-only files from TS app build to avoid `vi` global leakage

### Key Files
- frontend/vitest.config.ts
- frontend/src/setupTests.ts
- frontend/src/components/realtime/__tests__/RealtimeErrorBoundary.test.tsx
- frontend/src/components/dashboard/__tests__/DashboardHeader.test.tsx

## Testing
- npm run test: 2 passed
- npm run build: successful

## Lessons Learned
- Keep test config minimal; avoid unnecessary plugins
- Align PostCSS config shape with Next 15 expectations
- Keep test-only globals isolated from app TS builds

## References
- Reflection: memory-bank/reflection-level2-subphase3c-testing-production-readiness.md
- Tasks: memory-bank/tasks.md
