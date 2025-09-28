import { 
  BarChart3, 
  Users, 
  Trophy, 
  Calendar, 
  TrendingUp, 
  Database,
  Shield,
  Activity,
  Home
} from 'lucide-react';

const navigationItems = [
  { 
    name: 'Overview', 
    icon: Home, 
    href: '/', 
    current: true 
  },
  { 
    name: 'Players', 
    icon: Users, 
    href: '/players', 
    current: false 
  },
  { 
    name: 'Tournaments', 
    icon: Trophy, 
    href: '/tournaments', 
    current: false 
  },
  { 
    name: 'Games', 
    icon: Calendar, 
    href: '/games', 
    current: false 
  },
  { 
    name: 'Analytics', 
    icon: BarChart3, 
    href: '/analytics', 
    current: false 
  },
  { 
    name: 'Trends', 
    icon: TrendingUp, 
    href: '/trends', 
    current: false 
  },
  { 
    name: 'Clubs', 
    icon: Shield, 
    href: '/clubs', 
    current: false 
  },
  { 
    name: 'Data Collection', 
    icon: Database, 
    href: '/data-collection', 
    current: false 
  },
  { 
    name: 'System Status', 
    icon: Activity, 
    href: '/status', 
    current: false 
  },
];

export function DashboardSidebar() {
  return (
    <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">GoMafia</h2>
            <p className="text-xs text-slate-400">Insights</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                item.current
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </a>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <div className="text-xs text-slate-500 text-center">
          <p>Version 1.0.0</p>
          <p className="mt-1">Data updated: Live</p>
        </div>
      </div>
    </aside>
  );
}
