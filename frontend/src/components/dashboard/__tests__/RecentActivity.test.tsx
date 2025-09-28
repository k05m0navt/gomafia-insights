import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'

// Mock realtime hooks and API
vi.mock('../../hooks/useRealtime', () => ({
  useRealtimeActivityFeed: () => ({ activities: [], isConnected: false, isLoading: false }),
  useRealtimeConnection: () => ({ connectionHealth: { status: 'disconnected' }, isRealTimeEnabled: false, reconnect: vi.fn(), toggleRealTime: vi.fn() }),
  useRealtimeSubscriptions: () => ({ totalUpdates: 0, subscriptionCount: 0 }),
}))

vi.mock('@/hooks/useDashboardData', () => ({
  useRecentActivity: () => ({ data: { activities: [] } }),
}))

import { RecentActivity } from '../RecentActivity'

describe('RecentActivity (smoke)', () => {
  it('renders feed region', () => {
    render(<RecentActivity />)

    expect(screen.getByRole('feed')).toBeInTheDocument()
    expect(screen.getByText(/Recent Activity/i)).toBeInTheDocument()
  })
})
