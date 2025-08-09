// =============================================================================
// REAL-TIME STATUS INDICATOR
// =============================================================================
// Progressive disclosure status indicator with expandable details and controls

'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Wifi, 
  WifiOff, 
  Activity, 
  Settings, 
  Bell, 
  BellOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRealtimeConnection, useRealtimeSubscriptions, useRealtimePerformance } from '../../hooks/useRealtime'
import { StatusIndicatorProps } from '../../types/realtime'
import { formatDistanceToNow } from 'date-fns'

// =============================================================================
// MAIN STATUS INDICATOR COMPONENT
// =============================================================================

export function RealtimeStatusIndicator({ 
  position = 'header-right',
  size = 'medium',
  expandable = true,
  showLatency = false,
  showUpdateCount = false
}: StatusIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const indicatorRef = useRef<HTMLDivElement>(null)

  const {
    connectionHealth,
    isRealTimeEnabled,
    userPreferences,
    connect,
    disconnect,
    reconnect,
    toggleRealTime,
    updateNotifications,
    updateAutoReconnect
  } = useRealtimeConnection()

  const {
    subscriptionCount,
    totalUpdates,
    isConnected
  } = useRealtimeSubscriptions()

  const { performanceMetrics } = useRealtimePerformance()

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (indicatorRef.current && !indicatorRef.current.contains(event.target as Node)) {
        setIsExpanded(false)
        setShowSettings(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // =============================================================================
  // STATUS CONFIGURATION
  // =============================================================================

  const getStatusConfig = () => {
    switch (connectionHealth.status) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-400',
          bgColor: 'bg-green-400/20',
          label: 'Connected',
          pulse: true
        }
      case 'connecting':
        return {
          icon: RefreshCw,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/20',
          label: 'Connecting...',
          pulse: false,
          spin: true
        }
      case 'reconnecting':
        return {
          icon: RefreshCw,
          color: 'text-blue-400',
          bgColor: 'bg-blue-400/20',
          label: 'Reconnecting...',
          pulse: false,
          spin: true
        }
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-400/20',
          label: 'Connection Error',
          pulse: false
        }
      case 'disconnected':
      default:
        return {
          icon: WifiOff,
          color: 'text-slate-400',
          bgColor: 'bg-slate-400/20',
          label: 'Disconnected',
          pulse: false
        }
    }
  }

  const statusConfig = getStatusConfig()
  const Icon = statusConfig.icon

  // =============================================================================
  // SIZE CONFIGURATION
  // =============================================================================

  const sizeConfig = {
    small: {
      indicator: 'w-8 h-8',
      icon: 'w-4 h-4',
      text: 'text-xs'
    },
    medium: {
      indicator: 'w-10 h-10',
      icon: 'w-5 h-5',
      text: 'text-sm'
    },
    large: {
      indicator: 'w-12 h-12',
      icon: 'w-6 h-6',
      text: 'text-base'
    }
  }

  const sizes = sizeConfig[size]

  // =============================================================================
  // POSITION STYLING
  // =============================================================================

  const getPositionClasses = () => {
    switch (position) {
      case 'header-left':
        return 'justify-start'
      case 'floating':
        return 'fixed top-4 right-4 z-50'
      case 'header-right':
      default:
        return 'justify-end'
    }
  }

  // =============================================================================
  // RENDER COMPACT INDICATOR
  // =============================================================================

  const renderCompactIndicator = () => (
    <motion.div
      className={`
        relative flex items-center gap-2 cursor-pointer
        ${getPositionClasses()}
      `}
      onClick={() => expandable && setIsExpanded(!isExpanded)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Main Status Indicator */}
      <div
        className={`
          relative flex items-center justify-center rounded-full
          ${sizes.indicator} ${statusConfig.bgColor}
          border border-slate-700 backdrop-blur-sm
        `}
      >
        <Icon
          className={`
            ${sizes.icon} ${statusConfig.color}
            ${statusConfig.spin ? 'animate-spin' : ''}
          `}
        />
        
        {/* Pulse Animation */}
        {statusConfig.pulse && (
          <motion.div
            className={`
              absolute inset-0 rounded-full border-2 border-green-400
            `}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        )}

        {/* Update Count Badge */}
        {showUpdateCount && totalUpdates > 0 && (
          <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {totalUpdates > 99 ? '99+' : totalUpdates}
          </div>
        )}
      </div>

      {/* Status Text (for larger sizes) */}
      {size !== 'small' && (
        <div className={`text-slate-300 ${sizes.text} hidden sm:block`}>
          {statusConfig.label}
          {showLatency && connectionHealth.latency && (
            <span className="text-slate-500 ml-1">
              ({connectionHealth.latency}ms)
            </span>
          )}
        </div>
      )}

      {/* Expansion Indicator */}
      {expandable && (
        <motion.div
          className="text-slate-500"
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Clock className="w-3 h-3" />
        </motion.div>
      )}
    </motion.div>
  )

  // =============================================================================
  // RENDER EXPANDED PANEL
  // =============================================================================

  const renderExpandedPanel = () => (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute top-full right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={`w-5 h-5 ${statusConfig.color}`} />
                <h3 className="text-white font-medium">Real-time Status</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1 text-slate-400 hover:text-white rounded transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 text-slate-400 hover:text-white rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          {showSettings ? renderSettingsPanel() : renderStatusPanel()}
        </motion.div>
      )}
    </AnimatePresence>
  )

  // =============================================================================
  // RENDER STATUS PANEL
  // =============================================================================

  const renderStatusPanel = () => (
    <div className="p-4 space-y-4">
      {/* Connection Details */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Status</span>
          <span className={`${statusConfig.color} font-medium`}>
            {statusConfig.label}
          </span>
        </div>
        
        {connectionHealth.latency && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Latency</span>
            <span className="text-white">{connectionHealth.latency}ms</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Subscriptions</span>
          <span className="text-white">{subscriptionCount}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Total Updates</span>
          <span className="text-white">{totalUpdates}</span>
        </div>

        {connectionHealth.lastConnected && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Last Connected</span>
            <span className="text-white text-sm">
              {formatDistanceToNow(connectionHealth.lastConnected)} ago
            </span>
          </div>
        )}
      </div>

      {/* Error Details */}
      {connectionHealth.error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded">
          <p className="text-red-400 text-sm">{connectionHealth.error}</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2">
        {connectionHealth.status === 'connected' ? (
          <button
            onClick={disconnect}
            className="flex-1 px-3 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-colors"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={connect}
            className="flex-1 px-3 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/30 transition-colors"
          >
            Connect
          </button>
        )}
        
        {connectionHealth.status === 'error' && (
          <button
            onClick={reconnect}
            className="flex-1 px-3 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/30 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  )

  // =============================================================================
  // RENDER SETTINGS PANEL
  // =============================================================================

  const renderSettingsPanel = () => (
    <div className="p-4 space-y-4">
      <h4 className="text-white font-medium mb-3">Real-time Settings</h4>
      
      {/* Enable/Disable Real-time */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white text-sm">Real-time Updates</div>
          <div className="text-slate-400 text-xs">Enable live dashboard updates</div>
        </div>
        <button
          onClick={toggleRealTime}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${isRealTimeEnabled ? 'bg-blue-600' : 'bg-slate-600'}
          `}
        >
          <motion.span
            className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
            animate={{ x: isRealTimeEnabled ? 24 : 4 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </button>
      </div>

      {/* Notifications */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white text-sm flex items-center gap-2">
            {userPreferences.enableNotifications ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            Notifications
          </div>
          <div className="text-slate-400 text-xs">Connection status notifications</div>
        </div>
        <button
          onClick={() => updateNotifications(!userPreferences.enableNotifications)}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${userPreferences.enableNotifications ? 'bg-blue-600' : 'bg-slate-600'}
          `}
        >
          <motion.span
            className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
            animate={{ x: userPreferences.enableNotifications ? 24 : 4 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </button>
      </div>

      {/* Auto Reconnect */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white text-sm">Auto Reconnect</div>
          <div className="text-slate-400 text-xs">Automatically retry connections</div>
        </div>
        <button
          onClick={() => updateAutoReconnect(!userPreferences.autoReconnect)}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${userPreferences.autoReconnect ? 'bg-blue-600' : 'bg-slate-600'}
          `}
        >
          <motion.span
            className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
            animate={{ x: userPreferences.autoReconnect ? 24 : 4 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </button>
      </div>

      {/* Performance Info */}
      <div className="pt-2 border-t border-slate-700">
        <div className="text-slate-400 text-xs">Performance</div>
        <div className="text-white text-sm">
          {performanceMetrics.activitiesCount} activities, {performanceMetrics.subscriptionCount} subscriptions
        </div>
      </div>
    </div>
  )

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  return (
    <div ref={indicatorRef} className="relative">
      {renderCompactIndicator()}
      {renderExpandedPanel()}
    </div>
  )
}
