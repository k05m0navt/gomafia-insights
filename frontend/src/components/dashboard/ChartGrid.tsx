'use client';

import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

import { Line, Bar } from 'react-chartjs-2';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useRealtimeChartData } from '../../hooks/useRealtime';
import { useState, useRef, useEffect } from 'react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Chart.js default configuration with smooth animations
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 750,
    easing: 'easeInOutQuart' as const
  },
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: '#cbd5e1', // slate-300
        font: {
          size: 12
        }
      }
    },
    tooltip: {
      backgroundColor: '#334155', // slate-700
      titleColor: '#f1f5f9', // slate-100
      bodyColor: '#cbd5e1', // slate-300
      borderColor: '#475569', // slate-600
      borderWidth: 1
    }
  },
  scales: {
    x: {
      grid: {
        color: '#475569', // slate-600
      },
      ticks: {
        color: '#94a3b8', // slate-400
      }
    },
    y: {
      grid: {
        color: '#475569', // slate-600
      },
      ticks: {
        color: '#94a3b8', // slate-400
      }
    }
  }
};

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  isRealTimeConnected: boolean;
  onStatusClick: () => void;
  hasRecentUpdate?: boolean;
}

function ChartCard({ title, children, isRealTimeConnected, onStatusClick, hasRecentUpdate }: ChartCardProps) {
  const [showUpdateIndicator, setShowUpdateIndicator] = useState(hasRecentUpdate);

  useEffect(() => {
    if (hasRecentUpdate) {
      setShowUpdateIndicator(true);
      const timer = setTimeout(() => setShowUpdateIndicator(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [hasRecentUpdate]);

  return (
    <div className={`bg-slate-800 rounded-lg p-6 border border-slate-700 relative transition-all duration-300 ${
      showUpdateIndicator ? 'ring-2 ring-blue-400/50' : ''
    }`}>
      {/* Real-time Status Indicator */}
      <div className="absolute top-4 right-4 flex items-center space-x-2">
        {showUpdateIndicator && (
          <span className="px-2 py-1 text-xs bg-blue-600 text-blue-100 rounded-full animate-pulse">
            Updated
          </span>
        )}
        <button
          onClick={onStatusClick}
          className="p-1 rounded-full hover:bg-slate-700 transition-colors"
          aria-label={`Chart real-time status: ${isRealTimeConnected ? 'Connected' : 'Disconnected'}`}
        >
          {isRealTimeConnected ? (
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          ) : (
            <div className="w-2 h-2 bg-red-400 rounded-full" />
          )}
        </button>
      </div>

      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div className="h-64">
        {children}
      </div>
    </div>
  );
}

interface RealtimeChartStatusPanelProps {
  isOpen: boolean;
  onClose: () => void;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  lastUpdated?: Date;
  updateCount: number;
  chartName: string;
}

function RealtimeChartStatusPanel({ 
  isOpen, 
  onClose, 
  connectionStatus, 
  lastUpdated, 
  updateCount, 
  chartName 
}: RealtimeChartStatusPanelProps) {
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
          <h3 className="text-lg font-semibold text-white">{chartName} Status</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">×</button>
        </div>
        
        <div className={`flex items-center space-x-3 p-3 rounded-lg ${config.bg} mb-4`}>
          <StatusIcon className={`w-5 h-5 ${config.color}`} />
          <div>
            <p className={`font-medium ${config.color}`}>
              {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
            </p>
            <p className="text-sm text-slate-400">
              Chart data {connectionStatus === 'connected' ? 'updating live' : 'using cached data'}
            </p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Data updates:</span>
            <span className="text-white">{updateCount}</span>
          </div>
          {lastUpdated && (
            <div className="flex justify-between">
              <span className="text-slate-400">Last update:</span>
              <span className="text-white">{lastUpdated.toLocaleTimeString()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-400">Update frequency:</span>
            <span className="text-white">Every 15 seconds</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChartGrid() {
  const [activeStatusPanel, setActiveStatusPanel] = useState<string | null>(null);
  const [chartUpdateTriggers, setChartUpdateTriggers] = useState<Record<string, number>>({});
  
  // Real-time chart data integration
  const {
    data: realtimeChartData,
    isConnected,
    connectionStatus,
    lastUpdated,
    updateCount,
    error
  } = useRealtimeChartData();

  // Track chart updates for animation triggers
  useEffect(() => {
    if (realtimeChartData) {
      const newTriggers: Record<string, number> = {};
      Object.keys(realtimeChartData).forEach(chartKey => {
        newTriggers[chartKey] = Date.now();
      });
      setChartUpdateTriggers(newTriggers);
    }
  }, [realtimeChartData]);

  // Default chart data for fallback
  const defaultChartData = {
    gamesOverTime: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Games Played',
          data: [1200, 1350, 1180, 1420, 1650, 1580],
          borderColor: '#3b82f6', // blue-500
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    },
    
    playerRole: {
      labels: ['Mafia', 'Civilian', 'Sheriff', 'Doctor', 'Other'],
      datasets: [
        {
          label: 'Role Distribution',
          data: [25, 45, 15, 10, 5],
          backgroundColor: [
            '#ef4444', // red-500
            '#22c55e', // green-500
            '#3b82f6', // blue-500
            '#f59e0b', // amber-500
            '#8b5cf6'  // violet-500
          ],
          borderColor: '#475569', // slate-600
          borderWidth: 1
        }
      ]
    },

    winRateTrends: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [
        {
          label: 'Mafia Win Rate',
          data: [52, 48, 55, 51],
          borderColor: '#ef4444', // red-500
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4
        },
        {
          label: 'Town Win Rate',
          data: [48, 52, 45, 49],
          borderColor: '#22c55e', // green-500
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4
        }
      ]
    },

    tournamentParticipation: {
      labels: ['Club A', 'Club B', 'Club C', 'Club D', 'Club E'],
      datasets: [
        {
          label: 'Participants',
          data: [245, 198, 167, 134, 89],
          backgroundColor: 'rgba(59, 130, 246, 0.8)', // blue-500
          borderColor: '#3b82f6',
          borderWidth: 1
        }
      ]
    }
  };

  // Use real-time data if available, otherwise fall back to defaults
  const chartData = realtimeChartData || defaultChartData;

  const handleStatusClick = (chartName: string) => {
    setActiveStatusPanel(chartName);
  };

  const hasRecentUpdate = (chartKey: string) => {
    const updateTime = chartUpdateTriggers[chartKey];
    return updateTime && (Date.now() - updateTime) < 3000;
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Games Over Time */}
        <ChartCard
          title="Games Over Time"
          isRealTimeConnected={isConnected}
          onStatusClick={() => handleStatusClick('gamesOverTime')}
          hasRecentUpdate={hasRecentUpdate('gamesOverTime')}
        >
          <Line data={chartData.gamesOverTime} options={chartOptions} />
        </ChartCard>

        {/* Player Role Distribution */}
        <ChartCard
          title="Role Distribution"
          isRealTimeConnected={isConnected}
          onStatusClick={() => handleStatusClick('playerRole')}
          hasRecentUpdate={hasRecentUpdate('playerRole')}
        >
          <Bar data={chartData.playerRole} options={chartOptions} />
        </ChartCard>

        {/* Win Rate Trends */}
        <ChartCard
          title="Win Rate Trends"
          isRealTimeConnected={isConnected}
          onStatusClick={() => handleStatusClick('winRateTrends')}
          hasRecentUpdate={hasRecentUpdate('winRateTrends')}
        >
          <Line data={chartData.winRateTrends} options={chartOptions} />
        </ChartCard>

        {/* Tournament Participation */}
        <ChartCard
          title="Tournament Participation"
          isRealTimeConnected={isConnected}
          onStatusClick={() => handleStatusClick('tournamentParticipation')}
          hasRecentUpdate={hasRecentUpdate('tournamentParticipation')}
        >
          <Bar data={chartData.tournamentParticipation} options={chartOptions} />
        </ChartCard>
      </div>

      {/* Status Panel Modals */}
      {activeStatusPanel && (
        <RealtimeChartStatusPanel
          isOpen={true}
          onClose={() => setActiveStatusPanel(null)}
          connectionStatus={connectionStatus}
          lastUpdated={lastUpdated}
          updateCount={updateCount}
          chartName={activeStatusPanel.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
        />
      )}
    </>
  );
}
