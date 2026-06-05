import { Menu, Bell } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export default function Topbar({ onMenuClick, title }) {
  const { notifications } = useNotifications();
  const unread = notifications.length;

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
