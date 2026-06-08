import axios from 'axios';
import { notifyBridgeLogout } from '../lib/authBridge';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('authUpdatedAt');
      notifyBridgeLogout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
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
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

export const userApi = {
  register: (data) => api.post('/users/register', data),
  me: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/me', data),
  changePassword: (data) => api.put('/users/me/password', data),
  getById: (id) => api.get(`/users/${id}`),
  search: (q) => api.get('/users/search', { params: { q } }),
};

export const walletApi = {
  me: () => api.get('/wallets/me'),
  ledger: () => api.get('/wallets/me/ledger'),
};

export const txnApi = {
  transfer: (data) => api.post('/transactions/transfer', data),
  merchantPayment: (data) => api.post('/transactions/merchant-payment', data),
  getByRef: (ref) => api.get(`/transactions/${ref}`),
  mine: () => api.get('/transactions/me'),
};

export const paymentApi = {
  // Create a Razorpay order server-side; the key secret never reaches the browser.
  createOrder: (data) => api.post('/payments/orders', data),
  // Verify the signature server-side; only then is the wallet credited.
  verify: (data) => api.post('/payments/verify', data),
};

export const agentApi = {
  // Sends the session message history; wallet data is fetched server-side.
  chat: (data) => api.post('/agent/chat', data),
};

export default api;
