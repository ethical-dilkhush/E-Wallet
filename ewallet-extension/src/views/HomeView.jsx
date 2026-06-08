import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Loader2,
  PlusCircle,
  RefreshCw,
  SendHorizontal,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { txnApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';

function formatCurrency(val, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2 }).format(val || 0);
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (Number.isNaN(mins)) return '';
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function txnTitle(t) {
  const type = String(t?.type || '').toUpperCase();
  if (type === 'TOPUP') return 'Wallet Top-up';
  if (type === 'TRANSFER') return 'Fund Transfer';
  if (type === 'MERCHANT_PAYMENT') return 'Merchant Payment';
  return t?.type || 'Transaction';
}

export default function HomeView({ onNavigate }) {
  const { user, wallet, refreshWallet } = useAuth();
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currency = wallet?.currency || 'INR';
  const recent = useMemo(() => (txns || []).slice(0, 5), [txns]);
  const completedCount = useMemo(() => txns.filter((t) => t.status === 'COMPLETED').length, [txns]);
  const pendingCount = useMemo(() => txns.filter((t) => t.status === 'PENDING').length, [txns]);

  const fetchAll = async () => {
    const [, tRes] = await Promise.allSettled([refreshWallet(), txnApi.mine()]);
    if (tRes.status === 'fulfilled' && tRes.value?.data?.success) {
      setTxns(tRes.value.data.data || []);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchAll()
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchAll();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto popup-scroll p-4 space-y-4">
      {/* Balance hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-700 via-cyan-800 to-cyan-950 p-5 text-white shadow-lg shadow-cyan-950/20">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-cyan-200">Total balance</div>
                <div className="text-[11px] text-cyan-300">{currency} Wallet</div>
              </div>
            </div>
            <button
              type="button"
              onClick={doRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-60"
              title="Refresh"
            >
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
          </div>

          <div className="mt-4 mb-5">
            <div className="text-3xl font-bold tracking-tight">{formatCurrency(wallet?.balance, currency)}</div>
            <div className="text-[11px] text-cyan-200 mt-1">Available balance</div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onNavigate?.('send')}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white text-cyan-800 text-sm font-semibold hover:bg-cyan-50 transition-colors shadow-sm"
            >
              <SendHorizontal className="w-4 h-4" /> Send
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('funds')}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 backdrop-blur text-white text-sm font-semibold hover:bg-white/20 transition-colors border border-white/20"
            >
              <PlusCircle className="w-4 h-4" /> Add Funds
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl p-3 border border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center mb-2">
            <TrendingUp className="w-4 h-4 text-cyan-700" />
          </div>
          <div className="text-lg font-bold text-gray-900 leading-none">{txns.length}</div>
          <div className="text-[10px] text-gray-400 mt-1">Total</div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center mb-2">
            <ArrowUpRight className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-lg font-bold text-gray-900 leading-none">{completedCount}</div>
          <div className="text-[10px] text-gray-400 mt-1">Completed</div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center mb-2">
            <History className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-bold text-gray-900 leading-none">{pendingCount}</div>
          <div className="text-[10px] text-gray-400 mt-1">Pending</div>
        </div>
      </div>

      {/* Recent */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <div className="text-sm font-semibold text-gray-900">Recent activity</div>
          <button
            type="button"
            onClick={() => onNavigate?.('txns')}
            className="text-xs font-medium text-cyan-700 hover:text-cyan-800"
          >
            View all
          </button>
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : recent.length === 0 ? (
          <div className="p-6 text-center">
            <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium">No transactions yet</p>
            <p className="text-xs text-gray-400 mt-0.5">Add funds to get started</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {recent.map((t) => {
              const isSent = t?.fromUserId === user?.id && String(t?.type || '').toUpperCase() !== 'TOPUP';
              const Icon = isSent ? ArrowUpRight : ArrowDownLeft;
              return (
                <li key={t.reference || t.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isSent ? 'bg-red-50' : 'bg-green-50'}`}>
                    <Icon className={`w-4 h-4 ${isSent ? 'text-red-500' : 'text-green-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{txnTitle(t)}</p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {timeAgo(t.createdAt)}
                      {t.reason ? ` • ${t.reason}` : ''}
                    </p>
                  </div>
                  <div className={`text-sm font-semibold shrink-0 whitespace-nowrap text-right ${isSent ? 'text-red-600' : 'text-green-600'}`}>
                    {isSent ? '-' : '+'}{formatCurrency(t.amount, currency)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Wallet details */}
      <div className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 rounded-2xl border border-cyan-100 p-4">
        <div className="text-sm font-semibold text-cyan-950 mb-2">Wallet details</div>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between gap-3">
            <span className="text-cyan-700">Wallet ID</span>
            <span className="font-mono text-cyan-900 truncate">{wallet?.id || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cyan-700">Currency</span>
            <span className="font-medium text-cyan-900">{currency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cyan-700">Owner</span>
            <span className="font-medium text-cyan-900">@{user?.username || '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
