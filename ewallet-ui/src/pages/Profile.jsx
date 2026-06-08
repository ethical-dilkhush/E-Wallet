import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, LogOut, Key, CheckCircle, Camera, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { userApi } from '../services/api';

const MAX_AVATAR_BYTES = 512 * 1024;
const MIN_PASSWORD_LENGTH = 6;

const FIELDS = [
  { key: 'fullName', label: 'Full Name', icon: User, editable: true, type: 'text' },
  { key: 'username', label: 'Username', icon: User, editable: false, type: 'text' },
  { key: 'email', label: 'Email', icon: Mail, editable: true, type: 'email' },
  { key: 'phone', label: 'Phone', icon: Phone, editable: true, type: 'tel' },
];

export default function Profile() {
  const { user, wallet, logout, fetchProfile } = useAuth();
  const notify = useNotifications();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [savingField, setSavingField] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, next: false, confirm: false });
  const [changingPassword, setChangingPassword] = useState(false);

  const handleLogout = () => {
    logout();
    notify.info('You have been signed out');
    navigate('/login');
  };

  const startEdit = (field) => {
    setEditingField(field.key);
    setEditValue(user?.[field.key] || '');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveField = async (fieldKey) => {
    const trimmed = editValue.trim();
    if (!trimmed && fieldKey !== 'phone') {
      notify.error('This field cannot be empty');
      return;
    }
    setSavingField(true);
    try {
      const res = await userApi.updateProfile({ [fieldKey]: trimmed || null });
      if (res.data?.success) {
        await fetchProfile();
        notify.success('Profile updated');
        setEditingField(null);
        setEditValue('');
      } else {
        notify.error(res.data?.message || 'Update failed');
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingField(false);
    }
  };

  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify.error('Please select an image file');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      notify.error('Image must be 512 KB or smaller');
      return;
    }

    setUploadingAvatar(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(file);
      });

      const res = await userApi.updateProfile({ avatar: dataUrl });
      if (res.data?.success) {
        await fetchProfile();
        notify.success('Profile picture updated');
      } else {
        notify.error(res.data?.message || 'Upload failed');
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Failed to upload profile picture');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const resetPasswordForm = () => {
    setPasswordForm({ current: '', next: '', confirm: '' });
    setShowPasswords({ current: false, next: false, confirm: false });
    setShowPasswordForm(false);
  };

  const submitPasswordChange = async (e) => {
    e.preventDefault();
    const { current, next, confirm } = passwordForm;

    if (!current || !next || !confirm) {
      notify.error('Please fill in all password fields');
      return;
    }
    if (next.length < MIN_PASSWORD_LENGTH) {
      notify.error(`New password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (next !== confirm) {
      notify.error('New password and confirmation do not match');
      return;
    }
    if (next === current) {
      notify.error('New password must be different from the current password');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await userApi.changePassword({ currentPassword: current, newPassword: next });
      if (res.data?.success) {
        notify.success('Password changed successfully');
        resetPasswordForm();
      } else {
        notify.error(res.data?.message || 'Failed to change password');
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 h-32 relative">
          <div className="absolute -bottom-12 left-6 sm:left-8">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-primary-600">
                    {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-md hover:bg-primary-700 transition-colors disabled:opacity-50"
                title="Change profile picture"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarSelect}
              />
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
          {FIELDS.map((f) => {
            const Icon = f.icon;
            const isEditing = editingField === f.key;
            return (
              <div key={f.key} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{f.label}</p>
                  {isEditing ? (
                    <input
                      type={f.type}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveField(f.key);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">
                      {user?.[f.key] || '—'}
                    </p>
                  )}
                </div>
                {f.editable && !isEditing && (
                  <button
                    onClick={() => startEdit(f)}
                    className="text-xs font-medium text-primary-600 hover:text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
                  >
                    Edit
                  </button>
                )}
                {isEditing && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => saveField(f.key)}
                      disabled={savingField}
                      className="text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {savingField ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={savingField}
                      className="text-xs font-medium text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
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
          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-warning-50 flex items-center justify-center shrink-0">
                <Key className="w-5 h-5 text-warning-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Change Password</p>
                <p className="text-xs text-gray-400 mt-0.5">Update your account password</p>
              </div>
            </button>
          ) : (
            <form onSubmit={submitPasswordChange} className="rounded-xl border border-gray-200 p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning-50 flex items-center justify-center shrink-0">
                  <Key className="w-5 h-5 text-warning-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Change Password</p>
                  <p className="text-xs text-gray-400 mt-0.5">Enter your current and new password</p>
                </div>
              </div>

              {[
                { key: 'current', label: 'Current Password', placeholder: 'Enter current password' },
                { key: 'next', label: 'New Password', placeholder: 'At least 6 characters' },
                { key: 'confirm', label: 'Confirm New Password', placeholder: 'Re-enter new password' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">{field.label}</label>
                  <div className="relative">
                    <input
                      type={showPasswords[field.key] ? 'text' : 'password'}
                      value={passwordForm[field.key]}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      autoComplete={field.key === 'current' ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showPasswords[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {changingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                  {changingPassword ? 'Updating…' : 'Update Password'}
                </button>
                <button
                  type="button"
                  onClick={resetPasswordForm}
                  disabled={changingPassword}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
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
