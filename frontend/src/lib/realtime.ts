// =============================================================================
// REAL-TIME MANAGER
// =============================================================================
// Centralized real-time state management with Supabase integration,
// performance optimization, and error handling

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { getSupabase } from './supabase'
import { 
  RealtimeState, 
  RealtimeActions, 
  ConnectionStatus, 
  ActiveSubscription,
  SubscriptionOptions,
  RealtimeError,
  ErrorRecoveryStrategy
} from '../types/realtime'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { toast } from 'react-hot-toast'

// =============================================================================
// PERFORMANCE OPTIMIZATION UTILITIES
// =============================================================================

// Cross-environment scheduler: rAF in browser, setTimeout in SSR/build
const schedule = (cb: () => void) => {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(cb)
  } else {
    setTimeout(cb, 0)
  }
}

/**
 * Throttle function for rate limiting
 */
function throttle(
  func: (payload: RealtimePostgresChangesPayload<any>) => void, 
  delay: number
): (payload: RealtimePostgresChangesPayload<any>) => void {
  let lastCall = 0
  let scheduled = false
  let lastPayload: RealtimePostgresChangesPayload<any> | null = null
  return (payload: RealtimePostgresChangesPayload<any>) => {
    const now = Date.now()
    lastPayload = payload
    if (now - lastCall >= delay && !scheduled) {
      scheduled = true
      schedule(() => {
        scheduled = false
        lastCall = Date.now()
        if (lastPayload) func(lastPayload)
        lastPayload = null
      })
    }
  }
}

/**
 * Generate unique subscription ID
 */
function generateSubscriptionId(table: string, filter?: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)
  return `${table}_${filter || 'all'}_${timestamp}_${random}`
}

// =============================================================================
// ERROR RECOVERY STRATEGY
// =============================================================================

