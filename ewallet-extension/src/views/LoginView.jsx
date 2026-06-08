import { useState } from 'react';
import { ArrowLeft, CheckCircle, Loader2, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../lib/api';

export default function LoginView() {
  const { login } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'forgot'

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (ex) {
      setErr(ex.response?.data?.message || ex.message || 'Login failed');
    }
    setLoading(false);
  };

  const onForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await authApi.forgotPassword(forgotEmail.trim());
    } catch {
      /* Always show the same confirmation to avoid leaking which emails exist. */
    } finally {
      setForgotLoading(false);
      setForgotSent(true);
    }
  };

  const backToLogin = () => {
    setMode('login');
    setForgotEmail('');
    setForgotSent(false);
  };

  return (
    <div className="min-h-[600px] flex items-center justify-center p-5">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 px-6 py-6 text-white">
          <div className="text-lg font-bold">Sterling E-Wallet</div>
          <div className="text-sm text-white/80">
            {mode === 'login' ? 'Sign in to continue' : 'Reset your password'}
          </div>
        </div>

        {mode === 'login' ? (
          <form onSubmit={onSubmit} className="p-6 space-y-4">
            {err && (
              <div className="p-3 rounded-xl bg-danger-50 border border-danger-500/20 text-danger-600 text-sm font-medium">
                {err}
              </div>
            )}

            <label className="block">
              <span className="text-xs font-medium text-gray-600">Username</span>
              <div className="mt-1.5 relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                  placeholder="Enter username"
                  required
                />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-600">Password</span>
              <div className="mt-1.5 relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                  placeholder="Enter password"
                  required
                />
              </div>
            </label>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg shadow-primary-600/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            <p className="text-[11px] text-gray-400 text-center">Uses your existing E-Wallet account.</p>
          </form>
        ) : (
          <div className="p-6 space-y-4">
            {!forgotSent ? (
              <form onSubmit={onForgotSubmit} className="space-y-4">
                <p className="text-sm text-gray-500">
                  Enter your account email and we&apos;ll send a password reset link.
                </p>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Email</span>
                  <div className="mt-1.5 relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      autoComplete="email"
                      className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={forgotLoading || !forgotEmail.trim()}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg shadow-primary-600/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {forgotLoading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            ) : (
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-full bg-success-50 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-success-600" />
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Check your email</p>
                <p className="text-xs text-gray-500">
                  If an account exists for that email, a reset link has been sent. Open it in your browser to
                  set a new password (expires in 30 minutes).
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={backToLogin}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
