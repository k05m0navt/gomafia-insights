import '@testing-library/jest-dom'
import React, { forwardRef, createElement } from 'react'

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

// Mock framer-motion to avoid passing motion-only props to DOM elements
// This prevents warnings like: "React does not recognize the `whileHover` prop on a DOM element"
vi.mock('framer-motion', () => {
  const MOTION_ONLY_PROPS = new Set<string>([
    'whileHover',
    'whileTap',
    'initial',
    'animate',
    'exit',
    'transition',
    'layout',
    'variants',
  ])

  type GenericProps = Record<string, unknown>

  const createMockComponent = (tag: string) => {
    const Comp = forwardRef<unknown, GenericProps>((props, ref) => {
      const restProps: GenericProps = {}
      for (const key in props || {}) {
        if (!MOTION_ONLY_PROPS.has(key)) {
          restProps[key] = props[key]
        }
      }
      return createElement(tag, { ref, ...restProps })
    })
    Comp.displayName = `motion.${tag}`
    return Comp
  }

  const motionProxy: Record<string | symbol, unknown> = new Proxy(
    {},
    {
      get: (_target, prop: string | symbol) => createMockComponent(String(prop)),
    },
  )

  const FragmentWrapper: React.FC<React.PropsWithChildren> = ({ children }) =>
    createElement(React.Fragment, null, children)
  FragmentWrapper.displayName = 'AnimatePresenceMock'

  return {
    __esModule: true,
    AnimatePresence: FragmentWrapper,
    LayoutGroup: FragmentWrapper,
    motion: motionProxy,
    default: motionProxy,
  }
})
