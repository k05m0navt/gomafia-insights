import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'

// Mock the realtime hooks
vi.mock('../../hooks/useRealtime', () => ({
  useRealtimeDashboardMetrics: () => ({ metrics: null, isConnected: false, isLoading: false, lastUpdated: null }),
  useRealtimeConnection: () => ({ connectionHealth: { status: 'disconnected' }, isRealTimeEnabled: false, reconnect: vi.fn(), toggleRealTime: vi.fn() }),
  useRealtimeSubscriptions: () => ({ totalUpdates: 0, subscriptionCount: 0 }),
}))

// Mock API hook
vi.mock('@/hooks/useDashboardData', () => ({
  useDashboardStats: () => ({ data: { totalPlayers: 2547, totalGames: 1234, activeTournaments: 89, averageElo: 67.3 } }),
}))

import { OverviewCards } from '../OverviewCards'

describe('OverviewCards (smoke)', () => {
  it('renders primary metric cards with fallback API data', () => {
    render(<OverviewCards />)

    expect(screen.getByText(/Total Players/i)).toBeInTheDocument()
    expect(screen.getByText(/Total Games/i)).toBeInTheDocument()
    expect(screen.getByText(/Active Today/i)).toBeInTheDocument()
    expect(screen.getByText(/Win Rate/i)).toBeInTheDocument()
  })
})
