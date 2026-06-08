import { useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Loader2 } from 'lucide-react';
import { txnApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';

function formatCurrency(val, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2 }).format(val || 0);
}

export default function TransactionsView() {
  const { user, wallet } = useAuth();
  const currency = wallet?.currency || 'INR';
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const rows = useMemo(() => txns || [], [txns]);

  useEffect(() => {
    setLoading(true);
    setErr('');
    txnApi
      .mine()
      .then((res) => {
        if (res.data?.success) setTxns(res.data.data || []);
        else setErr(res.data?.message || 'Failed to load transactions');
      })
      .catch((ex) => setErr(ex.response?.data?.message || 'Failed to load transactions'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3">
        <div className="text-sm font-semibold text-gray-900">Transactions</div>
        <div className="text-[11px] text-gray-500">Your recent wallet activity</div>
      </div>

      <div className="flex-1 min-h-0 px-4 pb-4 overflow-y-auto popup-scroll">
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : err ? (
          <div className="p-4 rounded-2xl bg-danger-50 border border-danger-500/20 text-danger-600 text-sm font-medium">
            {err}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-4 rounded-2xl bg-white border border-gray-100 text-sm text-gray-500">
            No transactions yet.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((t) => {
              const isDebit =
                t?.fromUserId && String(t.fromUserId) === String(user?.id) && String(t?.type || '').toUpperCase() !== 'TOPUP';
              const Icon = isDebit ? ArrowUpRight : ArrowDownLeft;
              return (
                <div key={t.reference || `${t.createdAt}-${t.amount}`} className="bg-white border border-gray-100 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDebit ? 'bg-danger-50' : 'bg-success-50'}`}>
                        <Icon className={`w-4 h-4 ${isDebit ? 'text-danger-600' : 'text-success-600'}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {String(t?.type || 'TXN').replaceAll('_', ' ')}
                          {t?.reason ? <span className="text-gray-500 font-normal"> • {t.reason}</span> : null}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate">
                          {t?.createdAt || ''}{t?.reference ? ` • ${t.reference}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm font-semibold shrink-0 whitespace-nowrap text-right ${isDebit ? 'text-danger-600' : 'text-success-600'}`}>
                      {isDebit ? '-' : '+'}{formatCurrency(t?.amount, currency)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

