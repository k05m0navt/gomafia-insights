// =============================================================================
// REAL-TIME REACT HOOKS
// =============================================================================
// React hooks for component integration with real-time features

import { useEffect, useCallback, useRef } from 'react'
import { useRealtimeStore } from '../lib/realtime'
import { UseRealtimeOptions, UseRealtimeReturn, RealtimeActivity } from '../types/realtime'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// =============================================================================
// CORE REAL-TIME HOOK
// =============================================================================

/**
 * Main hook for real-time data subscriptions
 */
export function useRealtime<T extends { [key: string]: any } = { [key: string]: any }>(options: UseRealtimeOptions = {}): UseRealtimeReturn<T> {
  const {
    table,
    filter,
    enabled = true,
    throttleMs = 1000,
    onUpdate,
    onError
  } = options

  const unsubscribeRef = useRef<(() => void) | null>(null)
  const dataRef = useRef<T | null>(null)
  const lastUpdatedRef = useRef<Date | null>(null)
  const errorRef = useRef<string | null>(null)
  const isLoadingRef = useRef<boolean>(false)

  const {
    subscribe,
    connectionHealth,
    isRealTimeEnabled
  } = useRealtimeStore()

  const isConnected = connectionHealth.status === 'connected'

  // Handle subscription
  useEffect(() => {
    if (!enabled || !table || !isRealTimeEnabled || !isConnected) {
      return
    }

    isLoadingRef.current = true

    const handleUpdate = (payload: RealtimePostgresChangesPayload<T>) => {
      try {
        dataRef.current = payload.new as T
        lastUpdatedRef.current = new Date()
        isLoadingRef.current = false
        errorRef.current = null

        if (onUpdate) {
          onUpdate(payload.new)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Update processing failed'
        errorRef.current = errorMessage
        isLoadingRef.current = false
        
        if (onError) {
          onError(errorMessage)
        }
      }
    }

    const unsubscribeFn = subscribe(table, handleUpdate, {
      filter,
      throttleMs
    })

    unsubscribeRef.current = unsubscribeFn

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [table, filter, enabled, isRealTimeEnabled, isConnected, throttleMs, onUpdate, onError, subscribe])

  const refresh = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
    }
    
    // Re-trigger subscription by updating refs
    isLoadingRef.current = true
    errorRef.current = null
  }, [])

  return {
    data: dataRef.current,
    isLoading: isLoadingRef.current,
    isConnected,
    error: errorRef.current,
    lastUpdated: lastUpdatedRef.current,
    refresh
  }
}

// =============================================================================
// SPECIALIZED HOOKS
// =============================================================================

/**
 * Hook for real-time metrics data
 */
export function useRealtimeMetrics() {
  const { metrics, connectionHealth } = useRealtimeStore()
  
  const isConnected = connectionHealth.status === 'connected'
  
  return {
    metrics,
    isConnected,
    lastUpdated: metrics.lastUpdated,
    isLoading: connectionHealth.status === 'connecting'
  }
}

/**
 * Hook for real-time activity feed
 */
export function useRealtimeActivities(maxItems: number = 50) {
  const { activities, connectionHealth, addActivity } = useRealtimeStore()
  
  const isConnected = connectionHealth.status === 'connected'
  
  // Limit activities to maxItems
  const limitedActivities = activities.slice(0, maxItems)
  
  const addNewActivity = useCallback((activity: RealtimeActivity) => {
    addActivity(activity)
  }, [addActivity])
  
  return {
    activities: limitedActivities,
    isConnected,
    isLoading: connectionHealth.status === 'connecting',
    addActivity: addNewActivity
  }
}

/**
 * Hook for real-time chart data
 */
export function useRealtimeChartData() {
  const { chartData, connectionHealth } = useRealtimeStore()
  
  const isConnected = connectionHealth.status === 'connected'
  
  return {
    chartData,
    isConnected,
    lastUpdated: chartData.lastUpdated,
    isLoading: connectionHealth.status === 'connecting'
  }
}

/**
 * Hook for connection status and management
 */
export function useRealtimeConnection() {
  const {
    connectionHealth,
    isRealTimeEnabled,
    connect,
    disconnect,
    reconnect,
    enableRealTime,
    userPreferences,
    updateUserPreferences
  } = useRealtimeStore()

  const toggleRealTime = useCallback(() => {
    enableRealTime(!isRealTimeEnabled)
  }, [isRealTimeEnabled, enableRealTime])

  const updateNotifications = useCallback((enabled: boolean) => {
    updateUserPreferences({ enableNotifications: enabled })
  }, [updateUserPreferences])

  const updateAutoReconnect = useCallback((enabled: boolean) => {
    updateUserPreferences({ autoReconnect: enabled })
  }, [updateUserPreferences])

  return {
    connectionHealth,
    isRealTimeEnabled,
    userPreferences,
    connect,
    disconnect,
    reconnect,
    toggleRealTime,
    updateNotifications,
    updateAutoReconnect
  }
}

