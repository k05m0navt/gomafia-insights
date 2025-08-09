'use client';

import { Users, Trophy, Calendar, TrendingUp, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useRealtimeDashboardMetrics } from '../../hooks/useRealtime';
import { useState } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  isRealTimeConnected?: boolean;
  onStatusClick?: () => void;
}

function MetricCard({ title, value, change, changeType, icon: Icon, isRealTimeConnected, onStatusClick }: MetricCardProps) {
  const changeColorClass = {
    positive: 'text-green-400',
    negative: 'text-red-400',
    neutral: 'text-slate-400'
  }[changeType];

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 relative">
      {/* Real-time Status Indicator */}
      <div className="absolute top-3 right-3">
        <button
          onClick={onStatusClick}
          className="p-1 rounded-full hover:bg-slate-700 transition-colors group"
          aria-label={`Real-time status: ${isRealTimeConnected ? 'Connected' : 'Disconnected'}`}
        >
          {isRealTimeConnected ? (
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          ) : (
            <div className="w-2 h-2 bg-red-400 rounded-full" />
          )}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
          <p className={`text-sm mt-2 ${changeColorClass}`}>
            {change}
          </p>
        </div>
        <div className="p-3 bg-slate-700 rounded-lg">
          <Icon className="w-6 h-6 text-blue-400" />
        </div>
      </div>
    </div>
  );
}

interface RealtimeStatusPanelProps {
  isOpen: boolean;
  onClose: () => void;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  lastUpdated?: Date;
  updateCount: number;
}

function RealtimeStatusPanel({ isOpen, onClose, connectionStatus, lastUpdated, updateCount }: RealtimeStatusPanelProps) {
  if (!isOpen) return null;

  const statusConfig = {
    connected: { color: 'text-green-400', bg: 'bg-green-900/20', icon: Wifi },
    connecting: { color: 'text-yellow-400', bg: 'bg-yellow-900/20', icon: AlertCircle },
    disconnected: { color: 'text-red-400', bg: 'bg-red-900/20', icon: WifiOff }
  };

  const config = statusConfig[connectionStatus];
  const StatusIcon = config.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Real-time Status</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">×</button>
        </div>
        
        <div className={`flex items-center space-x-3 p-3 rounded-lg ${config.bg} mb-4`}>
          <StatusIcon className={`w-5 h-5 ${config.color}`} />
          <div>
            <p className={`font-medium ${config.color}`}>
              {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
            </p>
            <p className="text-sm text-slate-400">
              Dashboard metrics {connectionStatus === 'connected' ? 'updating live' : 'using cached data'}
            </p>
          </div>
        </div>

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
        </div>
      </div>
    </div>
  );
}

export function OverviewCards() {
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  
  // Real-time hook integration
  const {
    data: realtimeMetrics,
    isConnected,
    connectionStatus,
    lastUpdated,
    updateCount,
    error
  } = useRealtimeDashboardMetrics();

  // Fallback to mock data when real-time is unavailable
  const defaultMetrics = [
    {
      title: 'Total Players',
      value: '2,847',
      change: '+12% from last month',
      changeType: 'positive' as const,
      icon: Users
    },
    {
      title: 'Active Tournaments',
      value: '23',
      change: '+5 this week',
      changeType: 'positive' as const,
      icon: Trophy
    },
    {
      title: 'Games Played',
      value: '15,432',
      change: '+234 today',
      changeType: 'positive' as const,
      icon: Calendar
    },
    {
      title: 'Avg ELO Rating',
      value: '1,247',
      change: '+8 pts this month',
      changeType: 'positive' as const,
      icon: TrendingUp
    }
  ];

  // Use real-time data if available, otherwise fall back to mock data
  const metrics = realtimeMetrics || defaultMetrics;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard
            key={index}
            title={metric.title}
            value={metric.value}
            change={metric.change}
            changeType={metric.changeType}
            icon={metric.icon}
            isRealTimeConnected={isConnected}
            onStatusClick={() => setShowStatusPanel(true)}
          />
        ))}
      </div>

      <RealtimeStatusPanel
        isOpen={showStatusPanel}
        onClose={() => setShowStatusPanel(false)}
        connectionStatus={connectionStatus}
        lastUpdated={lastUpdated}
        updateCount={updateCount}
      />
    </>
  );
}
