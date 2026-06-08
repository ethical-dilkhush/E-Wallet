import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, userApi, walletApi } from '../lib/api';
import { storage } from '../lib/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;

  const hydrate = useCallback(async () => {
    const [u, w] = await Promise.all([storage.get('user'), storage.get('wallet')]);
    setUser(u);
    setWallet(w);
  }, []);

  const fetchProfile = useCallback(async () => {
    const res = await userApi.me();
    if (res.data?.success) {
      setUser(res.data.data);
      await storage.set('user', res.data.data);
    }
  }, []);

  const fetchWallet = useCallback(async () => {
    try {
      const res = await walletApi.me();
      if (res.data?.success) {
        setWallet(res.data.data);
        await storage.set('wallet', res.data.data);
        return res.data.data;
      }
    } catch {
      // wallet may not exist yet
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

  useEffect(() => {
    hydrate()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hydrate]);

  useEffect(() => {
    const onChanged = (changes, area) => {
      if (area !== 'local') return;

      const authTouched = ['accessToken', 'refreshToken', 'user', 'authUpdatedAt'].some(
        (k) => `ewallet.${k}` in changes
      );
      if (!authTouched) return;

      const accessChange = changes['ewallet.accessToken'];
      if (accessChange && !accessChange.newValue) {
        setUser(null);
        setWallet(null);
        storage.remove('wallet').catch(() => {});
        return;
      }

      hydrate()
        .then(() => {
          if (accessChange?.newValue) {
            return Promise.all([fetchProfile(), fetchWallet()]);
          }
          return null;
        })
        .catch(() => {});
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, [hydrate, fetchProfile, fetchWallet]);

  const login = useCallback(
    async (username, password) => {
      const res = await authApi.login({ username, password });
      const data = res.data?.data;
      if (!res.data?.success || !data?.accessToken) throw new Error(res.data?.message || 'Login failed');

      const authUpdatedAt = Date.now();
      await storage.set('accessToken', data.accessToken);
      await storage.set('refreshToken', data.refreshToken);
      await storage.set('authUpdatedAt', authUpdatedAt);

      const minimalUser = { id: data.userId, username: data.username };
      await storage.set('user', minimalUser);
      setUser(minimalUser);

      await Promise.all([fetchProfile(), fetchWallet()]);
      return res.data;
    },
    [fetchProfile, fetchWallet]
  );

  const logout = useCallback(async () => {
    await storage.clearSession();
    setUser(null);
    setWallet(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      wallet,
      loading,
      isAuthenticated,
      login,
      logout,
      refreshWallet: fetchWallet,
      pollWallet,
      fetchProfile,
    }),
    [user, wallet, loading, isAuthenticated, login, logout, fetchWallet, pollWallet, fetchProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
