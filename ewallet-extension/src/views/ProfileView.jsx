import { useState } from 'react';
import { CheckCircle, Eye, EyeOff, Key, Loader2, LogOut, Mail, Phone, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../lib/api';

const MIN_PASSWORD_LENGTH = 6;

export default function ProfileView() {
  const { user, wallet, logout } = useAuth();
  const [confirm, setConfirm] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [changing, setChanging] = useState(false);
  const [msg, setMsg] = useState(null);

  const fields = [
    { label: 'Full Name', value: user?.fullName, icon: User },
    { label: 'Username', value: user?.username ? `@${user.username}` : null, icon: User },
    { label: 'Email', value: user?.email, icon: Mail },
    { label: 'Phone', value: user?.phone, icon: Phone },
  ];

  const resetPasswordForm = () => {
    setPw({ current: '', next: '', confirm: '' });
    setShow({ current: false, next: false, confirm: false });
    setShowPasswordForm(false);
    setMsg(null);
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!pw.current || !pw.next || !pw.confirm) {
      setMsg({ type: 'error', text: 'Please fill in all fields' });
      return;
    }
    if (pw.next.length < MIN_PASSWORD_LENGTH) {
      setMsg({ type: 'error', text: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` });
      return;
    }
    if (pw.next !== pw.confirm) {
      setMsg({ type: 'error', text: 'New password and confirmation do not match' });
      return;
    }
    if (pw.next === pw.current) {
      setMsg({ type: 'error', text: 'New password must be different from current' });
      return;
    }

    setChanging(true);
    try {
      const res = await userApi.changePassword({ currentPassword: pw.current, newPassword: pw.next });
      if (res.data?.success) {
        setMsg({ type: 'success', text: 'Password changed successfully' });
        setPw({ current: '', next: '', confirm: '' });
        setShow({ current: false, next: false, confirm: false });
      } else {
        setMsg({ type: 'error', text: res.data?.message || 'Failed to change password' });
      }
    } catch (ex) {
      setMsg({ type: 'error', text: ex.response?.data?.message || 'Failed to change password' });
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto popup-scroll p-4 space-y-4">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 h-20" />
        <div className="px-4 pb-4 -mt-10">
          <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-primary-600">
                {user?.username?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            )}
          </div>
          <div className="mt-2">
            <div className="text-base font-bold text-gray-900">{user?.fullName || user?.username}</div>
            <div className="text-sm text-gray-500">@{user?.username}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                user?.active !== false ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600'
              }`}
            >
              <CheckCircle className="w-3 h-3" />
              {user?.active !== false ? 'Active' : 'Inactive'}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary-50 text-primary-600 max-w-full truncate">
              Wallet: {wallet?.id || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Personal info (read-only) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="text-sm font-semibold text-gray-900 mb-3">Personal information</div>
        <div className="space-y-2.5">
          {fields.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-gray-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{f.label}</p>
                  <p className="text-sm font-medium text-gray-900 truncate">{f.value || '—'}</p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-gray-400 mt-3">
          Edit your name, email, phone or photo from the web app.
        </p>
      </div>

      {/* Security */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="text-sm font-semibold text-gray-900 mb-3">Security</div>
        {!showPasswordForm ? (
          <button
            type="button"
            onClick={() => setShowPasswordForm(true)}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-warning-50 flex items-center justify-center shrink-0">
              <Key className="w-4 h-4 text-warning-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Change Password</p>
              <p className="text-[11px] text-gray-400">Update your account password</p>
            </div>
          </button>
        ) : (
          <form onSubmit={submitPassword} className="space-y-3">
            {msg && (
              <div
                className={`p-2.5 rounded-lg text-xs font-medium ${
                  msg.type === 'success'
                    ? 'bg-success-50 text-success-600 border border-success-500/20'
                    : 'bg-danger-50 text-danger-600 border border-danger-500/20'
                }`}
              >
                {msg.text}
              </div>
            )}

            {[
              { key: 'current', label: 'Current Password', placeholder: 'Current password' },
              { key: 'next', label: 'New Password', placeholder: 'At least 6 characters' },
              { key: 'confirm', label: 'Confirm New Password', placeholder: 'Re-enter new password' },
            ].map((field) => (
              <label key={field.key} className="block">
                <span className="text-[11px] font-medium text-gray-500">{field.label}</span>
                <div className="mt-1 relative">
                  <input
                    type={show[field.key] ? 'text' : 'password'}
                    value={pw[field.key]}
                    onChange={(e) => setPw((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    autoComplete={field.key === 'current' ? 'current-password' : 'new-password'}
                    className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {show[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </label>
            ))}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={changing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 transition-all disabled:opacity-50"
              >
                {changing && <Loader2 className="w-4 h-4 animate-spin" />}
                {changing ? 'Updating…' : 'Update'}
              </button>
              <button
                type="button"
                onClick={resetPasswordForm}
                disabled={changing}
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Sign out */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        {!confirm ? (
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="w-full flex items-center gap-2 justify-center py-3 rounded-xl text-sm font-semibold text-danger-600 border-2 border-danger-200 hover:bg-danger-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        ) : (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">Sign out of the extension?</p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => setConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={logout}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-danger-600 text-white hover:bg-danger-700 transition-colors"
              >
                Yes, sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
