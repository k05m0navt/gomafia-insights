import { Suspense } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { OverviewCards } from '@/components/dashboard/OverviewCards';
import { ChartGrid } from '@/components/dashboard/ChartGrid';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function DashboardPage() {
  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar Navigation */}
      <DashboardSidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <DashboardHeader />
        
        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Overview Cards */}
          <Suspense fallback={<LoadingSpinner />}>
            <OverviewCards />
          </Suspense>
          
          {/* Analytics Charts */}
          <Suspense fallback={<LoadingSpinner />}>
            <ChartGrid />
          </Suspense>
          
          {/* Recent Activity */}
          <Suspense fallback={<LoadingSpinner />}>
            <RecentActivity />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
