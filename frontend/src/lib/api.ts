export type DashboardStats = {
  totalPlayers: number
  totalGames: number
  activeTournaments: number
  recentGames: number
  averageElo: number
  timestamp: string
}

export type ChartsResponse = {
  gamesOverTime: { labels: string[]; values: number[] }
  roleDistribution: { labels: string[]; values: number[] }
  winRates: { labels: string[]; values: number[] }
  tournamentParticipation: { labels: string[]; values: number[] }
  metadata: { timeframe: number; startDate: string; endDate: string; generatedAt: string }
}

export type ActivityItem = {
  id: string
  type: 'game' | 'tournament'
  title: string
  description: string
  time: string
  participants?: number
  status: 'completed' | 'ongoing' | 'upcoming'
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    if (data && data.success) return data.data as T
    return null
  } catch {
    return null
  }
}

export async function getDashboardStats(): Promise<DashboardStats | null> {
  return fetchJson<DashboardStats>('/api/dashboard/stats')
}

export async function getDashboardCharts(timeframe: number = 30): Promise<ChartsResponse | null> {
  const params = new URLSearchParams({ timeframe: String(timeframe) })
  return fetchJson<ChartsResponse>(`/api/dashboard/charts?${params.toString()}`)
}

export async function getRecentActivity(limit: number = 10): Promise<{ activities: ActivityItem[]; count: number; timestamp: string } | null> {
  const params = new URLSearchParams({ limit: String(limit) })
  return fetchJson<{ activities: ActivityItem[]; count: number; timestamp: string }>(`/api/dashboard/activity?${params.toString()}`)
}
