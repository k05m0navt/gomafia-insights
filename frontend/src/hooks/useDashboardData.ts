'use client'

import { useQuery } from '@tanstack/react-query'
import { getDashboardStats, getDashboardCharts, getRecentActivity, DashboardStats, ChartsResponse, ActivityItem } from '@/lib/api'

export function useDashboardStats(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true
  return useQuery<{ data: DashboardStats | null }>({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => ({ data: await getDashboardStats() }),
    enabled,
    staleTime: 15_000,
  })
}

export function useDashboardCharts(timeframe: number = 30, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true
  return useQuery<{ data: ChartsResponse | null }>({
    queryKey: ['dashboard', 'charts', timeframe],
    queryFn: async () => ({ data: await getDashboardCharts(timeframe) }),
    enabled,
    staleTime: 30_000,
  })
}

export function useRecentActivity(limit: number = 10, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true
  return useQuery<{ data: { activities: ActivityItem[]; count: number; timestamp: string } | null }>({
    queryKey: ['dashboard', 'activity', limit],
    queryFn: async () => ({ data: await getRecentActivity(limit) }),
    enabled,
    staleTime: 15_000,
  })
}
