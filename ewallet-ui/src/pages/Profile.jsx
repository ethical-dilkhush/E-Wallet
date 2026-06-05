import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Shield, LogOut, Key, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export default function Profile() {
  const { user, wallet, logout } = useAuth();
  const notify = useNotifications();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    notify.info('You have been signed out');
    navigate('/login');
  };

  const fields = [
    { label: 'Full Name', value: user?.fullName, icon: User, editable: true },
    { label: 'Username', value: user?.username, icon: User, editable: false },
    { label: 'Email', value: user?.email, icon: Mail, editable: true },
    { label: 'Phone', value: user?.phone || '—', icon: Phone, editable: true },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 h-32 relative">
          <div className="absolute -bottom-12 left-6 sm:left-8">
            <div className="w-24 h-24 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center">
              <span className="text-3xl font-bold text-primary-600">
                {user?.username?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        </div>
        <div className="pt-16 pb-6 px-6 sm:px-8">
          <h2 className="text-xl font-bold text-gray-900">{user?.fullName || user?.username}</h2>
          <p className="text-sm text-gray-500">@{user?.username}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${user?.active !== false ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600'}`}>
              <CheckCircle className="w-3 h-3" />
              {user?.active !== false ? 'Active' : 'Inactive'}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-600">
              Wallet: {wallet?.id || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Personal Information</h3>
        <div className="space-y-5">
          {fields.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{f.label}</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">{f.value || '—'}</p>
                </div>
                {f.editable && (
                  <button className="text-xs font-medium text-primary-600 hover:text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors">
                    Edit
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Security</h3>
        <div className="space-y-4">
          <button className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-left">
            <div className="w-10 h-10 rounded-lg bg-warning-50 flex items-center justify-center shrink-0">
              <Key className="w-5 h-5 text-warning-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Change Password</p>
              <p className="text-xs text-gray-400 mt-0.5">Update your account password</p>
            </div>
          </button>

          <button className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-left">
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
              <p className="text-xs text-gray-400 mt-0.5">Add an extra layer of security</p>
            </div>
            <span className="text-xs font-medium text-gray-400 px-2 py-1 bg-gray-100 rounded-md">Coming Soon</span>
          </button>
        </div>
      </div>

      {/* Logout */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        {!showLogoutConfirm ? (
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-3 justify-center py-3 rounded-xl text-sm font-semibold text-danger-600 border-2 border-danger-200 hover:bg-danger-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        ) : (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to sign out?</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setShowLogoutConfirm(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleLogout} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-danger-600 text-white hover:bg-danger-700 transition-colors">
                Yes, Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
