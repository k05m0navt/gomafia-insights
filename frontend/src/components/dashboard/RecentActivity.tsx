import { Calendar, Clock, Users, Trophy } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'game' | 'tournament';
  title: string;
  description: string;
  time: string;
  participants?: number;
  status: 'completed' | 'ongoing' | 'upcoming';
}

const mockActivities: ActivityItem[] = [
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

export function RecentActivity() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recent Activity List */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {mockActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-4 p-4 hover:bg-slate-700 rounded-lg transition-colors">
                <div className="p-2 bg-slate-700 rounded-lg">
                  <ActivityIcon type={activity.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-white truncate">
                      {activity.title}
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
                <span className="text-sm text-slate-400">Last Update</span>
                <span className="text-sm text-slate-400">2 min ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
