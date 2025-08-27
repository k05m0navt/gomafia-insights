'use client';

import { Calendar, Clock, Users, Trophy, Wifi, WifiOff, AlertCircle, Activity } from 'lucide-react';
import { useRealtimeActivityFeed, useRealtimeConnection, useRealtimeSubscriptions } from '../../hooks/useRealtime';
import { useRecentActivity as useRecentActivityApi } from '@/hooks/useDashboardData';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ComponentStatusIndicator } from '../realtime/ComponentStatusIndicator';
import toast from 'react-hot-toast';

interface ActivityItem {
  id: string;
  type: 'game' | 'tournament';
  title: string;
  description: string;
  time: string;
  participants?: number;
  status: 'completed' | 'ongoing' | 'upcoming';
  timestamp?: Date;
}

// Helper to produce a deterministic time string for both server and client
function formatTime(value?: string | number | Date) {
  if (!value) return 'Unknown time';
  const d = new Date(value);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function ActivityIcon({ type }: { type: 'game' | 'tournament' }) {
  if (type === 'tournament') {
    return <Trophy className="w-5 h-5 text-yellow-400" aria-hidden="true" />;
  }
  return <Calendar className="w-5 h-5 text-blue-400" aria-hidden="true" />;
}

function StatusBadge({ status }: { status: ActivityItem['status'] }) {
  const statusConfig = {
    completed: {
      color: 'bg-green-900 text-green-300 border-green-700',
      text: 'Completed'
    },
    ongoing: {
      color: 'bg-blue-900 text-blue-300 border-blue-700',
      text: 'Ongoing'
    },
    upcoming: {
      color: 'bg-yellow-900 text-yellow-300 border-yellow-700',
      text: 'Upcoming'
    }
  };

  const config = statusConfig[status];

  return (
    <span className={`px-2 py-1 text-xs rounded-full border ${config.color}`}>
      {config.text}
    </span>
  );
}

interface RealtimeActivityItemProps {
  activity: ActivityItem;
  isNew?: boolean;
  index: number;
}

function RealtimeActivityItem({ activity, isNew, index }: RealtimeActivityItemProps) {
  const [showAnimation, setShowAnimation] = useState(isNew);

  useEffect(() => {
    if (isNew) {
      const timer = setTimeout(() => setShowAnimation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  return (
    <motion.div 
      className={`flex items-start space-x-4 p-4 hover:bg-slate-700 rounded-lg transition-all duration-300 ${
        showAnimation ? 'bg-blue-900/30 border-l-4 border-blue-400' : ''
      }`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ 
        duration: 0.3, 
        delay: index * 0.05,
        type: "spring",
        stiffness: 300,
        damping: 25
      }}
      whileHover={{ scale: 1.01, x: 4 }}
    >
      {/* Update Flash Overlay */}
      <AnimatePresence>
        {showAnimation && (
          <motion.div
            className="absolute inset-0 bg-blue-400/10 rounded-lg pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>

      <motion.div 
        className="p-2 bg-slate-700 rounded-lg"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <ActivityIcon type={activity.type} />
      </motion.div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <motion.h4 
            className="text-sm font-medium text-white truncate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {activity.title}
            <AnimatePresence>
              {showAnimation && (
                <motion.span
                  className="ml-2 px-2 py-1 text-xs bg-blue-600 text-blue-100 rounded-full"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  New
                </motion.span>
              )}
            </AnimatePresence>
          </motion.h4>
          <StatusBadge status={activity.status} />
        </div>
        <motion.p 
          className="text-sm text-slate-400 mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          {activity.description}
        </motion.p>
        <motion.div 
          className="flex items-center space-x-4 mt-2 text-xs text-slate-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" aria-hidden="true" />
            <span>{activity.time}</span>
          </div>
          {activity.participants && (
            <div className="flex items-center space-x-1">
              <Users className="w-3 h-3" aria-hidden="true" />
              <span>{activity.participants} players</span>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

export function RecentActivity() {
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set());
  const previousActivitiesRef = useRef<ActivityItem[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [previousConnectionStatus, setPreviousConnectionStatus] = useState<string | null>(null);

  // Real-time activity feed integration with enhanced hooks
  const {
    activities: realtimeActivities,
    isConnected,
    isLoading
  } = useRealtimeActivityFeed();

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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Avoid SSR/client hydration mismatches by setting lastUpdated on mount only
  useEffect(() => {
    setLastUpdated(new Date());
  }, []);

  // Enhanced connection status change notifications
  useEffect(() => {
    if (previousConnectionStatus && previousConnectionStatus !== mappedConnectionStatus) {
      const statusMessages = {
        connected: 'Activity feed connected successfully',
        connecting: 'Activity feed attempting to connect...',
        disconnected: 'Activity feed disconnected'
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
    setPreviousConnectionStatus(mappedConnectionStatus);
  }, [mappedConnectionStatus, previousConnectionStatus]);

  // Default activities for fallback
  const defaultActivities: ActivityItem[] = [
    {
      id: '1',
      type: 'game',
      title: 'Ranked Game #15432',
      description: 'Mafia victory - 7 players',
      time: '2 minutes ago',
      participants: 7,
      status: 'completed'
    },
    {
      id: '2',
      type: 'tournament',
      title: 'Winter Championship 2024',
      description: 'Quarter Finals - Round 2',
      time: '15 minutes ago',
      participants: 64,
      status: 'ongoing'
    },
    {
      id: '3',
      type: 'game',
      title: 'Training Match #15431',
      description: 'Town victory - 10 players',
      time: '28 minutes ago',
      participants: 10,
      status: 'completed'
    },
    {
      id: '4',
      type: 'tournament',
      title: 'Club League Match',
      description: 'Red Bears vs Blue Eagles',
      time: '1 hour ago',
      participants: 20,
      status: 'completed'
    },
    {
      id: '5',
      type: 'game',
      title: 'Casual Game #15430',
      description: 'Mafia victory - 8 players',
      time: '1 hour ago',
      participants: 8,
      status: 'completed'
    }
  ];

  // Convert RealtimeActivity to ActivityItem format
  const convertedActivities: ActivityItem[] = realtimeActivities 
    ? realtimeActivities.map((activity: any) => ({
        id: activity.id,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        time: activity.timestamp ? formatTime(activity.timestamp) : 'Unknown time',
        participants: activity.participants,
        status: activity.status,
        timestamp: activity.timestamp ? new Date(activity.timestamp) : undefined
      }))
    : [];

  const { data: activityQuery } = useRecentActivityApi(10, { enabled: !isConnected })
  const apiActivities = activityQuery?.data?.activities?.map((a) => ({
    id: a.id,
    type: a.type,
    title: a.title,
    description: a.description,
    time: a.time,
    participants: a.participants,
    status: a.status,
  })) ?? []

  const activities = convertedActivities.length > 0
    ? convertedActivities
    : (apiActivities.length > 0 ? apiActivities : defaultActivities);

  // Track activities updates for animation triggers
  useEffect(() => {
    const prev = previousActivitiesRef.current;
    if (activities && prev.length > 0) {
      const hasChanges = activities.length !== prev.length ||
        activities.some((activity, index) => !prev[index] || activity.id !== prev[index].id);
      if (hasChanges) {
        setIsUpdating(true);
        const timer = setTimeout(() => setIsUpdating(false), 500);
        previousActivitiesRef.current = activities;
        return () => clearTimeout(timer);
      }
    }
    previousActivitiesRef.current = activities;
  }, [activities]);

  // Track new activities for animation
  useEffect(() => {
    if (realtimeActivities && realtimeActivities.length > 0) {
      const currentIds = new Set(realtimeActivities.map((a: any) => String(a.id)));
      const newIds = new Set<string>();
      currentIds.forEach((id) => {
        if (!newActivityIds.has(id)) newIds.add(id);
      });
      if (newIds.size > 0) {
        setNewActivityIds(prev => {
          // Avoid redundant state if equal
          if (prev.size === currentIds.size && Array.from(currentIds).every(id => prev.has(id))) {
            return prev;
          }
          return new Set(currentIds);
        });
        const timer = setTimeout(() => {
          setNewActivityIds(prev => {
            const updated = new Set(prev);
            newIds.forEach(id => updated.delete(id));
            return updated;
          });
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [realtimeActivities, newActivityIds]);

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
    <motion.div 
      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.1 }}
    >
      {/* Recent Activity List */}
      <motion.div 
        className="bg-slate-800 rounded-lg border border-slate-700 relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Enhanced Real-time Status Indicator */}
        <div className="absolute top-4 right-4 z-10">
          <ComponentStatusIndicator
            isConnected={isConnected}
            connectionStatus={mappedConnectionStatus}
            lastUpdated={lastUpdated}
            updateCount={totalUpdates}
            componentName="Activity Feed"
            updateFrequency="Real-time"
            onReconnect={handleReconnect}
            onToggleRealtime={handleToggleRealtime}
            isRealtimeEnabled={isRealTimeEnabled}
            className="hover:bg-slate-700/50"
          />
        </div>

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
                aria-label="Updating activity feed"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <motion.h3 
            className="text-lg font-semibold text-white flex items-center space-x-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Activity className="w-5 h-5 text-blue-400" aria-hidden="true" />
            <span>Recent Activity</span>
          </motion.h3>
        </div>
        <div className="p-6">
          <motion.div 
            className="space-y-4 max-h-96 overflow-y-auto"
            role="feed"
            aria-label="Recent game and tournament activities"
            aria-live="polite"
            aria-relevant="additions"
          >
            <AnimatePresence mode="popLayout">
              {activities.map((activity: ActivityItem, index) => (
                <RealtimeActivityItem
                  key={activity.id}
                  activity={activity}
                  isNew={newActivityIds.has(activity.id)}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>

      {/* Quick Stats - Enhanced with animations */}
      <motion.div 
        className="bg-slate-800 rounded-lg border border-slate-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="p-6 border-b border-slate-700">
          <motion.h3 
            className="text-lg font-semibold text-white"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            Quick Stats
          </motion.h3>
        </div>
        <div className="p-6 space-y-6">
          {/* Today's Activity */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <h4 className="text-sm font-medium text-slate-300 mb-3">Today's Activity</h4>
            <div className="space-y-3">
              <motion.div 
                className="flex justify-between items-center"
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <span className="text-sm text-slate-400">Games Completed</span>
                <span className="text-sm font-semibold text-white">47</span>
              </motion.div>
              <motion.div 
                className="flex justify-between items-center"
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <span className="text-sm text-slate-400">Active Players</span>
                <span className="text-sm font-semibold text-white">312</span>
              </motion.div>
              <motion.div 
                className="flex justify-between items-center"
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <span className="text-sm text-slate-400">Tournaments Running</span>
                <span className="text-sm font-semibold text-white">5</span>
              </motion.div>
            </div>
          </motion.div>

          {/* System Status */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <h4 className="text-sm font-medium text-slate-300 mb-3">System Status</h4>
            <div className="space-y-3">
              <motion.div 
                className="flex justify-between items-center"
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <span className="text-sm text-slate-400">Data Collection</span>
                <div className="flex items-center space-x-2">
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
                  <span className="text-sm text-green-400">Active</span>
                </div>
              </motion.div>
              <motion.div 
                className="flex justify-between items-center"
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <span className="text-sm text-slate-400">Database</span>
                <div className="flex items-center space-x-2">
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
                  <span className="text-sm text-green-400">Healthy</span>
                </div>
              </motion.div>
              <motion.div 
                className="flex justify-between items-center"
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <span className="text-sm text-slate-400">Real-time Updates</span>
                <div className="flex items-center space-x-2">
                  <AnimatePresence mode="wait">
                    {isConnected ? (
                      <motion.div
                        key="connected"
                        className="w-2 h-2 bg-green-400 rounded-full"
                        initial={{ scale: 0 }}
                        animate={{ 
                          scale: [1, 1.2, 1],
                          opacity: [1, 0.7, 1]
                        }}
                        exit={{ scale: 0 }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                    ) : (
                      <motion.div
                        key="disconnected"
                        className="w-2 h-2 bg-red-400 rounded-full"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      />
                    )}
                  </AnimatePresence>
                  <span className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                    {isConnected ? 'Connected' : 'Offline'}
                  </span>
                </div>
              </motion.div>
              <motion.div 
                className="flex justify-between items-center"
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <span className="text-sm text-slate-400">Last Update</span>
                <span className="text-sm text-slate-400">
                  {lastUpdated ? formatTime(lastUpdated) : '2 min ago'}
                </span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Status Panel Modal */}
      {showStatusPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowStatusPanel(false)}>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Activity Feed Status</h3>
              <button onClick={() => setShowStatusPanel(false)} className="text-slate-400 hover:text-white">×</button>
            </div>
            
            <div className={`flex items-center space-x-3 p-3 rounded-lg mb-4 ${
              isConnected ? 'bg-green-900/20' : 'bg-red-900/20'
            }`}>
              {isConnected ? (
                <Wifi className="w-5 h-5 text-green-400" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-400" />
              )}
              <div>
                <p className={`font-medium ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </p>
                <p className="text-sm text-slate-400">
                  Activity feed {isConnected ? 'updating live' : 'using cached data'}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Updates received:</span>
                <span className="text-white">{totalUpdates}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Connection status:</span>
                <span className="text-white capitalize">{connectionHealth.status}</span>
              </div>
              {connectionHealth.error && (
                <div className="text-red-400 text-xs mt-2">
                  Error: {connectionHealth.error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
