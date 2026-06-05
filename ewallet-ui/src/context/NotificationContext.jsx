import { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext(null);

let idCounter = 0;

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((message, type = 'info', duration = 5000) => {
    const id = ++idCounter;
    setNotifications((prev) => [...prev, { id, message, type, timestamp: Date.now() }]);
    if (duration > 0) {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const success = useCallback((msg) => addNotification(msg, 'success'), [addNotification]);
  const error = useCallback((msg) => addNotification(msg, 'error', 8000), [addNotification]);
  const warning = useCallback((msg) => addNotification(msg, 'warning'), [addNotification]);
  const info = useCallback((msg) => addNotification(msg, 'info'), [addNotification]);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, success, error, warning, info }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be inside NotificationProvider');
  return ctx;
};
