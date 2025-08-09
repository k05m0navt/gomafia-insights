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

// Chart.js default configuration
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
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

export function ChartGrid() {
  // Mock data - TODO: Replace with actual Prisma data
  const gamesOverTimeData = {
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
  };

  const playerRoleData = {
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
  };

  const winRateTrendsData = {
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
  };

  const tournamentParticipationData = {
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
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Games Over Time */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Games Over Time</h3>
        <div className="h-64">
          <Line data={gamesOverTimeData} options={chartOptions} />
        </div>
      </div>

      {/* Player Role Distribution */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Role Distribution</h3>
        <div className="h-64">
          <Bar data={playerRoleData} options={chartOptions} />
        </div>
      </div>

      {/* Win Rate Trends */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Win Rate Trends</h3>
        <div className="h-64">
          <Line data={winRateTrendsData} options={chartOptions} />
        </div>
      </div>

      {/* Tournament Participation */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Tournament Participation</h3>
        <div className="h-64">
          <Bar data={tournamentParticipationData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}
