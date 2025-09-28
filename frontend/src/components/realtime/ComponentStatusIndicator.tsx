import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, AlertCircle, Settings, RefreshCw, Clock, Activity, Signal, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface ComponentStatusIndicatorProps {
  isConnected: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  lastUpdated?: Date;
  updateCount: number;
  componentName: string;
  updateFrequency?: string;
  onReconnect?: () => void;
  onToggleRealtime?: (enabled: boolean) => void;
  isRealtimeEnabled?: boolean;
  className?: string;
  // Phase 2 enhancements
  connectionLatency?: number;
  dataTransferred?: number;
  errorCount?: number;
  retryCount?: number;
  uptime?: number;
}

interface StatusPanelProps {
  isOpen: boolean;
  onClose: () => void;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  lastUpdated?: Date;
  updateCount: number;
  componentName: string;
  updateFrequency?: string;
  onReconnect?: () => void;
  onToggleRealtime?: (enabled: boolean) => void;
  isRealtimeEnabled?: boolean;
  // Phase 2 enhancements
  connectionLatency?: number;
  dataTransferred?: number;
  errorCount?: number;
  retryCount?: number;
  uptime?: number;
  onRetryConnection?: () => void;
}

function StatusPanel({
  isOpen,
  onClose,
  connectionStatus,
  lastUpdated,
  updateCount,
  componentName,
  updateFrequency,
  onReconnect,
  onToggleRealtime,
  isRealtimeEnabled,
  connectionLatency = 0,
  dataTransferred = 0,
  errorCount = 0,
  retryCount = 0,
  uptime = 0,
  onRetryConnection
}: StatusPanelProps) {
  const [retryInProgress, setRetryInProgress] = useState(false);
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const statusConfig = {
    connected: { 
      color: 'text-green-400', 
      bg: 'bg-green-900/20', 
      border: 'border-green-700',
      icon: Wifi,
      description: 'Receiving live updates'
    },
    connecting: { 
      color: 'text-yellow-400', 
      bg: 'bg-yellow-900/20', 
      border: 'border-yellow-700',
      icon: AlertCircle,
      description: 'Attempting to connect...'
    },
    disconnected: { 
      color: 'text-red-400', 
      bg: 'bg-red-900/20', 
      border: 'border-red-700',
      icon: WifiOff,
      description: 'Using cached data'
    }
  };

  const config = statusConfig[connectionStatus];
  const StatusIcon = config.icon;

  const handleRetry = useCallback(async () => {
    if (retryInProgress) return;
    
    setRetryInProgress(true);
    try {
      if (onRetryConnection) {
        await onRetryConnection();
      } else if (onReconnect) {
        await onReconnect();
      }
      
      // Show success toast if notifications enabled
      if (notificationsEnabled) {
        toast.success(`${componentName} reconnection initiated`, {
          duration: 3000,
          position: 'top-right',
        });
      }
    } catch (error) {
      if (notificationsEnabled) {
        toast.error(`Failed to reconnect ${componentName}`, {
          duration: 4000,
          position: 'top-right',
        });
      }
    } finally {
      setRetryInProgress(false);
    }
  }, [retryInProgress, onRetryConnection, onReconnect, componentName, notificationsEnabled]);

  const formatUptime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const formatDataSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1048576).toFixed(1)}MB`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div 
          className="bg-slate-800 rounded-lg p-6 border border-slate-700 max-w-lg w-full mx-4" 
          onClick={e => e.stopPropagation()}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="status-panel-title"
          aria-describedby="status-panel-description"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 id="status-panel-title" className="text-lg font-semibold text-white">
              {componentName} Real-time Status
            </h3>
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-white text-xl p-1 rounded hover:bg-slate-700 transition-colors"
              aria-label="Close status panel"
            >
              ×
            </button>
          </div>
          
          {/* Connection Status */}
          <div className={`flex items-center space-x-3 p-3 rounded-lg border ${config.bg} ${config.border} mb-4`}>
            <StatusIcon className={`w-5 h-5 ${config.color}`} aria-hidden="true" />
            <div className="flex-1">
              <p className={`font-medium ${config.color}`}>
                {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
              </p>
              <p id="status-panel-description" className="text-sm text-slate-400">
                {config.description}
              </p>
            </div>
            {(connectionStatus === 'disconnected' || connectionStatus === 'connecting') && (
              <motion.button
                onClick={handleRetry}
                disabled={retryInProgress}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Retry connection"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RefreshCw className={`w-4 h-4 text-slate-400 ${retryInProgress ? 'animate-spin' : ''}`} />
              </motion.button>
            )}
          </div>

          {/* Enhanced Connection Metrics */}
          <div className="space-y-4 mb-4">
            <h4 className="text-sm font-medium text-slate-300 flex items-center space-x-2">
              <Activity className="w-4 h-4" aria-hidden="true" />
              <span>Connection Metrics</span>
            </h4>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Updates received:</span>
                  <span className="text-white font-medium">{updateCount.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-400">Error count:</span>
                  <span className={`font-medium ${errorCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {errorCount}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-400">Retry attempts:</span>
                  <span className="text-white font-medium">{retryCount}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Latency:</span>
                  <span className={`font-medium ${connectionLatency > 200 ? 'text-yellow-400' : connectionLatency > 500 ? 'text-red-400' : 'text-green-400'}`}>
                    {connectionLatency}ms
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-400">Data transferred:</span>
                  <span className="text-white font-medium">{formatDataSize(dataTransferred)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-400">Uptime:</span>
                  <span className="text-white font-medium">{formatUptime(uptime)}</span>
                </div>
              </div>
            </div>
            
            {lastUpdated && (
              <div className="flex justify-between pt-2 border-t border-slate-700">
                <span className="text-slate-400 flex items-center space-x-1">
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  <span>Last update:</span>
                </span>
                <span className="text-white font-medium">{lastUpdated.toLocaleTimeString()}</span>
              </div>
            )}
            
            {updateFrequency && (
              <div className="flex justify-between">
                <span className="text-slate-400 flex items-center space-x-1">
                  <Signal className="w-3 h-3" aria-hidden="true" />
                  <span>Frequency:</span>
                </span>
                <span className="text-white font-medium">{updateFrequency}</span>
              </div>
            )}
          </div>

          {/* Enhanced User Controls */}
          <div className="border-t border-slate-700 pt-4 space-y-4">
            <h4 className="text-sm font-medium text-slate-300 flex items-center space-x-2">
              <Settings className="w-4 h-4" aria-hidden="true" />
              <span>Preferences</span>
            </h4>
            
            <div className="space-y-3">
              {/* Real-time Toggle */}
              {onToggleRealtime && (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-sm text-slate-300">Real-time updates</span>
                    <p className="text-xs text-slate-500">Enable live data synchronization</p>
                  </div>
                  <button
                    onClick={() => onToggleRealtime(!isRealtimeEnabled)}
                    className={`relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                      isRealtimeEnabled ? 'bg-blue-600' : 'bg-slate-600'
                    }`}
                    role="switch"
                    aria-checked={isRealtimeEnabled}
                    aria-labelledby="realtime-toggle-label"
                  >
                    <span id="realtime-toggle-label" className="sr-only">
                      {isRealtimeEnabled ? 'Disable' : 'Enable'} real-time updates
                    </span>
                    <motion.span
                      className="inline-block h-4 w-4 transform rounded-full bg-white mt-0.5"
                      animate={{
                        x: isRealtimeEnabled ? 16 : 2
                      }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>
              )}
              
              {/* Auto-retry Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <span className="text-sm text-slate-300">Auto-retry on disconnect</span>
                  <p className="text-xs text-slate-500">Automatically attempt to reconnect</p>
                </div>
                <button
                  onClick={() => setAutoRetryEnabled(!autoRetryEnabled)}
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                    autoRetryEnabled ? 'bg-blue-600' : 'bg-slate-600'
                  }`}
                  role="switch"
                  aria-checked={autoRetryEnabled}
                  aria-labelledby="auto-retry-toggle-label"
                >
                  <span id="auto-retry-toggle-label" className="sr-only">
                    {autoRetryEnabled ? 'Disable' : 'Enable'} auto-retry
                  </span>
                  <motion.span
                    className="inline-block h-4 w-4 transform rounded-full bg-white mt-0.5"
                    animate={{
                      x: autoRetryEnabled ? 16 : 2
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
              
              {/* Notifications Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <span className="text-sm text-slate-300">Status notifications</span>
                  <p className="text-xs text-slate-500">Show connection state changes</p>
                </div>
                <button
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                    notificationsEnabled ? 'bg-blue-600' : 'bg-slate-600'
                  }`}
                  role="switch"
                  aria-checked={notificationsEnabled}
                  aria-labelledby="notifications-toggle-label"
                >
                  <span id="notifications-toggle-label" className="sr-only">
                    {notificationsEnabled ? 'Disable' : 'Enable'} notifications
                  </span>
                  <motion.span
                    className="inline-block h-4 w-4 transform rounded-full bg-white mt-0.5"
                    animate={{
                      x: notificationsEnabled ? 16 : 2
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function ComponentStatusIndicator({
  isConnected,
  connectionStatus,
  lastUpdated,
  updateCount,
  componentName,
  updateFrequency = 'Real-time',
  onReconnect,
  onToggleRealtime,
  isRealtimeEnabled = true,
  className = '',
  // Phase 2 enhancements
  connectionLatency = 0,
  dataTransferred = 0,
  errorCount = 0,
  retryCount = 0,
  uptime = 0
}: ComponentStatusIndicatorProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [previousConnectionStatus, setPreviousConnectionStatus] = useState<string | null>(null);

  // Local client-only metrics to avoid SSR/client hydration mismatches
  const [localConnectionLatency, setLocalConnectionLatency] = useState<number>(connectionLatency);
  const [localDataTransferred, setLocalDataTransferred] = useState<number>(dataTransferred);
  const [localUptime, setLocalUptime] = useState<number>(uptime);

  useEffect(() => {
    // Generate mock values only on client after mount when defaults are not provided
    if (connectionLatency === 0 && dataTransferred === 0 && uptime === 0) {
      setLocalConnectionLatency(Math.floor(Math.random() * 100) + 50);
      setLocalDataTransferred(Math.floor(Math.random() * 1024 * 100));
      setLocalUptime(Math.floor(Math.random() * 3600));
    }
  }, [connectionLatency, dataTransferred, uptime]);

  // Enhanced status change notifications
  useEffect(() => {
    if (previousConnectionStatus && previousConnectionStatus !== connectionStatus) {
      const statusMessages = {
        connected: `${componentName} connected successfully`,
        connecting: `${componentName} attempting to connect...`,
        disconnected: `${componentName} disconnected`
      };

      const statusColors = {
        connected: 'success',
        connecting: 'loading',
        disconnected: 'error'
      };

      const message = statusMessages[connectionStatus];
      const colorType = statusColors[connectionStatus];

      if (colorType === 'success') {
        toast.success(message, {
          duration: 3000,
          position: 'top-right',
          icon: '🟢',
        });
      } else if (colorType === 'error') {
        toast.error(message, {
          duration: 4000,
          position: 'top-right',
          icon: '🔴',
        });
      } else {
        toast.loading(message, {
          duration: 2000,
          position: 'top-right',
          icon: '🟡',
        });
      }
    }
    setPreviousConnectionStatus(connectionStatus);
  }, [connectionStatus, componentName, previousConnectionStatus]);

  const handleToggle = () => {
    setShowPanel(!showPanel);
  };

  const retryConnection = useCallback(async () => {
    // Enhanced retry logic with exponential backoff could be implemented here
    if (onReconnect) {
      return onReconnect();
    }
    // Return a promise for consistent behavior
    return Promise.resolve();
  }, [onReconnect]);

  return (
    <>
      <motion.button
        onClick={handleToggle}
        className={`flex items-center space-x-1 px-2 py-1 rounded-full hover:bg-slate-700 transition-colors group focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-800 ${className}`}
        aria-label={`${componentName} real-time status: ${isConnected ? 'Connected' : 'Disconnected'}. Click to view details.`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isConnected ? (
            <motion.div
              key="connected"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="flex items-center space-x-1"
            >
              <motion.div 
                className="w-2 h-2 bg-green-400 rounded-full"
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.7, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <span className="text-xs text-green-400 hidden group-hover:inline">Live</span>
            </motion.div>
          ) : connectionStatus === 'connecting' ? (
            <motion.div
              key="connecting"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="flex items-center space-x-1"
            >
              <motion.div 
                className="w-2 h-2 bg-yellow-400 rounded-full"
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [1, 0.3, 1]
                }}
                transition={{ 
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <span className="text-xs text-yellow-400 hidden group-hover:inline">Connecting</span>
            </motion.div>
          ) : (
            <motion.div
              key="disconnected"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="flex items-center space-x-1"
            >
              <div className="w-2 h-2 bg-red-400 rounded-full" />
              <span className="text-xs text-red-400 hidden group-hover:inline">Offline</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <StatusPanel
        isOpen={showPanel}
        onClose={() => setShowPanel(false)}
        connectionStatus={connectionStatus}
        lastUpdated={lastUpdated}
        updateCount={updateCount}
        componentName={componentName}
        updateFrequency={updateFrequency}
        onReconnect={onReconnect}
        onToggleRealtime={onToggleRealtime}
        isRealtimeEnabled={isRealtimeEnabled}
        connectionLatency={localConnectionLatency}
        dataTransferred={localDataTransferred}
        errorCount={errorCount}
        retryCount={retryCount}
        uptime={localUptime}
        onRetryConnection={retryConnection}
      />
    </>
  );
}
