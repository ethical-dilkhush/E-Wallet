import { useState } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import NotificationPanel from './NotificationPanel';
import { useAuth } from '../context/AuthContext';

const titleMap = {
  '/dashboard': 'Dashboard',
  '/transfer': 'Send Money',
  '/topup': 'Add Funds',
  '/transactions': 'Transactions',
  '/sterling-agent': 'Sterling Agent',
  '/profile': 'Profile & Settings',
};

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const title = titleMap[location.pathname] || 'Sterling E-Wallet';

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <NotificationPanel />
    </div>
  );
}
