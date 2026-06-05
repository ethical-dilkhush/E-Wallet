import { useEffect, useState, useMemo } from 'react';
import { History, Search, Filter, ArrowUpRight, ArrowDownLeft, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { txnApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { useCounterpartyNames, counterpartyLabel } from '../hooks/useCounterparties';

function formatCurrency(val) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(val || 0);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const typeLabels = { TRANSFER: 'Transfer', TOPUP: 'Top-up', MERCHANT_PAYMENT: 'Merchant Payment' };
const typeIcons = { TRANSFER: SendIcon, TOPUP: ArrowDownLeft, MERCHANT_PAYMENT: Store };

function SendIcon(props) {
  return <ArrowUpRight {...props} />;
}

export default function Transactions() {
  const { user } = useAuth();
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const names = useCounterpartyNames(txns);

  const fetchTransactions = async () => {
    try {
      const res = await txnApi.mine();
      if (res.data?.success) setTxns(res.data.data || []);
    } catch { /* */ }
    setLoading(false);
  };

  useEffect(() => { fetchTransactions(); }, []);

  // Auto-refresh while any transaction is still settling (PENDING) so statuses
  // update from PENDING to COMPLETED/FAILED without a manual reload.
  useEffect(() => {
    const hasPending = txns.some((t) => t.status === 'PENDING');
    if (!hasPending) return;
    const id = setInterval(fetchTransactions, 3000);
    return () => clearInterval(id);
  }, [txns]);

  const filtered = useMemo(() => {
    return txns.filter((t) => {
      if (filterType !== 'ALL' && t.type !== filterType) return false;
      if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (t.reference || '').toLowerCase().includes(q) ||
          (t.reason || '').toLowerCase().includes(q) ||
          (t.merchantId || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [txns, filterType, filterStatus, search]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by reference, reason, merchant..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            />
          </div>
          {/* Type filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500">
              <option value="ALL">All Types</option>
              <option value="TRANSFER">Transfer</option>
              <option value="TOPUP">Top-up</option>
              <option value="MERCHANT_PAYMENT">Merchant Payment</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500">
              <option value="ALL">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Showing {filtered.length} of {txns.length} transactions
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="w-8 h-8 border-3 border-gray-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
            Loading transactions...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <History className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No transactions found</p>
            <p className="text-sm text-gray-400 mt-1">{txns.length > 0 ? 'Try adjusting your filters' : 'Your transaction history will appear here'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-3">Transaction</th>
                  <th className="px-6 py-3 hidden sm:table-cell">Reference</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3 hidden md:table-cell">Date</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((t) => {
                  const isSent = t.fromUserId === user?.id && t.type !== 'TOPUP';
                  const Icon = typeIcons[t.type] || ArrowUpRight;
                  const party = counterpartyLabel(t, user?.id, names);
                  return (
                    <tr key={t.reference || t.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            t.type === 'TOPUP' ? 'bg-success-50' : t.type === 'MERCHANT_PAYMENT' ? 'bg-purple-50' : isSent ? 'bg-danger-50' : 'bg-success-50'
                          }`}>
                            <Icon className={`w-4 h-4 ${
                              t.type === 'TOPUP' ? 'text-success-600' : t.type === 'MERCHANT_PAYMENT' ? 'text-purple-600' : isSent ? 'text-danger-500' : 'text-success-500'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{typeLabels[t.type] || t.type}</p>
                            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">
                              <span className="text-gray-400">{party.prefix}:</span> {party.name}
                            </p>
                            {t.reason && (
                              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{t.reason}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <span className="font-mono text-xs text-gray-500">{t.reference}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${isSent ? 'text-danger-600' : 'text-success-600'}`}>
                          {isSent ? '-' : '+'}{formatCurrency(t.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell text-gray-500 text-xs">
                        {formatDate(t.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={t.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
