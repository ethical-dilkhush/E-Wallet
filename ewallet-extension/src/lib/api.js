import axios from 'axios';
import { storage } from './storage';

const BASE_URL = (import.meta.env.VITE_GATEWAY_URL || 'http://localhost:8080/api').replace(/\/$/, '');

// The full web app origin, used to hand off flows that can't run inside an MV3
// popup (e.g. Razorpay Checkout loads a remote script and needs a persistent
// window). Defaults to the Vite dev server port.
export const WEB_APP_URL = (import.meta.env.VITE_WEB_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await storage.get('accessToken');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

async function refreshTokens() {
  const refreshToken = await storage.get('refreshToken');
  if (!refreshToken) return null;
  const res = await axios.post(
    `${BASE_URL}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } }
  );
  const data = res.data?.data;
  if (!res.data?.success || !data?.accessToken || !data?.refreshToken) return null;
  await storage.set('accessToken', data.accessToken);
  await storage.set('refreshToken', data.refreshToken);
  return data;
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (!original || original.__isRetryRequest) return Promise.reject(err);

    if (err.response?.status === 401) {
      original.__isRetryRequest = true;
      try {
        const refreshed = await refreshTokens();
        if (!refreshed) {
          await storage.clearSession();
          return Promise.reject(err);
        }
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${await storage.get('accessToken')}`;
        return api(original);
      } catch {
        await storage.clearSession();
        return Promise.reject(err);
      }
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  validate: () => api.post('/auth/validate'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
};

export const userApi = {
  me: () => api.get('/users/me'),
  getById: (id) => api.get(`/users/${id}`),
  search: (q) => api.get('/users/search', { params: { q } }),
  changePassword: (data) => api.put('/users/me/password', data),
};

export const walletApi = {
  me: () => api.get('/wallets/me'),
};

export const txnApi = {
  mine: () => api.get('/transactions/me'),
  transfer: (data) => api.post('/transactions/transfer', data),
};

export const agentApi = {
  chat: (data) => api.post('/agent/chat', data),
};

