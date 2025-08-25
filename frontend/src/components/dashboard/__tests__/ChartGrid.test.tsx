import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'

// Mock lucide icons
vi.mock('lucide-react', () => ({
  __esModule: true,
  Wifi: (props: any) => <span>Wifi</span>,
  WifiOff: (props: any) => <span>WifiOff</span>,
  AlertCircle: (props: any) => <span>Alert</span>,
  TrendingUp: (props: any) => <span>Trending</span>,
  BarChart3: (props: any) => <span>Bar</span>,
  PieChart: (props: any) => <span>Pie</span>,
  Activity: (props: any) => <span>Activity</span>,
}))

// Mock chart components
vi.mock('react-chartjs-2', () => ({
  Line: (props: any) => <div role="img">LineChart</div>,
  Bar: (props: any) => <div role="img">BarChart</div>,
}))

// Mock realtime hooks and api hook
vi.mock('../../hooks/useRealtime', () => ({
  useRealtimeChartData: () => ({ chartData: null, isConnected: false, lastUpdated: null, isLoading: false }),
  useRealtimeConnection: () => ({ connectionHealth: { status: 'disconnected' }, isRealTimeEnabled: false, reconnect: vi.fn(), toggleRealTime: vi.fn() }),
  useRealtimeSubscriptions: () => ({ totalUpdates: 0, subscriptionCount: 0 }),
}))

vi.mock('@/hooks/useDashboardData', () => ({
  useDashboardCharts: () => ({ data: null }),
}))

import { ChartGrid } from '../ChartGrid'

describe('ChartGrid (smoke)', () => {
  it('renders chart regions', () => {
    render(<ChartGrid />)

    expect(screen.getByLabelText(/Real-time analytics charts/i)).toBeInTheDocument()
    expect(screen.getAllByRole('img').length).toBeGreaterThan(0)
  })
})
