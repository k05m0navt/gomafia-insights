# Bug Fix Archive: Framer Motion Test Mock Cleanup

## Metadata
- **Complexity**: Level 1
- **Type**: Test Hygiene
- **Date Completed**: 2025-08-12

## Summary
Tests emitted React DOM prop warnings due to motion-only props being passed to DOM nodes. Implemented a global mock in `frontend/src/setupTests.ts` to strip motion-only props and removed a conflicting per-test mock.

## Implementation
- Global mock for `framer-motion` in test setup:
  - Proxies `motion.*` to simple elements via `forwardRef`
  - Strips props: `whileHover`, `whileTap`, `initial`, `animate`, `exit`, `transition`, `layout`, `variants`
  - Provides `AnimatePresence`/`LayoutGroup` as fragment wrappers
  - Typed `GenericProps`, added display names for ESLint compliance
- Removed local per-test framer-motion mock to ensure global mock applies everywhere

## Files Changed
- `frontend/src/setupTests.ts`: add global framer-motion mock (typed, with display names)
- `frontend/src/components/realtime/__tests__/RealtimeErrorBoundary.test.tsx`: remove local mock

## Testing
- `npm run test`: PASS with zero React DOM prop warnings
- `npm run build`: PASS, ESLint satisfied

## References
- Reflection: `memory-bank/reflection-level1-framer-motion-test-mock-cleanup.md`
