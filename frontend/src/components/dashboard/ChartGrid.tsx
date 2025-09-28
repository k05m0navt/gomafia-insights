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
import { Wifi, WifiOff, AlertCircle, TrendingUp, BarChart3, PieChart, Activity } from 'lucide-react';
import { useRealtimeChartData, useRealtimeConnection, useRealtimeSubscriptions } from '../../hooks/useRealtime';
import { useDashboardCharts } from '@/hooks/useDashboardData';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ComponentStatusIndicator } from '../realtime/ComponentStatusIndicator';
import toast from 'react-hot-toast';

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
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  lastUpdated?: Date;
  updateCount: number;
  onReconnect?: () => void;
  onToggleRealtime?: (enabled: boolean) => void;
  isRealtimeEnabled?: boolean;
  hasRecentUpdate?: boolean;
  chartName: string;
  index: number;
  isUpdating?: boolean;
}

function ChartCard({ 
  title, 
  children, 
  isRealTimeConnected, 
  connectionStatus,
  lastUpdated,
  updateCount,
  onReconnect,
  onToggleRealtime,
  isRealtimeEnabled = true,
  hasRecentUpdate,
  chartName,
  index,
  isUpdating = false
}: ChartCardProps) {
  const [showUpdateIndicator, setShowUpdateIndicator] = useState(hasRecentUpdate);
  const chartRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (hasRecentUpdate) {
      setShowUpdateIndicator(true);
      const timer = setTimeout(() => setShowUpdateIndicator(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [hasRecentUpdate]);

  // Chart.js memory management
  useEffect(() => {
    return () => {
      // Cleanup Chart.js instance on unmount
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  return (
    <motion.div 
      className={`bg-slate-800 rounded-lg p-6 border border-slate-700 relative transition-all duration-300 ${
        showUpdateIndicator ? 'ring-2 ring-blue-400/50' : ''
      }`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.1,
        type: "spring",
        stiffness: 300,
        damping: 25
      }}
      whileHover={{ scale: 1.02, y: -4 }}
      layout
    >
      {/* Enhanced Real-time Status Indicator */}
      <div className="absolute top-4 right-4 z-10">
        <ComponentStatusIndicator
          isConnected={isRealTimeConnected}
          connectionStatus={connectionStatus}
          lastUpdated={lastUpdated}
          updateCount={updateCount}
          componentName={`${title} Chart`}
          updateFrequency="Every 15 seconds"
          onReconnect={onReconnect}
          onToggleRealtime={onToggleRealtime}
          isRealtimeEnabled={isRealtimeEnabled}
          className="hover:bg-slate-700/50"
        />
      </div>

      {/* Update Flash Overlay */}
      <AnimatePresence>
        {showUpdateIndicator && (
          <motion.div
            className="absolute inset-0 bg-blue-400/10 rounded-lg pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isUpdating && (
          <motion.div
            className="absolute inset-0 bg-slate-800/80 rounded-lg flex items-center justify-center backdrop-blur-sm z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              aria-label={`Updating ${title} chart`}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.h3 
        className="text-lg font-semibold text-white mb-4 flex items-center space-x-2"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}
      >
        {getChartIcon(chartName)}
        <span>{title}</span>
      </motion.h3>
      
      <motion.div 
        className="h-64"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: index * 0.1 + 0.3 }}
        role="img"
        aria-label={`${title} data visualization`}
        tabIndex={0}
      >
        {children}
      </motion.div>

      {/* Update Badge */}
      <AnimatePresence>
        {showUpdateIndicator && (
          <motion.div
            className="absolute bottom-4 left-4 bg-blue-600 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1"
            initial={{ scale: 0, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            <Activity className="w-3 h-3" aria-hidden="true" />
            <span>Updated</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Helper function to get chart icons
function getChartIcon(chartName: string): React.ReactNode {
  const iconClass = "w-5 h-5 text-blue-400";
  
  switch (chartName) {
    case 'gamesOverTime':
    case 'winRateTrends':
      return <TrendingUp className={iconClass} aria-hidden="true" />;
    case 'playerRole':
      return <PieChart className={iconClass} aria-hidden="true" />;
    case 'tournamentParticipation':
      return <BarChart3 className={iconClass} aria-hidden="true" />;
    default:
      return <Activity className={iconClass} aria-hidden="true" />;
  }
}

export function ChartGrid() {
  const [activeStatusPanel, setActiveStatusPanel] = useState<string | null>(null);
  const [chartUpdateTriggers, setChartUpdateTriggers] = useState<Record<string, number>>({});
  const [previousChartData, setPreviousChartData] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [previousConnectionStatus, setPreviousConnectionStatus] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<number>(30);
  
  // Real-time chart data integration with enhanced hooks
  const {
    chartData: realtimeChartData,
    isConnected,
    lastUpdated,
    isLoading
  } = useRealtimeChartData();

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

  // Enhanced connection status change notifications
  useEffect(() => {
    if (previousConnectionStatus && previousConnectionStatus !== mappedConnectionStatus) {
      const statusMessages = {
        connected: 'Chart data feed connected successfully',
        connecting: 'Chart data feed attempting to connect...',
        disconnected: 'Chart data feed disconnected'
      };

      const statusColors = {
        connected: 'success',
        connecting: 'loading',
        disconnected: 'error'
      };

      const message = statusMessages[mappedConnectionStatus];
      const colorType = statusColors[mappedConnectionStatus];

      if (colorType === 'success') {
        toast.success(message, {
          duration: 3000,
          position: 'top-right',
          icon: '📊',
        });
      } else if (colorType === 'error') {
        toast.error(message, {
          duration: 4000,
          position: 'top-right',
          icon: '📊',
        });
      } else {
        toast.loading(message, {
          duration: 2000,
          position: 'top-right',
          icon: '📊',
        });
      }
    }
    setPreviousConnectionStatus(mappedConnectionStatus);
  }, [mappedConnectionStatus, previousConnectionStatus]);

  // Track chart updates for animation triggers and update detection
  useEffect(() => {
    if (realtimeChartData) {
      const newTriggers: Record<string, number> = {};
      Object.keys(realtimeChartData).forEach(chartKey => {
        newTriggers[chartKey] = Date.now();
      });
      setChartUpdateTriggers(newTriggers);

      // Check for data changes to trigger update animation
      if (previousChartData && JSON.stringify(previousChartData) !== JSON.stringify(realtimeChartData)) {
        setIsUpdating(true);
        const timer = setTimeout(() => setIsUpdating(false), 500);
        return () => clearTimeout(timer);
      }
    }
    setPreviousChartData(realtimeChartData);
  }, [realtimeChartData, previousChartData]);

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
  const { data: chartsQuery, isFetching: isFetchingCharts } = useDashboardCharts(timeframe, { enabled: !isConnected })
  const charts = chartsQuery?.data

  // Convert real-time data to Chart.js format if needed
  const convertedChartData = realtimeChartData ? {
    gamesOverTime: {
      labels: realtimeChartData.gamesOverTime.map(item => item.date),
      datasets: [
        {
          label: 'Games Played',
          data: realtimeChartData.gamesOverTime.map(item => item.count),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    },
    
    playerRole: {
      labels: realtimeChartData.roleDistribution.map(item => item.role),
      datasets: [
        {
          label: 'Role Distribution',
          data: realtimeChartData.roleDistribution.map(item => item.count),
          backgroundColor: [
            '#ef4444',
            '#22c55e',
            '#3b82f6',
            '#f59e0b',
            '#8b5cf6'
          ],
          borderColor: '#475569',
          borderWidth: 1
        }
      ]
    },

    winRateTrends: {
      labels: realtimeChartData.winRateTrends.map(item => item.date),
      datasets: [
        {
          label: 'Win Rate',
          data: realtimeChartData.winRateTrends.map(item => item.winRate),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4
        }
      ]
    },

    tournamentParticipation: {
      labels: realtimeChartData.tournamentParticipation.map(item => item.tournament),
      datasets: [
        {
          label: 'Participants',
          data: realtimeChartData.tournamentParticipation.map(item => item.participants),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: '#3b82f6',
          borderWidth: 1
        }
      ]
    }
  } : charts ? {
    gamesOverTime: {
      labels: charts.gamesOverTime.labels,
      datasets: [
        {
          label: 'Games Played',
          data: charts.gamesOverTime.values,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    },
    playerRole: {
      labels: charts.roleDistribution.labels,
      datasets: [
        {
          label: 'Role Distribution',
          data: charts.roleDistribution.values,
          backgroundColor: [
            '#ef4444',
            '#22c55e',
            '#3b82f6',
            '#f59e0b',
            '#8b5cf6'
          ],
          borderColor: '#475569',
          borderWidth: 1
        }
      ]
    },
    winRateTrends: {
      labels: charts.winRates.labels,
      datasets: [
        {
          label: 'Win Rate',
          data: charts.winRates.values,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4
        }
      ]
    },
    tournamentParticipation: {
      labels: charts.tournamentParticipation.labels,
      datasets: [
        {
          label: 'Participants',
          data: charts.tournamentParticipation.values,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: '#3b82f6',
          borderWidth: 1
        }
      ]
    }
  } : defaultChartData;

  // Effective updating state includes offline refetching
  const effectiveIsUpdating = isUpdating || (!isConnected && isFetchingCharts);

  const handleStatusClick = (chartName: string) => {
    setActiveStatusPanel(chartName);
  };

  const handleReconnect = async () => {
    try {
      await reconnect();
      setActiveStatusPanel(null);
    } catch (error) {
      console.error('Failed to reconnect:', error);
    }
  };

  const handleToggleRealtime = (enabled: boolean) => {
    toggleRealTime();
  };

  const hasRecentUpdate = (chartKey: string): boolean => {
    const updateTime = chartUpdateTriggers[chartKey];
    return !!(updateTime && (Date.now() - updateTime) < 3000);
  };

  return (
    <>
      {/* Timeframe Selector */}
      <div className="flex items-center justify-end mb-2">
        <div role="group" aria-label="Select timeframe" className="inline-flex rounded-lg border border-slate-700 bg-slate-800 p-1">
          {[7, 30, 90].map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                timeframe === tf
                  ? 'bg-blue-600 text-white'
                  : 'bg-transparent text-slate-300 hover:bg-slate-700'
              }`}
              aria-pressed={timeframe === tf}
              aria-label={`${tf} day timeframe`}
            >
              {tf}d
            </button>
          ))}
        </div>
      </div>
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1 }}
        role="region"
        aria-label="Real-time analytics charts"
      >
        {/* Games Over Time */}
        <ChartCard
          title="Games Over Time"
          isRealTimeConnected={isConnected}
          connectionStatus={mappedConnectionStatus}
          lastUpdated={lastUpdated}
          updateCount={totalUpdates}
          onReconnect={handleReconnect}
          onToggleRealtime={handleToggleRealtime}
          isRealtimeEnabled={isRealTimeEnabled}
          hasRecentUpdate={hasRecentUpdate('gamesOverTime')}
          chartName="gamesOverTime"
          index={0}
          isUpdating={effectiveIsUpdating}
        >
          <Line data={convertedChartData.gamesOverTime} options={chartOptions} />
        </ChartCard>

        {/* Player Role Distribution */}
        <ChartCard
          title="Role Distribution"
          isRealTimeConnected={isConnected}
          connectionStatus={mappedConnectionStatus}
          lastUpdated={lastUpdated}
          updateCount={totalUpdates}
          onReconnect={handleReconnect}
          onToggleRealtime={handleToggleRealtime}
          isRealtimeEnabled={isRealTimeEnabled}
          hasRecentUpdate={hasRecentUpdate('playerRole')}
          chartName="playerRole"
          index={1}
          isUpdating={effectiveIsUpdating}
        >
          <Bar data={convertedChartData.playerRole} options={chartOptions} />
        </ChartCard>

        {/* Win Rate Trends */}
        <ChartCard
          title="Win Rate Trends"
          isRealTimeConnected={isConnected}
          connectionStatus={mappedConnectionStatus}
          lastUpdated={lastUpdated}
          updateCount={totalUpdates}
          onReconnect={handleReconnect}
          onToggleRealtime={handleToggleRealtime}
          isRealtimeEnabled={isRealTimeEnabled}
          hasRecentUpdate={hasRecentUpdate('winRateTrends')}
          chartName="winRateTrends"
          index={2}
          isUpdating={effectiveIsUpdating}
        >
          <Line data={convertedChartData.winRateTrends} options={chartOptions} />
        </ChartCard>

        {/* Tournament Participation */}
        <ChartCard
          title="Tournament Participation"
          isRealTimeConnected={isConnected}
          connectionStatus={mappedConnectionStatus}
          lastUpdated={lastUpdated}
          updateCount={totalUpdates}
          onReconnect={handleReconnect}
          onToggleRealtime={handleToggleRealtime}
          isRealtimeEnabled={isRealTimeEnabled}
          hasRecentUpdate={hasRecentUpdate('tournamentParticipation')}
          chartName="tournamentParticipation"
          index={3}
          isUpdating={effectiveIsUpdating}
        >
          <Bar data={convertedChartData.tournamentParticipation} options={chartOptions} />
        </ChartCard>
      </motion.div>
    </>
  );
}
