import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SendHorizontal, UserSearch, AtSign, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { txnApi, userApi } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

function formatCurrency(val) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(val || 0);
}

export default function Transfer() {
  const { wallet, pollWallet, user } = useAuth();
  const notify = useNotifications();
  const navigate = useNavigate();

  const [form, setForm] = useState({ toUserId: '', amount: '', reason: '' });
  const [recipient, setRecipient] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');

  const [usernameQuery, setUsernameQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Skips the next debounced search when the username is set programmatically
  // (selecting a suggestion or auto-filling from a User ID lookup).
  const skipSearchRef = useRef(false);

  const handle = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === 'toUserId') setRecipient(null);
  };

  // Real-time username search (debounced)
  useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }
    const q = usernameQuery.trim();
    if (q.length < 1) {
      setSuggestions([]);
      setSearching(false);
      setShowSuggestions(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await userApi.search(q);
        if (res.data?.success) {
          setSuggestions((res.data.data || []).filter((u) => u.id !== user?.id));
          setShowSuggestions(true);
        }
      } catch {
        setSuggestions([]);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [usernameQuery, user?.id]);

  const handleUsernameChange = (e) => {
    setUsernameQuery(e.target.value);
    setRecipient(null);
    setForm((f) => ({ ...f, toUserId: '' }));
    setShowSuggestions(true);
    if (err) setErr('');
  };

  const selectRecipient = (u) => {
    skipSearchRef.current = true;
    setRecipient(u);
    setForm((f) => ({ ...f, toUserId: u.id }));
    setUsernameQuery(u.username);
    setSuggestions([]);
    setShowSuggestions(false);
    setErr('');
  };

  const lookupUser = async () => {
    if (!form.toUserId) return;
    setLookingUp(true);
    try {
      const res = await userApi.getById(form.toUserId.trim());
      if (res.data?.success && res.data.data) {
        if (res.data.data.id === user?.id) {
          setErr('You cannot transfer to yourself');
          setRecipient(null);
        } else {
          setRecipient(res.data.data);
          // Auto-fill the linked username (without re-triggering suggestions)
          skipSearchRef.current = true;
          setUsernameQuery(res.data.data.username || '');
          setShowSuggestions(false);
          setErr('');
        }
      }
    } catch {
      setErr('User not found');
      setRecipient(null);
    }
    setLookingUp(false);
  };

  const validate = () => {
    if (!form.toUserId || !recipient) return 'Please look up a valid recipient';
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) return 'Enter a valid amount';
    if (wallet && amt > wallet.balance) return 'Insufficient balance';
    return null;
  };

  const openConfirm = (e) => {
    e.preventDefault();
    const v = validate();
    if (v) { setErr(v); return; }
    setErr('');
    setShowConfirm(true);
  };

  const doTransfer = async () => {
    setSending(true);
    const prevBalance = Number(wallet?.balance ?? 0);
    try {
      await txnApi.transfer({
        toUserId: form.toUserId.trim(),
        amount: parseFloat(form.amount),
        reason: form.reason || undefined,
      });
      // The debit is applied asynchronously; wait until the balance drops.
      await pollWallet((w) => Number(w?.balance ?? 0) < prevBalance);
      notify.success(`Transfer of ${formatCurrency(form.amount)} initiated successfully!`);
      setShowConfirm(false);
      navigate('/transactions');
    } catch (ex) {
      setShowConfirm(false);
      notify.error(ex.response?.data?.message || 'Transfer failed');
    }
    setSending(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 sm:p-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <SendHorizontal className="w-6 h-6" />
            <h2 className="text-xl font-bold">Send Money</h2>
          </div>
          <p className="text-primary-100 text-sm">Transfer funds securely to any Sterling user.</p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl text-sm backdrop-blur">
            Available: <span className="font-bold">{formatCurrency(wallet?.balance)}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={openConfirm} className="p-6 sm:p-8 space-y-5">
          {err && (
            <div className="p-4 rounded-xl bg-danger-50 border border-danger-500/20 text-danger-600 text-sm font-medium">
              {err}
            </div>
          )}

          {/* Search by Username (real-time suggestions) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Search by Username</label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={usernameQuery}
                onChange={handleUsernameChange}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                autoComplete="off"
                placeholder="Start typing a username..."
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
              )}
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto py-1">
                  {suggestions.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectRecipient(u)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primary-50 text-left transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-primary-700">{u.username?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">@{u.username}</p>
                          <p className="text-xs text-gray-500 truncate">{u.fullName || u.email}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {showSuggestions && !searching && usernameQuery.trim().length >= 1 && suggestions.length === 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2.5 text-sm text-gray-500">
                  No users found for "{usernameQuery.trim()}"
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Optional: pick a user here and the User ID fills in automatically. You can use either method.</p>
          </div>

          {/* Recipient */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Recipient User ID</label>
            <div className="flex gap-2">
              <input
                name="toUserId"
                type="text"
                value={form.toUserId}
                onChange={handle}
                required
                placeholder="e.g. USR-01HV9X0Y1Z2A3B4C5D6E"
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              />
              <button
                type="button"
                onClick={lookupUser}
                disabled={lookingUp || !form.toUserId}
                className="px-4 py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <UserSearch className="w-4 h-4" />
                {lookingUp ? 'Looking...' : 'Lookup'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Enter an exact User ID and click Lookup; the matching username fills in above.</p>
            {recipient && (
              <div className="mt-3 p-3 rounded-xl bg-success-50 border border-success-500/20 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-success-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-success-700">{recipient.username?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-success-800">{recipient.fullName || recipient.username}</p>
                  <p className="text-xs text-success-600">@{recipient.username} &middot; {recipient.email}</p>
                </div>
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (INR)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">&#8377;</span>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={handle}
                required
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all text-lg font-semibold"
              />
            </div>
            {wallet && form.amount && parseFloat(form.amount) > wallet.balance && (
              <p className="text-xs text-danger-500 mt-1 font-medium">Exceeds available balance</p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (optional)</label>
            <input
              name="reason"
              value={form.reason}
              onChange={handle}
              placeholder="e.g. Lunch, Rent, Gift"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg shadow-primary-600/25 transition-all flex items-center justify-center gap-2"
          >
            <SendHorizontal className="w-4 h-4" />
            Review Transfer
          </button>
        </form>
      </div>

      <ConfirmModal
        open={showConfirm}
        title="Confirm Transfer"
        message={`Send ${formatCurrency(form.amount)} to ${recipient?.fullName || recipient?.username || 'User #' + form.toUserId}? This action cannot be undone.`}
        confirmLabel="Send Now"
        onConfirm={doTransfer}
        onCancel={() => setShowConfirm(false)}
        loading={sending}
      />
    </div>
  );
}
