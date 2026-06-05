import { useEffect, useState } from 'react';
import { userApi } from '../services/api';

export function useCounterpartyNames(txns) {
  const [names, setNames] = useState({});

  useEffect(() => {
    const ids = [
      ...new Set(
        (txns || [])
          .flatMap((t) => [t.fromUserId, t.toUserId])
          .filter((id) => id != null)
      ),
    ];
    if (ids.length === 0) return;

    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        ids.map(async (id) => {
          try {
            const res = await userApi.getById(id);
            if (res.data?.success && res.data.data) {
              const u = res.data.data;
              return [id, u.fullName || u.username || `User #${id}`];
            }
          } catch {
            /* ignore - fall back below */
          }
          return [id, `User #${id}`];
        })
      );
      if (!cancelled) setNames(Object.fromEntries(entries));
    })();

    return () => {
      cancelled = true;
    };
  }, [txns]);

  return names;
}

export function counterpartyLabel(txn, currentUserId, names) {
  if (txn.type === 'TOPUP') {
    return { prefix: 'From', name: 'Bank Account' };
  }
  if (txn.type === 'MERCHANT_PAYMENT') {
    return { prefix: 'To', name: txn.merchantId || 'Merchant' };
  }

  const isSent = txn.fromUserId === currentUserId;
  const otherId = isSent ? txn.toUserId : txn.fromUserId;
  const name = names[otherId] || (otherId != null ? `User #${otherId}` : 'Unknown');
  return { prefix: isSent ? 'To' : 'From', name };
}
