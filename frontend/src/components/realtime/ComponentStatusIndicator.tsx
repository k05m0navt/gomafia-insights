import { useState } from 'react';
import { Wifi, WifiOff, AlertCircle, Settings, RefreshCw } from 'lucide-react';

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
  isRealtimeEnabled
}: StatusPanelProps) {
  if (!isOpen) return null;

  const statusConfig = {
    connected: { 
      color: 'text-green-400', 
      bg: 'bg-green-900/20', 
      border: 'border-green-700',
      icon: Wifi 
    },
    connecting: { 
      color: 'text-yellow-400', 
      bg: 'bg-yellow-900/20', 
      border: 'border-yellow-700',
      icon: AlertCircle 
    },
    disconnected: { 
      color: 'text-red-400', 
      bg: 'bg-red-900/20', 
      border: 'border-red-700',
      icon: WifiOff 
    }
  };

  const config = statusConfig[connectionStatus];
  const StatusIcon = config.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">{componentName} Real-time Status</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">×</button>
        </div>
        
        {/* Connection Status */}
        <div className={`flex items-center space-x-3 p-3 rounded-lg border ${config.bg} ${config.border} mb-4`}>
          <StatusIcon className={`w-5 h-5 ${config.color}`} />
          <div className="flex-1">
            <p className={`font-medium ${config.color}`}>
              {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
            </p>
            <p className="text-sm text-slate-400">
              {connectionStatus === 'connected' 
                ? 'Receiving live updates' 
                : connectionStatus === 'connecting'
                ? 'Attempting to connect...'
                : 'Using cached data'
              }
            </p>
          </div>
          {connectionStatus === 'disconnected' && onReconnect && (
            <button
              onClick={onReconnect}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              aria-label="Reconnect"
            >
              <RefreshCw className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>

        {/* Statistics */}
        <div className="space-y-3 mb-4">
          <h4 className="text-sm font-medium text-slate-300 flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Connection Details</span>
          </h4>
          
          <div className="space-y-2 text-sm">
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
            
            {updateFrequency && (
              <div className="flex justify-between">
                <span className="text-slate-400">Update frequency:</span>
                <span className="text-white">{updateFrequency}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-slate-400">Component:</span>
              <span className="text-white">{componentName}</span>
            </div>
          </div>
        </div>

        {/* User Controls */}
        {onToggleRealtime && (
          <div className="border-t border-slate-700 pt-4">
            <h4 className="text-sm font-medium text-slate-300 mb-3">Preferences</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Real-time updates</span>
              <button
                onClick={() => onToggleRealtime(!isRealtimeEnabled)}
                className={`relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                  isRealtimeEnabled ? 'bg-blue-600' : 'bg-slate-600'
                }`}
                role="switch"
                aria-checked={isRealtimeEnabled}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isRealtimeEnabled ? 'translate-x-4' : 'translate-x-0.5'
                  } mt-0.5`}
                />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
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
  className = ''
}: ComponentStatusIndicatorProps) {
  const [showPanel, setShowPanel] = useState(false);

  const handleToggle = () => {
    setShowPanel(!showPanel);
  };

  return (
    <>
      <button
        onClick={handleToggle}
        className={`flex items-center space-x-1 px-2 py-1 rounded-full hover:bg-slate-700 transition-colors group ${className}`}
        aria-label={`${componentName} real-time status: ${isConnected ? 'Connected' : 'Disconnected'}`}
      >
        {isConnected ? (
          <>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-green-400 hidden group-hover:inline">Live</span>
          </>
        ) : connectionStatus === 'connecting' ? (
          <>
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
            <span className="text-xs text-yellow-400 hidden group-hover:inline">Connecting</span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 bg-red-400 rounded-full" />
            <span className="text-xs text-red-400 hidden group-hover:inline">Offline</span>
          </>
        )}
      </button>

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
      />
    </>
  );
}
