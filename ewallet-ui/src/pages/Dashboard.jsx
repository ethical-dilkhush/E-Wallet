import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  SendHorizontal,
  PlusCircle,
  History,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { txnApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { useCounterpartyNames, counterpartyLabel } from '../hooks/useCounterparties';

function formatCurrency(val) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(val || 0);
}

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export default function Dashboard() {
  const { wallet, user, refreshWallet } = useAuth();
  const [txns, setTxns] = useState([]);
  const [loadingTxns, setLoadingTxns] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = async () => {
    try {
      const res = await txnApi.mine();
      if (res.data?.success) setTxns(res.data.data || []);
    } catch { /* ignore */ }
    setLoadingTxns(false);
  };

  useEffect(() => {
    refreshWallet();
    fetchTransactions();
  }, []);

  // While any transaction is still settling (PENDING), auto-refresh the wallet
  // and transaction list so balances and statuses update without a manual reload.
  useEffect(() => {
    const hasPending = txns.some((t) => t.status === 'PENDING');
    if (!hasPending) return;
    const id = setInterval(() => {
      refreshWallet();
      fetchTransactions();
    }, 3000);
    return () => clearInterval(id);
  }, [txns]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshWallet(), fetchTransactions()]);
    setRefreshing(false);
  };

  const recentTxns = txns.slice(0, 5);
  const completedCount = txns.filter((t) => t.status === 'COMPLETED').length;
  const pendingCount = txns.filter((t) => t.status === 'PENDING').length;
  const names = useCounterpartyNames(txns);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Balance Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-6 sm:p-8 text-white shadow-xl shadow-primary-900/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-primary-200">Total Balance</p>
                <p className="text-xs text-primary-300">{wallet?.currency || 'INR'} Wallet</p>
              </div>
            </div>
            <button onClick={handleRefresh} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="mb-8">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">{formatCurrency(wallet?.balance)}</h2>
            <p className="text-sm text-primary-200 mt-1">Available balance</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/transfer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-primary-700 text-sm font-semibold hover:bg-primary-50 transition-colors shadow-sm"
            >
              <SendHorizontal className="w-4 h-4" /> Send Money
            </Link>
            <Link
              to="/topup"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 backdrop-blur text-white text-sm font-semibold hover:bg-white/20 transition-colors border border-white/20"
            >
              <PlusCircle className="w-4 h-4" /> Add Funds
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">Total Transactions</p>
            <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{txns.length}</p>
          <p className="text-xs text-gray-400 mt-1">All time</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">Completed</p>
            <div className="w-9 h-9 rounded-lg bg-success-50 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-success-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
          <p className="text-xs text-gray-400 mt-1">Successful</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">Pending</p>
            <div className="w-9 h-9 rounded-lg bg-warning-50 flex items-center justify-center">
              <History className="w-5 h-5 text-warning-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
          <p className="text-xs text-gray-400 mt-1">In progress</p>
        </div>
      </div>

      {/* Quick Actions + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
            <Link to="/transactions" className="text-sm font-medium text-primary-600 hover:text-primary-700">View All</Link>
          </div>

          {loadingTxns ? (
            <div className="p-10 text-center text-gray-400">
              <div className="w-8 h-8 border-3 border-gray-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
              Loading...
            </div>
          ) : recentTxns.length === 0 ? (
            <div className="p-10 text-center">
              <History className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No transactions yet</p>
              <p className="text-sm text-gray-400 mt-1">Start by adding funds to your wallet</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {recentTxns.map((t) => {
                const isSent = t.fromUserId === user?.id && t.type !== 'TOPUP';
                const party = counterpartyLabel(t, user?.id, names);
                return (
                  <li key={t.reference || t.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSent ? 'bg-danger-50' : 'bg-success-50'}`}>
                      {isSent ? <ArrowUpRight className="w-5 h-5 text-danger-500" /> : <ArrowDownLeft className="w-5 h-5 text-success-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {t.type === 'TOPUP' ? 'Wallet Top-up' : t.type === 'TRANSFER' ? 'Fund Transfer' : 'Merchant Payment'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        <span className="text-gray-400">{party.prefix}:</span> {party.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{timeAgo(t.createdAt)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold ${isSent ? 'text-danger-600' : 'text-success-600'}`}>
                        {isSent ? '-' : '+'}{formatCurrency(t.amount)}
                      </p>
                      <StatusBadge status={t.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link to="/transfer" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                  <SendHorizontal className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Send Money</p>
                  <p className="text-xs text-gray-400">Transfer to anyone</p>
                </div>
              </Link>
              <Link to="/topup" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-success-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                  <PlusCircle className="w-5 h-5 text-success-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Add Funds</p>
                  <p className="text-xs text-gray-400">Top up your wallet</p>
                </div>
              </Link>
              <Link to="/transactions" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-warning-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                  <History className="w-5 h-5 text-warning-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Transaction History</p>
                  <p className="text-xs text-gray-400">View all activity</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Wallet Info */}
          <div className="bg-gradient-to-br from-primary-50 to-primary-100/50 rounded-xl border border-primary-100 p-6">
            <h3 className="font-semibold text-primary-900 mb-3">Wallet Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-primary-600">Wallet ID</span>
                <span className="font-mono text-primary-800 text-xs break-all">{wallet?.id || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-primary-600">Currency</span>
                <span className="font-medium text-primary-800">{wallet?.currency || 'INR'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-primary-600">Owner</span>
                <span className="font-medium text-primary-800">{user?.username || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
