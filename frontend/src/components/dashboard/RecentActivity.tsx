'use client';

import { Calendar, Clock, Users, Trophy, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useRealtimeActivityFeed } from '../../hooks/useRealtime';
import { useState, useEffect } from 'react';

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

function ActivityIcon({ type }: { type: 'game' | 'tournament' }) {
  if (type === 'tournament') {
    return <Trophy className="w-5 h-5 text-yellow-400" />;
  }
  return <Calendar className="w-5 h-5 text-blue-400" />;
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
}

function RealtimeActivityItem({ activity, isNew }: RealtimeActivityItemProps) {
  const [showAnimation, setShowAnimation] = useState(isNew);

  useEffect(() => {
    if (isNew) {
      const timer = setTimeout(() => setShowAnimation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  return (
    <div 
      className={`flex items-start space-x-4 p-4 hover:bg-slate-700 rounded-lg transition-all duration-300 ${
        showAnimation ? 'bg-blue-900/30 border-l-4 border-blue-400' : ''
      }`}
    >
      <div className="p-2 bg-slate-700 rounded-lg">
        <ActivityIcon type={activity.type} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-white truncate">
            {activity.title}
            {showAnimation && (
              <span className="ml-2 px-2 py-1 text-xs bg-blue-600 text-blue-100 rounded-full animate-pulse">
                New
              </span>
            )}
          </h4>
          <StatusBadge status={activity.status} />
        </div>
        <p className="text-sm text-slate-400 mt-1">
          {activity.description}
        </p>
        <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{activity.time}</span>
          </div>
          {activity.participants && (
            <div className="flex items-center space-x-1">
              <Users className="w-3 h-3" />
              <span>{activity.participants} players</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface RealtimeStatusIndicatorProps {
  isConnected: boolean;
  onClick: () => void;
}

function RealtimeStatusIndicator({ isConnected, onClick }: RealtimeStatusIndicatorProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center space-x-2 px-3 py-1 rounded-full hover:bg-slate-700 transition-colors"
      aria-label={`Real-time status: ${isConnected ? 'Connected' : 'Disconnected'}`}
    >
      {isConnected ? (
        <>
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-green-400">Live</span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 bg-red-400 rounded-full" />
          <span className="text-xs text-red-400">Offline</span>
        </>
      )}
    </button>
  );
}

export function RecentActivity() {
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set());

  // Real-time activity feed integration
  const {
    data: realtimeActivities,
    isConnected,
    connectionStatus,
    lastUpdated,
    updateCount,
    error
  } = useRealtimeActivityFeed();

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

  // Track new activities for animation
  useEffect(() => {
    if (realtimeActivities && realtimeActivities.length > 0) {
      const currentIds = new Set(realtimeActivities.map(a => a.id));
      const newIds = new Set<string>();
      
      currentIds.forEach(id => {
        if (!newActivityIds.has(id)) {
          newIds.add(id);
        }
      });
      
      if (newIds.size > 0) {
        setNewActivityIds(currentIds);
        // Remove new status after animation
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

  const activities = realtimeActivities || defaultActivities;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recent Activity List */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
          <RealtimeStatusIndicator 
            isConnected={isConnected}
            onClick={() => setShowStatusPanel(true)}
          />
        </div>
        <div className="p-6">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {activities.map((activity) => (
              <RealtimeActivityItem
                key={activity.id}
                activity={activity}
                isNew={newActivityIds.has(activity.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">Quick Stats</h3>
        </div>
        <div className="p-6 space-y-6">
          {/* Today's Activity */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-3">Today's Activity</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Games Completed</span>
                <span className="text-sm font-semibold text-white">47</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Active Players</span>
                <span className="text-sm font-semibold text-white">312</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Tournaments Running</span>
                <span className="text-sm font-semibold text-white">5</span>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-3">System Status</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Data Collection</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-green-400">Active</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Database</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-green-400">Healthy</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Real-time Updates</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                    {isConnected ? 'Connected' : 'Offline'}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Last Update</span>
                <span className="text-sm text-slate-400">
                  {lastUpdated ? lastUpdated.toLocaleTimeString() : '2 min ago'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                <span className="text-white">{updateCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Connection status:</span>
                <span className="text-white capitalize">{connectionStatus}</span>
              </div>
              {error && (
                <div className="text-red-400 text-xs mt-2">
                  Error: {error.message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
