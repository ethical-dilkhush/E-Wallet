import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap = {
  success: 'bg-success-50 border-success-500 text-success-600',
  error: 'bg-danger-50 border-danger-500 text-danger-600',
  warning: 'bg-warning-50 border-warning-500 text-warning-600',
  info: 'bg-primary-50 border-primary-500 text-primary-600',
};

export default function NotificationPanel() {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-96 max-w-[calc(100vw-2rem)]">
      {notifications.map((n) => {
        const Icon = iconMap[n.type] || Info;
        return (
          <div
            key={n.id}
            className={`flex items-start gap-3 p-4 rounded-xl border-l-4 shadow-lg backdrop-blur-sm animate-slide-in ${colorMap[n.type] || colorMap.info}`}
          >
            <Icon className="w-5 h-5 mt-0.5 shrink-0" />
            <p className="text-sm font-medium flex-1">{n.message}</p>
            <button onClick={() => removeNotification(n.id)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