/**
 * Hook for subscription management and monitoring
 */
export function useRealtimeSubscriptions() {
  const {
    activeSubscriptions,
    totalUpdates,
    connectionHealth,
    unsubscribeAll
  } = useRealtimeStore()

  const subscriptionCount = activeSubscriptions.size
  const isConnected = connectionHealth.status === 'connected'

  const clearAllSubscriptions = useCallback(() => {
    unsubscribeAll()
  }, [unsubscribeAll])

  return {
    subscriptionCount,
    totalUpdates,
    isConnected,
    activeSubscriptions: Array.from(activeSubscriptions.values()),
    clearAllSubscriptions
  }
}

/**
 * Hook for performance monitoring
 */
export function useRealtimePerformance() {
  const {
    activeSubscriptions,
    totalUpdates,
    updateFrequency,
    lastPerformanceCheck,
    activities,
    clearOldActivities,
    setUpdateFrequency
  } = useRealtimeStore()

  const performanceMetrics = {
    subscriptionCount: activeSubscriptions.size,
    totalUpdates,
    updateFrequency,
    activitiesCount: activities.length,
    lastPerformanceCheck
  }

  const optimizePerformance = useCallback(() => {
    // Clear old activities
    clearOldActivities(24 * 60 * 60 * 1000) // 24 hours
    
    // Adjust update frequency based on subscription count
    if (activeSubscriptions.size > 10) {
      setUpdateFrequency(60000) // Slow down to 1 minute
    } else if (activeSubscriptions.size > 5) {
      setUpdateFrequency(30000) // 30 seconds
    } else {
      setUpdateFrequency(15000) // 15 seconds
    }
  }, [activeSubscriptions.size, clearOldActivities, setUpdateFrequency])

  return {
    performanceMetrics,
    optimizePerformance
  }
}

// =============================================================================
// COMPONENT-SPECIFIC HOOKS
// =============================================================================

/**
 * Hook for dashboard overview cards with real-time updates
 */
export function useRealtimeDashboardMetrics() {
  const { metrics, connectionHealth } = useRealtimeStore()
  
  // Subscribe to players table for total players
  useRealtime({
    table: 'players',
    enabled: true,
    throttleMs: 30000, // Update every 30 seconds
    onUpdate: (data) => {
      // Update total players count
      // This would need actual counting logic based on the payload
      console.log('Players updated:', data)
    }
  })

  // Subscribe to tournaments table for active tournaments
  useRealtime({
    table: 'tournaments',
    filter: 'status=eq.ongoing',
    enabled: true,
    throttleMs: 30000,
    onUpdate: (data) => {
      console.log('Tournaments updated:', data)
    }
  })

  // Subscribe to games table for recent games
  useRealtime({
    table: 'games',
    enabled: true,
    throttleMs: 30000,
    onUpdate: (data) => {
      console.log('Games updated:', data)
    }
  })

  const isConnected = connectionHealth.status === 'connected'
  const isLoading = connectionHealth.status === 'connecting'

  return {
    metrics,
    isConnected,
    isLoading,
    lastUpdated: metrics.lastUpdated
  }
}

/**
 * Hook for real-time activity feed in dashboard
 */
export function useRealtimeActivityFeed() {
  const { activities, addActivity } = useRealtimeActivities(20)
  
  // Subscribe to games for new game activities
  const gamesSubscription = useRealtime({
    table: 'games',
    enabled: true,
    throttleMs: 5000, // More frequent for activity feed
    onUpdate: (gameData) => {
      const activity: RealtimeActivity = {
        id: `game_${gameData.id}`,
        type: 'game',
        title: `Game #${gameData.id}`,
        description: `${gameData.outcome || 'Game'} - ${(gameData.playerCount as number) || 0} players`,
        timestamp: new Date(),
        participants: (gameData.playerCount as number) || undefined,
        status: gameData.status === 'completed' ? 'completed' : 'ongoing'
      }
      addActivity(activity)
    }
  })

  // Subscribe to tournaments for tournament activities
  const tournamentsSubscription = useRealtime({
    table: 'tournaments',
    enabled: true,
    throttleMs: 10000,
    onUpdate: (tournamentData) => {
      const activity: RealtimeActivity = {
        id: `tournament_${tournamentData.id}`,
        type: 'tournament',
        title: (tournamentData.name as string) || `Tournament #${tournamentData.id}`,
        description: `${tournamentData.status} - ${(tournamentData.participantCount as number) || 0} participants`,
        timestamp: new Date(),
        participants: (tournamentData.participantCount as number) || undefined,
        status: (tournamentData.status as 'completed' | 'ongoing' | 'upcoming') || 'upcoming'
      }
      addActivity(activity)
    }
  })

  return {
    activities,
    isConnected: gamesSubscription.isConnected && tournamentsSubscription.isConnected,
    isLoading: gamesSubscription.isLoading || tournamentsSubscription.isLoading
  }
}
