import { Bell, Search, Settings, User } from 'lucide-react';

export function DashboardHeader() {
  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left Section - Title and Breadcrumb */}
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-white">
            GoMafia Analytics
          </h1>
          <div className="hidden md:flex items-center text-slate-400 text-sm">
            <span>/</span>
            <span className="ml-2">Dashboard</span>
          </div>
        </div>

        {/* Right Section - Search and User Controls */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search players, tournaments..."
              className="bg-slate-700 text-white pl-10 pr-4 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none w-80"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Settings */}
          <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
            <Settings className="w-5 h-5" />
          </button>

          {/* User Profile */}
          <button className="flex items-center space-x-2 p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
            <User className="w-5 h-5" />
            <span className="hidden md:block text-sm">Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
}
