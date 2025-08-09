import { Users, Trophy, Calendar, TrendingUp } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
}

function MetricCard({ title, value, change, changeType, icon: Icon }: MetricCardProps) {
  const changeColorClass = {
    positive: 'text-green-400',
    negative: 'text-red-400',
    neutral: 'text-slate-400'
  }[changeType];

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
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

export async function OverviewCards() {
  // TODO: Replace with actual Prisma queries
  // For now, using mock data to demonstrate the structure
  const metrics = [
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => (
        <MetricCard
          key={index}
          title={metric.title}
          value={metric.value}
          change={metric.change}
          changeType={metric.changeType}
          icon={metric.icon}
        />
      ))}
    </div>
  );
}
