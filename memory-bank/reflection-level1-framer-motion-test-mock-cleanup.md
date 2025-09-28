# Bug Fix Reflection: Framer Motion Test Mock Cleanup

## Summary
Tests emitted React DOM prop warnings due to `motion.*` being mapped to DOM elements and passing motion-only props. Implemented a global mock in `frontend/src/setupTests.ts` to strip motion-only props and removed a redundant per-test mock. Ensured typings and display names satisfy ESLint.

## Implementation
- Added global `vi.mock('framer-motion', ...)` that:
  - Proxies `motion.*` to simple elements via `forwardRef`
  - Strips props: `whileHover`, `whileTap`, `initial`, `animate`, `exit`, `transition`, `layout`, `variants`
  - Provides `AnimatePresence`/`LayoutGroup` as fragment wrappers
  - Uses typed `GenericProps` and display names for ESLint compliance
- Removed local framer-motion mock in `RealtimeErrorBoundary.test.tsx` to avoid overrides.

## Testing
- Ran `npm run test`: All tests passed; warnings eliminated.
- Ran `npm run build`: Build passed; ESLint satisfied after typing refinements.

## Additional Notes
- Prefer centralized mocks in `setupTests.ts` to avoid divergence across tests.
- On macOS, prefer Python for complex file edits over BSD `sed` to avoid insertion quirks.
