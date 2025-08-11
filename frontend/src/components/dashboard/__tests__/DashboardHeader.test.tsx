import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { DashboardHeader } from '../DashboardHeader'

// Mock realtime indicator to avoid hooks and side-effects
vi.mock('../../realtime/RealtimeStatusIndicator', () => ({
  __esModule: true,
  RealtimeStatusIndicator: () => <div data-testid="realtime-indicator" />,
}))

// Mock lucide-react icons as simple spans
vi.mock('lucide-react', () => ({
  __esModule: true,
  Bell: (props: any) => <span aria-label="bell" {...props} />,
  Search: (props: any) => <span aria-label="search" {...props} />,
  Settings: (props: any) => <span aria-label="settings" {...props} />,
  User: (props: any) => <span aria-label="user" {...props} />,
}))

describe('DashboardHeader', () => {
  it('renders title and controls', () => {
    render(<DashboardHeader />)

    expect(screen.getByText('GoMafia Insights')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search players, tournaments...')).toBeInTheDocument()
    expect(screen.getByTestId('realtime-indicator')).toBeInTheDocument()
  })
})