const defaultErrorRecovery: ErrorRecoveryStrategy = {
  maxRetries: 5,
  backoffMultiplier: 2,
  initialDelay: 1000,
  maxDelay: 30000,
  shouldRetry: (error: RealtimeError) => error.recoverable
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: RealtimeState = {
  connectionHealth: {
    status: 'disconnected',
    reconnectAttempts: 0
  },
  isRealTimeEnabled: true,
  activeSubscriptions: new Map(),
  metrics: {
    totalPlayers: 0,
    activeTournaments: 0,
    gamesPlayed: 0,
    avgEloRating: 0,
    lastUpdated: new Date()
  },
  activities: [],
  chartData: {
    gamesOverTime: [],
    roleDistribution: [],
    winRateTrends: [],
    tournamentParticipation: [],
    lastUpdated: new Date()
  },
  updateFrequency: 30000, // 30 seconds default
  totalUpdates: 0,
  lastPerformanceCheck: new Date(),
  userPreferences: {
    enableNotifications: true,
    updateInterval: 30000,
    autoReconnect: true,
    showConnectionStatus: true
  }
}

// =============================================================================
// REAL-TIME STORE WITH ZUSTAND
// =============================================================================

type RealtimeStore = RealtimeState & RealtimeActions

export const useRealtimeStore = create<RealtimeStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // =============================================================================
    // CONNECTION MANAGEMENT
    // =============================================================================

    connect: async () => {
      const state = get()
      if (state.connectionHealth.status === 'connected') return

      set({
        connectionHealth: { ...state.connectionHealth, status: 'connecting' }
      })

      try {
        const supabase = getSupabase()
        if (!supabase) {
          throw new Error('Supabase is not configured')
        }

        // Test connection with a simple query
        const { error } = await supabase.from('players').select('count').limit(1)
        
        if (error) throw error

        set({
          connectionHealth: {
            ...state.connectionHealth,
            status: 'connected',
            lastConnected: new Date(),
            reconnectAttempts: 0,
            error: undefined
          }
        })

        if (state.userPreferences.enableNotifications) {
          toast.success('Real-time connection established', {
            icon: '🔗',
            duration: 2000
          })
        }

      } catch (error) {
        console.error('Real-time connection failed:', error)
        
        set({
          connectionHealth: {
            ...state.connectionHealth,
            status: 'error',
            error: error instanceof Error ? error.message : 'Connection failed'
          }
        })

        // Auto-retry if enabled
        if (state.userPreferences.autoReconnect) {
          setTimeout(() => {
            get().reconnect()
          }, defaultErrorRecovery.initialDelay)
        }
      }
    },

    disconnect: () => {
      const state = get()
      
      // Unsubscribe from all active subscriptions
      state.activeSubscriptions.forEach((subscription) => {
        const supabase = getSupabase()
        if (supabase) {
          supabase.removeChannel(supabase.channel(subscription.id))
        }
      })

      set({
        connectionHealth: {
          ...state.connectionHealth,
          status: 'disconnected',
          lastDisconnected: new Date()
        },
        activeSubscriptions: new Map()
      })

      if (state.userPreferences.enableNotifications) {
        toast('Real-time connection closed', {
          icon: '🔌',
          duration: 2000
        })
      }
    },

    reconnect: async () => {
      const state = get()
      
      set({
        connectionHealth: {
          ...state.connectionHealth,
          status: 'reconnecting',
          reconnectAttempts: state.connectionHealth.reconnectAttempts + 1
        }
      })

      // Calculate backoff delay
      const delay = Math.min(
        defaultErrorRecovery.initialDelay * 
        Math.pow(defaultErrorRecovery.backoffMultiplier, state.connectionHealth.reconnectAttempts),
        defaultErrorRecovery.maxDelay
      )

      setTimeout(async () => {
        await get().connect()
      }, delay)
    },

    updateConnectionStatus: (status: ConnectionStatus, error?: string) => {
      const state = get()
      set({
        connectionHealth: {
          ...state.connectionHealth,
          status,
          error
        }
      })
    },

    // =============================================================================
    // SUBSCRIPTION MANAGEMENT
    // =============================================================================

    subscribe: <T extends { [key: string]: any } = { [key: string]: any }>(
      table: string,
      callback: (payload: RealtimePostgresChangesPayload<T>) => void,
      options: SubscriptionOptions = {}
    ) => {
      const state = get()
      if (!state.isRealTimeEnabled) return () => {}

      const supabase = getSupabase()
      if (!supabase) {
        // Mark error state but do not crash
        set({
          connectionHealth: {
            ...state.connectionHealth,
            status: 'error',
            error: 'Supabase is not configured'
          }
        })
        return () => {}
      }

      const subscriptionId = generateSubscriptionId(table, options.filter)
      
      // Create throttled callback if specified
      const throttledCallback = options.throttleMs ? 
        throttle(callback, options.throttleMs) : callback

      // Set up Supabase subscription
      const channel = supabase
        .channel(subscriptionId)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter: options.filter
          },
          (payload) => {
            // Update subscription stats
            const currentState = get()
            const currentSubscriptions = new Map(currentState.activeSubscriptions)
            const subscription = currentSubscriptions.get(subscriptionId)
            
            if (subscription) {
              subscription.lastUpdate = new Date()
              subscription.updateCount += 1
              // Deduplicate rapid set calls by batching in rAF
              schedule(() => {
                set({
                  activeSubscriptions: currentSubscriptions,
                  totalUpdates: currentState.totalUpdates + 1
                })
              })
            }

            // Call the callback
            throttledCallback(payload as any)
          }
        )
        .subscribe()

      // Store subscription details
      const subscription: ActiveSubscription = {
        id: subscriptionId,
        table,
        filter: options.filter,
        callback: throttledCallback as any,
        options,
        createdAt: new Date(),
        updateCount: 0
      }

      const newSubscriptions = new Map(state.activeSubscriptions)
      newSubscriptions.set(subscriptionId, subscription)
      
      set({ activeSubscriptions: newSubscriptions })

      // Return unsubscribe function
      return () => {
        const supabase = getSupabase()
        if (supabase) {
          supabase.removeChannel(channel)
        }
        const currentState = get()
        const updatedSubscriptions = new Map(currentState.activeSubscriptions)
        updatedSubscriptions.delete(subscriptionId)
        set({ activeSubscriptions: updatedSubscriptions })
      }
    },

    unsubscribe: (subscriptionId: string) => {
      const state = get()
      const subscription = state.activeSubscriptions.get(subscriptionId)
      
      if (subscription) {
        const supabase = getSupabase()
        if (supabase) {
          supabase.removeChannel(supabase.channel(subscriptionId))
        }
        const updatedSubscriptions = new Map(state.activeSubscriptions)
        updatedSubscriptions.delete(subscriptionId)
        set({ activeSubscriptions: updatedSubscriptions })
      }
    },

    unsubscribeAll: () => {
      const state = get()
      
      const supabase = getSupabase()
      if (supabase) {
        state.activeSubscriptions.forEach((subscription) => {
          supabase.removeChannel(supabase.channel(subscription.id))
        })
      }

      set({ activeSubscriptions: new Map() })
    },

    // =============================================================================
    // DATA UPDATES
    // =============================================================================

    updateMetrics: (metrics) => {
      const state = get()
      set({
        metrics: { ...state.metrics, ...metrics, lastUpdated: new Date() }
      })
    },

    addActivity: (activity) => {
      const state = get()
      const newActivities = [activity, ...state.activities]
      
      // Keep only last 100 activities for performance
      if (newActivities.length > 100) {
        newActivities.splice(100)
      }
      
      set({ activities: newActivities })
    },

    updateChartData: (chartData) => {
      const state = get()
      set({
        chartData: { ...state.chartData, ...chartData, lastUpdated: new Date() }
      })
    },

    // =============================================================================
    // PERFORMANCE OPTIMIZATION
    // =============================================================================

    enableRealTime: (enabled) => {
      set({ isRealTimeEnabled: enabled })

      if (!enabled) {
        get().unsubscribeAll()
      }
    },

    setUpdateFrequency: (frequency) => {
      const state = get()
      set({
        updateFrequency: frequency,
        userPreferences: { ...state.userPreferences, updateInterval: frequency }
      })
    },

    clearOldActivities: (maxAge) => {
      const state = get()
      const cutoffTime = Date.now() - maxAge
      
      const filteredActivities = state.activities.filter(
        activity => activity.timestamp.getTime() > cutoffTime
      )
      
      set({ activities: filteredActivities })
    },

    // =============================================================================
    // USER PREFERENCES
    // =============================================================================

    updateUserPreferences: (preferences) => {
      const state = get()
      set({
        userPreferences: { ...state.userPreferences, ...preferences }
      })
    }
  }))
)

// =============================================================================
// REAL-TIME MANAGER SINGLETON
// =============================================================================

export const RealtimeManager = {
  connect: () => useRealtimeStore.getState().connect(),
  disconnect: () => useRealtimeStore.getState().disconnect(),
  reconnect: () => useRealtimeStore.getState().reconnect(),
  updateConnectionStatus: (status: ConnectionStatus, error?: string) =>
    useRealtimeStore.getState().updateConnectionStatus(status, error),
  subscribe: useRealtimeStore.getState().subscribe,
  unsubscribe: useRealtimeStore.getState().unsubscribe,
  unsubscribeAll: useRealtimeStore.getState().unsubscribeAll
}
