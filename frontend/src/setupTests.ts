import '@testing-library/jest-dom'

// Silence framer-motion animation warnings in tests by reducing motion
// and avoiding timing flakiness
export const reduceMotion = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// Mock react-hot-toast to avoid DOM side effects in unit tests
vi.mock('react-hot-toast', () => {
  const mockFn = Object.assign(() => {}, {
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  })
  return {
    __esModule: true,
    default: mockFn,
  }
})
