import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi, userApi, walletApi } from '../services/api';
import { notifyBridgeLogin, notifyBridgeLogout, subscribeBridgeAuth, waitForAuthBridge } from '../lib/authBridge';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
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
        return u;
      }
    } catch {
      /* will 401 → interceptor handles */
    }
    return null;
  }, []);

  const hydrateFromStorage = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setUser(null);
      setWallet(null);
      return;
    }

    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    }

    await Promise.all([fetchProfile(), fetchWallet()]);
  }, [fetchProfile, fetchWallet]);

  useEffect(() => {
    let active = true;

    (async () => {
      await waitForAuthBridge();
      if (!active) return;
      await hydrateFromStorage();
      if (active) setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [hydrateFromStorage]);

  useEffect(() => {
    return subscribeBridgeAuth({
      onSync: async () => {
        await hydrateFromStorage();
      },
      onLogout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('authUpdatedAt');
        setUser(null);
        setWallet(null);
      },
    });
  }, [hydrateFromStorage]);

  const login = useCallback(async (username, password) => {
    const res = await authApi.login({ username, password });
    const { accessToken, refreshToken, userId, username: uname } = res.data.data;
    const authUpdatedAt = Date.now();

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('authUpdatedAt', String(authUpdatedAt));

    const u = { id: userId, username: uname };
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);

    notifyBridgeLogin({ accessToken, refreshToken, user: u });

    await Promise.all([fetchProfile(), fetchWallet()]);
    return res.data;
  }, [fetchProfile, fetchWallet]);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('authUpdatedAt');
    setUser(null);
    setWallet(null);
    notifyBridgeLogout();
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
