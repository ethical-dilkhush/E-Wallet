import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi, userApi, walletApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;

  const fetchWallet = useCallback(async () => {
    try {
      const res = await walletApi.me();
      if (res.data?.success) {
        setWallet(res.data.data);
        return res.data.data;
      }
    } catch {
      /* wallet may not exist yet */
    }
    return null;
  }, []);

  // Top-ups / transfers settle asynchronously (the backend publishes an event
  // and the wallet is credited/debited a moment later). Poll the wallet a few
  // times until `predicate(wallet)` is satisfied so the UI reflects the new
  // balance without a manual refresh.
  const pollWallet = useCallback(
    async (predicate, { attempts = 8, interval = 700 } = {}) => {
      let latest = null;
      for (let i = 0; i < attempts; i++) {
        latest = await fetchWallet();
        if (!predicate || predicate(latest)) return latest;
        if (i < attempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, interval));
        }
      }
      return latest;
    },
    [fetchWallet]
  );

  const fetchProfile = useCallback(async () => {
    try {
      const res = await userApi.me();
      if (res.data?.success) {
        const u = res.data.data;
        setUser(u);
        localStorage.setItem('user', JSON.stringify(u));
      }
    } catch {
      /* will 401 → interceptor handles */
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      Promise.all([fetchProfile(), fetchWallet()]).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchProfile, fetchWallet]);

  const login = useCallback(async (username, password) => {
    const res = await authApi.login({ username, password });
    const { accessToken, refreshToken, userId, username: uname } = res.data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    const u = { id: userId, username: uname };
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    await Promise.all([fetchProfile(), fetchWallet()]);
    return res.data;
  }, [fetchProfile, fetchWallet]);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    setWallet(null);
  }, []);

  const refreshWallet = fetchWallet;

  return (
    <AuthContext.Provider value={{ user, wallet, isAuthenticated, loading, login, logout, refreshWallet, pollWallet, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
