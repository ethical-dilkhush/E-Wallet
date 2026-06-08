import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Wallet, Eye, EyeOff, ArrowLeft, AlertCircle } from 'lucide-react';
import { authApi } from '../services/api';
import { useNotifications } from '../context/NotificationContext';

const MIN_PASSWORD_LENGTH = 6;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const notify = useNotifications();

  const [form, setForm] = useState({ next: '', confirm: '' });
  const [show, setShow] = useState({ next: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');

    if (form.next.length < MIN_PASSWORD_LENGTH) {
      setErr(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (form.next !== form.confirm) {
      setErr('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({ token, newPassword: form.next });
      notify.success('Password reset successfully. Please sign in.');
      navigate('/login');
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Sterling</span>
          </div>

          {!token ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-danger-50 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-danger-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid reset link</h1>
              <p className="text-gray-500 text-sm">
                This password reset link is missing or malformed. Please request a new one.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Set a new password</h1>
              <p className="text-gray-500 mb-8 text-sm">Choose a strong password for your account.</p>

              {err && (
                <div className="mb-6 p-4 rounded-xl bg-danger-50 border border-danger-500/20 text-danger-600 text-sm font-medium">
                  {err}
                </div>
              )}

              <form onSubmit={submit} className="space-y-5">
                {[
                  { key: 'next', label: 'New Password', placeholder: 'At least 6 characters' },
                  { key: 'confirm', label: 'Confirm New Password', placeholder: 'Re-enter new password' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
                    <div className="relative">
                      <input
                        type={show[field.key] ? 'text' : 'password'}
                        value={form[field.key]}
                        onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        required
                        placeholder={field.placeholder}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all placeholder:text-gray-400 pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShow((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {show[field.key] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg shadow-primary-600/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Reset password
                </button>
              </form>
            </>
          )}

          <Link
            to="/login"
            className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
