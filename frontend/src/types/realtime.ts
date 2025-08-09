// =============================================================================
// REAL-TIME SYSTEM TYPES
// =============================================================================
// TypeScript types for real-time dashboard features, connection management,
// and performance optimization

import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// =============================================================================
// CONNECTION STATUS TYPES
// =============================================================================

export type ConnectionStatus = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected' 
  | 'reconnecting' 
  | 'error'

export interface ConnectionHealth {
  status: ConnectionStatus
  lastConnected?: Date
  lastDisconnected?: Date
  reconnectAttempts: number
  latency?: number
  error?: string
}

// =============================================================================
// SUBSCRIPTION TYPES
// =============================================================================

export interface SubscriptionOptions {
  throttleMs?: number
  batchSize?: number
  enableOptimisticUpdates?: boolean
  filter?: string
  immediate?: boolean
}

export interface ActiveSubscription {
  id: string
  table: string
  filter?: string
  callback: (payload: RealtimePostgresChangesPayload<any>) => void
  options: SubscriptionOptions
  createdAt: Date
  lastUpdate?: Date
  updateCount: number
}

// =============================================================================
// REAL-TIME DATA TYPES
// =============================================================================

export interface RealtimeMetrics {
  totalPlayers: number
  activeTournaments: number
  gamesPlayed: number
  avgEloRating: number
  lastUpdated: Date
}

export interface RealtimeActivity {
  id: string
  type: 'game' | 'tournament' | 'player_update'
  title: string
  description: string
  timestamp: Date
  participants?: number
  status: 'completed' | 'ongoing' | 'upcoming'
  metadata?: Record<string, any>
}

export interface RealtimeChartData {
  gamesOverTime: Array<{ date: string; count: number }>
  roleDistribution: Array<{ role: string; count: number }>
  winRateTrends: Array<{ date: string; winRate: number }>
  tournamentParticipation: Array<{ tournament: string; participants: number }>
  lastUpdated: Date
}

// =============================================================================
// REAL-TIME STORE STATE
// =============================================================================

export interface RealtimeState {
  // Connection state
  connectionHealth: ConnectionHealth
  isRealTimeEnabled: boolean
  
  // Subscriptions
  activeSubscriptions: Map<string, ActiveSubscription>
  
  // Real-time data
  metrics: RealtimeMetrics
  activities: RealtimeActivity[]
  chartData: RealtimeChartData
  
  // Performance tracking
  updateFrequency: number
  totalUpdates: number
  lastPerformanceCheck: Date
  
  // User preferences
  userPreferences: {
    enableNotifications: boolean
    updateInterval: number
    autoReconnect: boolean
    showConnectionStatus: boolean
  }
}

// =============================================================================
// REAL-TIME ACTIONS
// =============================================================================

export interface RealtimeActions {
  // Connection management
  connect: () => Promise<void>
  disconnect: () => void
  reconnect: () => Promise<void>
  updateConnectionStatus: (status: ConnectionStatus, error?: string) => void
  
  // Subscription management
  subscribe: (
    table: string,
          callback: (payload: RealtimePostgresChangesPayload<any>) => void,
    options?: SubscriptionOptions
  ) => () => void
  unsubscribe: (subscriptionId: string) => void
  unsubscribeAll: () => void
  
  // Data updates
  updateMetrics: (metrics: Partial<RealtimeMetrics>) => void
  addActivity: (activity: RealtimeActivity) => void
  updateChartData: (chartData: Partial<RealtimeChartData>) => void
  
  // Performance optimization
  enableRealTime: (enabled: boolean) => void
  setUpdateFrequency: (frequency: number) => void
  clearOldActivities: (maxAge: number) => void
  
  // User preferences
  updateUserPreferences: (preferences: Partial<RealtimeState['userPreferences']>) => void
}

// =============================================================================
// COMPONENT INTEGRATION TYPES
// =============================================================================

export interface UseRealtimeOptions {
  table?: string
  filter?: string
  enabled?: boolean
  throttleMs?: number
  onUpdate?: (data: any) => void
  onError?: (error: string) => void
}

export interface UseRealtimeReturn<T = any> {
  data: T | null
  isLoading: boolean
  isConnected: boolean
  error: string | null
  lastUpdated: Date | null
  refresh: () => void
}

// =============================================================================
// STATUS INDICATOR TYPES
// =============================================================================

export interface StatusIndicatorProps {
  position?: 'header-right' | 'header-left' | 'floating'
  size?: 'small' | 'medium' | 'large'
  expandable?: boolean
  showLatency?: boolean
  showUpdateCount?: boolean
}

export interface StatusPanelData {
  connectionHealth: ConnectionHealth
  activeSubscriptions: number
  totalUpdates: number
  averageLatency: number
  lastUpdate: Date | null
  userPreferences: RealtimeState['userPreferences']
}

// =============================================================================
// PERFORMANCE OPTIMIZATION TYPES
// =============================================================================

export interface PerformanceMetrics {
  memoryUsage: number
  subscriptionCount: number
  updateRate: number
  averageLatency: number
  errorRate: number
  reconnectionCount: number
}

export interface OptimizationSettings {
  maxSubscriptions: number
  maxActivities: number
  throttleInterval: number
  batchSize: number
  gcInterval: number
  connectionTimeout: number
}

// =============================================================================
// ERROR HANDLING TYPES
// =============================================================================

export interface RealtimeError {
  type: 'connection' | 'subscription' | 'data' | 'performance'
  message: string
  timestamp: Date
  details?: Record<string, any>
  recoverable: boolean
}

export interface ErrorRecoveryStrategy {
  maxRetries: number
  backoffMultiplier: number
  initialDelay: number
  maxDelay: number
  shouldRetry: (error: RealtimeError) => boolean
}
