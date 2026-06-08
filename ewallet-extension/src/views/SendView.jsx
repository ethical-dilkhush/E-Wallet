import { useEffect, useRef, useState } from 'react';
import { AtSign, Loader2, SendHorizontal, UserSearch } from 'lucide-react';
import { txnApi, userApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';

function formatCurrency(val, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2 }).format(val || 0);
}

export default function SendView({ onDone }) {
  const { wallet, pollWallet, user } = useAuth();
  const currency = wallet?.currency || 'INR';

  const [form, setForm] = useState({ toUserId: '', amount: '', reason: '' });
  const [recipient, setRecipient] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const [usernameQuery, setUsernameQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const skipSearchRef = useRef(false);

  const handle = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === 'toUserId') setRecipient(null);
    if (err) setErr('');
    if (ok) setOk('');
  };

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
    }, 250);
    return () => clearTimeout(timer);
  }, [usernameQuery, user?.id]);

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
    setErr('');
    setOk('');
    try {
      const res = await userApi.getById(form.toUserId.trim());
      if (res.data?.success && res.data.data) {
        if (res.data.data.id === user?.id) {
          setErr('You cannot transfer to yourself');
          setRecipient(null);
        } else {
          setRecipient(res.data.data);
          skipSearchRef.current = true;
          setUsernameQuery(res.data.data.username || '');
          setShowSuggestions(false);
        }
      } else {
        setErr(res.data?.message || 'User not found');
      }
    } catch {
      setErr('User not found');
      setRecipient(null);
    }
    setLookingUp(false);
  };

  const validate = () => {
    if (!form.toUserId || !recipient) return 'Please choose a valid recipient';
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) return 'Enter a valid amount';
    if (wallet && amt > Number(wallet.balance)) return 'Insufficient balance';
    return null;
  };

  const sendMoney = async () => {
    const v = validate();
    if (v) {
      setErr(v);
      return;
    }
    setSending(true);
    setErr('');
    setOk('');
    const prevBalance = Number(wallet?.balance ?? 0);
    try {
      await txnApi.transfer({
        toUserId: form.toUserId.trim(),
        amount: parseFloat(form.amount),
        reason: form.reason || undefined,
      });
      await pollWallet((w) => Number(w?.balance ?? 0) < prevBalance);
      setOk(`Transfer of ${formatCurrency(form.amount, currency)} initiated`);
      setForm({ toUserId: '', amount: '', reason: '' });
      setRecipient(null);
      setUsernameQuery('');
      onDone?.();
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Transfer failed');
    }
    setSending(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3">
        <div className="text-sm font-semibold text-gray-900">Send money</div>
        <div className="text-[11px] text-gray-500">Available: {formatCurrency(wallet?.balance, currency)}</div>
      </div>

      <div className="flex-1 min-h-0 px-4 pb-4 overflow-y-auto popup-scroll">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-4">
          {err && (
            <div className="p-3 rounded-xl bg-danger-50 border border-danger-500/20 text-danger-600 text-sm font-medium">
              {err}
            </div>
          )}
          {ok && (
            <div className="p-3 rounded-xl bg-success-50 border border-success-500/20 text-success-700 text-sm font-medium">
              {ok}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Search by username</label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={usernameQuery}
                onChange={(e) => setUsernameQuery(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                autoComplete="off"
                placeholder="Start typing…"
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
              )}
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-auto py-1">
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
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Recipient user ID</label>
            <div className="flex gap-2">
              <input
                name="toUserId"
                value={form.toUserId}
                onChange={handle}
                placeholder="USR-…"
                className="flex-1 px-3 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              />
              <button
                type="button"
                onClick={lookupUser}
                disabled={lookingUp || !form.toUserId}
                className="px-3 py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <UserSearch className="w-4 h-4" />
                {lookingUp ? '…' : 'Lookup'}
              </button>
            </div>
            {recipient && (
              <div className="mt-2 text-xs text-gray-600">
                Recipient: <span className="font-semibold">@{recipient.username}</span>
                {recipient.fullName ? <span className="text-gray-500"> • {recipient.fullName}</span> : null}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount ({currency})</label>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={handle}
              placeholder="0.00"
              className="w-full px-3 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Note (optional)</label>
            <input
              name="reason"
              value={form.reason}
              onChange={handle}
              placeholder="e.g. rent"
              className="w-full px-3 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            />
          </div>

          <button
            type="button"
            onClick={sendMoney}
            disabled={sending}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg shadow-primary-600/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
            {sending ? 'Sending…' : 'Send now'}
          </button>
        </div>
      </div>
    </div>
  );
}

