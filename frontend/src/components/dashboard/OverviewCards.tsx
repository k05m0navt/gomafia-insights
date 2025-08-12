'use client';

import { Users, Trophy, Calendar, TrendingUp } from 'lucide-react';
import { useRealtimeDashboardMetrics, useRealtimeConnection, useRealtimeSubscriptions } from '../../hooks/useRealtime';
import { useDashboardStats } from '@/hooks/useDashboardData';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ComponentStatusIndicator } from '../realtime/ComponentStatusIndicator';

interface MetricCardProps {
  title: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  isRealTimeConnected?: boolean;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected';
  lastUpdated?: Date;
  updateCount?: number;
  onStatusClick?: () => void;
  onReconnect?: () => void;
  onToggleRealtime?: (enabled: boolean) => void;
  isRealtimeEnabled?: boolean;
  // Phase 2 enhancements
  isUpdating?: boolean;
  previousValue?: string | number;
}

function MetricCard({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon, 
  isRealTimeConnected = false,
  connectionStatus = 'disconnected',
  lastUpdated,
  updateCount = 0,
  onStatusClick,
  onReconnect,
  onToggleRealtime,
  isRealtimeEnabled = true,
  isUpdating = false,
  previousValue
}: MetricCardProps) {
  const [showUpdateFlash, setShowUpdateFlash] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);

  // Smooth value transitions and flash effect for updates
  useEffect(() => {
    if (previousValue !== undefined && previousValue !== value) {
      setShowUpdateFlash(true);
      // Delay value update for smooth transition
      const timer = setTimeout(() => {
        setDisplayValue(value);
      }, 150);
      
      // Reset flash effect
      const flashTimer = setTimeout(() => {
        setShowUpdateFlash(false);
      }, 1000);
      
      return () => {
        clearTimeout(timer);
        clearTimeout(flashTimer);
      };
    } else {
      setDisplayValue(value);
    }
  }, [value, previousValue]);

  const changeColorClass = {
    positive: 'text-green-400',
    negative: 'text-red-400',
    neutral: 'text-slate-400'
  }[changeType];

  return (
    <motion.div 
      className={`bg-slate-800 rounded-lg p-6 border transition-colors duration-300 relative ${
        showUpdateFlash 
          ? 'border-blue-400 bg-slate-800/80' 
          : 'border-slate-700'
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Enhanced Real-time Status Indicator */}
      <div className="absolute top-3 right-3">
        <ComponentStatusIndicator
          isConnected={isRealTimeConnected}
          connectionStatus={connectionStatus}
          lastUpdated={lastUpdated}
          updateCount={updateCount}
          componentName={`${title} Metrics`}
          updateFrequency="Real-time"
          onReconnect={onReconnect}
          onToggleRealtime={onToggleRealtime}
          isRealtimeEnabled={isRealtimeEnabled}
          className="hover:bg-slate-700/50"
        />
      </div>

      {/* Update Flash Overlay */}
      <AnimatePresence>
        {showUpdateFlash && (
          <motion.div
            className="absolute inset-0 bg-blue-400/10 rounded-lg pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isUpdating && (
          <motion.div
            className="absolute inset-0 bg-slate-800/80 rounded-lg flex items-center justify-center backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              aria-label="Updating data"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          
          {/* Animated Value Display */}
          <motion.p 
            className="text-3xl font-bold text-white mt-2"
            key={displayValue}
            initial={{ scale: 0.95, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 20,
              duration: 0.3
            }}
          >
            {displayValue}
          </motion.p>
          
          <motion.p 
            className={`text-sm mt-2 ${changeColorClass}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {change}
          </motion.p>
        </div>
        
        <motion.div 
          className="p-3 bg-slate-700 rounded-lg"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <Icon className="w-6 h-6 text-blue-400" aria-hidden="true" />
        </motion.div>
      </div>

      {/* Update Badge */}
      <AnimatePresence>
        {showUpdateFlash && (
          <motion.div
            className="absolute bottom-3 left-3 bg-blue-600 text-white text-xs px-2 py-1 rounded-full"
            initial={{ scale: 0, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            Updated
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Real-time Status Panel Modal Component
interface RealtimeStatusPanelProps {
  isOpen: boolean;
  onClose: () => void;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  lastUpdated?: Date;
  updateCount: number;
  onReconnect?: () => void;
}

function RealtimeStatusPanel({ 
  isOpen, 
  onClose, 
  connectionStatus, 
  lastUpdated, 
  updateCount, 
  onReconnect 
}: RealtimeStatusPanelProps) {
  if (!isOpen) return null;

  const statusConfig = {
    connected: { color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-700' },
    connecting: { color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-700' },
    disconnected: { color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-700' }
  };

  const config = statusConfig[connectionStatus];

  return (
    <motion.div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="bg-slate-800 rounded-lg p-6 border border-slate-700 max-w-md w-full mx-4" 
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-modal-title"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 id="status-modal-title" className="text-lg font-semibold text-white">
            Overview Metrics Status
          </h3>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white text-xl"
            aria-label="Close status panel"
          >
            ×
          </button>
        </div>
        
        <div className={`flex items-center space-x-3 p-3 rounded-lg border ${config.bg} ${config.border} mb-4`}>
          <div className={`w-3 h-3 rounded-full ${
            connectionStatus === 'connected' 
              ? 'bg-green-400 animate-pulse' 
              : connectionStatus === 'connecting'
              ? 'bg-yellow-400 animate-ping'
              : 'bg-red-400'
          }`} />
          <div className="flex-1">
            <p className={`font-medium ${config.color}`}>
              {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
            </p>
            <p className="text-sm text-slate-400">
              {connectionStatus === 'connected' 
                ? 'Receiving live metric updates' 
                : connectionStatus === 'connecting'
                ? 'Attempting to connect to real-time service...'
                : 'Using cached metric data'
              }
            </p>
          </div>
        </div>

        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-slate-400">Updates received:</span>
            <span className="text-white">{updateCount}</span>
          </div>
          {lastUpdated && (
            <div className="flex justify-between">
              <span className="text-slate-400">Last update:</span>
              <span className="text-white">{lastUpdated.toLocaleTimeString()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-400">Component:</span>
            <span className="text-white">Overview Cards</span>
          </div>
        </div>

        {connectionStatus === 'disconnected' && onReconnect && (
          <motion.button
            onClick={onReconnect}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Reconnect to Real-time Service
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}

export function OverviewCards() {
  // Combine multiple hooks to get all needed real-time functionality
  const {
    metrics,
    isConnected,
    isLoading,
    lastUpdated
  } = useRealtimeDashboardMetrics();

  const {
    connectionHealth,
    isRealTimeEnabled,
    reconnect,
    toggleRealTime
  } = useRealtimeConnection();

  const {
    totalUpdates,
    subscriptionCount
  } = useRealtimeSubscriptions();

  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [previousMetrics, setPreviousMetrics] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Helper function to map ConnectionStatus to component-expected status
  const mapConnectionStatus = (status: typeof connectionHealth.status): 'connected' | 'connecting' | 'disconnected' => {
    switch (status) {
      case 'connected':
        return 'connected';
      case 'connecting':
      case 'reconnecting':
        return 'connecting';
      case 'disconnected':
      default:
        return 'disconnected';
    }
  };

  const mappedConnectionStatus = mapConnectionStatus(connectionHealth.status);

  // Mock data fallback when real-time is unavailable
  const defaultData = {
    totalPlayers: '2,547',
    totalGames: '1,234',
    activeToday: '89',
    winRate: '67.3%'
  };

  // Use metrics data if available, otherwise fall back to default
  const { data: statsQuery } = useDashboardStats({ enabled: !isConnected })
  const stats = statsQuery?.data

  const data = (isConnected && metrics) ? {
    totalPlayers: metrics.totalPlayers?.toString() || defaultData.totalPlayers,
    totalGames: metrics.gamesPlayed?.toString() || defaultData.totalGames,
    activeToday: metrics.activeTournaments?.toString() || defaultData.activeToday,
    winRate: `${metrics.avgEloRating || 67.3}%`
  } : stats ? {
    totalPlayers: (stats.totalPlayers ?? 0).toLocaleString(),
    totalGames: (stats.totalGames ?? 0).toLocaleString(),
    activeToday: (stats.activeTournaments ?? 0).toLocaleString(),
    winRate: `${stats.averageElo ?? 67.3}%`
  } : defaultData;

  // Track data updates for animation triggers
  useEffect(() => {
    if (metrics && previousMetrics) {
      setIsUpdating(true);
      const timer = setTimeout(() => setIsUpdating(false), 500);
      return () => clearTimeout(timer);
    }
    if (metrics) {
      setPreviousMetrics(metrics);
    }
  }, [metrics, previousMetrics]);

  const handleStatusClick = () => {
    setShowStatusPanel(true);
  };

  const handleReconnect = async () => {
    try {
      await reconnect();
      setShowStatusPanel(false);
    } catch (error) {
      console.error('Failed to reconnect:', error);
    }
  };

  const handleToggleRealtime = (enabled: boolean) => {
    toggleRealTime();
  };

  return (
    <>
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1 }}
      >
        <MetricCard
          title="Total Players"
          value={data.totalPlayers}
          previousValue={previousMetrics?.totalPlayers}
          change="+12% from last month"
          changeType="positive"
          icon={Users}
          isRealTimeConnected={isConnected}
          connectionStatus={mappedConnectionStatus}
          lastUpdated={lastUpdated}
          updateCount={totalUpdates}
          onStatusClick={handleStatusClick}
          onReconnect={handleReconnect}
          onToggleRealtime={handleToggleRealtime}
          isRealtimeEnabled={isRealTimeEnabled}
          isUpdating={isUpdating}
        />
        
        <MetricCard
          title="Total Games"
          value={data.totalGames}
          previousValue={previousMetrics?.gamesPlayed}
          change="+8% from last month"
          changeType="positive"
          icon={Trophy}
          isRealTimeConnected={isConnected}
          connectionStatus={mappedConnectionStatus}
          lastUpdated={lastUpdated}
          updateCount={totalUpdates}
          onStatusClick={handleStatusClick}
          onReconnect={handleReconnect}
          onToggleRealtime={handleToggleRealtime}
          isRealtimeEnabled={isRealTimeEnabled}
          isUpdating={isUpdating}
        />
        
        <MetricCard
          title="Active Today"
          value={data.activeToday}
          previousValue={previousMetrics?.activeTournaments}
          change="+3% from yesterday"
          changeType="positive"
          icon={Calendar}
          isRealTimeConnected={isConnected}
          connectionStatus={mappedConnectionStatus}
          lastUpdated={lastUpdated}
          updateCount={totalUpdates}
          onStatusClick={handleStatusClick}
          onReconnect={handleReconnect}
          onToggleRealtime={handleToggleRealtime}
          isRealtimeEnabled={isRealTimeEnabled}
          isUpdating={isUpdating}
        />
        
        <MetricCard
          title="Win Rate"
          value={data.winRate}
          previousValue={previousMetrics?.avgEloRating ? `${previousMetrics.avgEloRating}%` : undefined}
          change="-2.1% from last month"
          changeType="negative"
          icon={TrendingUp}
          isRealTimeConnected={isConnected}
          connectionStatus={mappedConnectionStatus}
          lastUpdated={lastUpdated}
          updateCount={totalUpdates}
          onStatusClick={handleStatusClick}
          onReconnect={handleReconnect}
          onToggleRealtime={handleToggleRealtime}
          isRealtimeEnabled={isRealTimeEnabled}
          isUpdating={isUpdating}
        />
      </motion.div>

      <AnimatePresence>
        {showStatusPanel && (
          <RealtimeStatusPanel
            isOpen={showStatusPanel}
            onClose={() => setShowStatusPanel(false)}
            connectionStatus={mappedConnectionStatus}
            lastUpdated={lastUpdated}
            updateCount={totalUpdates}
            onReconnect={handleReconnect}
          />
        )}
      </AnimatePresence>
    </>
  );
}
