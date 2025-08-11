import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { RealtimeErrorBoundary } from '../../realtime/RealtimeErrorBoundary'

// Mock framer-motion minimal to avoid animation overhead
vi.mock('framer-motion', () => ({
  __esModule: true,
  motion: {
    div: (props: any) => <div {...props} />,
    span: (props: any) => <span {...props} />,
    button: (props: any) => <button {...props} />,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// lucide-react icons can be mocked as simple spans
vi.mock('lucide-react', () => ({
  __esModule: true,
  AlertTriangle: (props: any) => <span aria-label="alert-icon" {...props} />,
  RefreshCw: (props: any) => <span aria-label="refresh-icon" {...props} />,
  Wifi: (props: any) => <span aria-label="wifi-icon" {...props} />,
  WifiOff: (props: any) => <span aria-label="wifioff-icon" {...props} />,
  Bug: (props: any) => <span aria-label="bug-icon" {...props} />,
  Settings: (props: any) => <span aria-label="settings-icon" {...props} />,
  ChevronDown: (props: any) => <span aria-label="chevron-down" {...props} />,
  ChevronUp: (props: any) => <span aria-label="chevron-up" {...props} />,
}))

function Bomb() {
  throw new Error('Boom!')
}

describe('RealtimeErrorBoundary', () => {
  it('renders fallback UI when child throws', () => {
    render(
      <RealtimeErrorBoundary componentName="TestComponent">
        <Bomb />
      </RealtimeErrorBoundary>
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/Real-time Component Error/i)).toBeInTheDocument()
    expect(screen.getByText(/TestComponent encountered an error/i)).toBeInTheDocument()
  })
})
