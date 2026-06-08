import { useState } from 'react';
import { ExternalLink, PlusCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { WEB_APP_URL } from '../lib/api';

function formatCurrency(val, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2 }).format(val || 0);
}

const presets = [500, 1000, 2000, 5000, 10000, 25000];

export default function FundsView() {
  const { wallet } = useAuth();
  const currency = wallet?.currency || 'INR';
  const [amount, setAmount] = useState('');

  const openPayment = () => {
    // Razorpay Checkout loads a remote script and needs a persistent window, which
    // an MV3 popup can't host (CSP blocks remote scripts and the popup closes when
    // it loses focus). Hand the flow off to the full web app in a new tab.
    const amt = parseFloat(amount);
    const base = `${WEB_APP_URL}/topup?ewalletSync=extension`;
    const url = amt && amt >= 1 ? `${base}&amount=${amt}` : base;
    window.open(url, '_blank', 'noopener');
  };

  return (
    <div className="h-full overflow-y-auto popup-scroll p-4 space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-success-600 to-primary-600 p-5 text-white shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <PlusCircle className="w-5 h-5" />
          <div className="text-lg font-bold">Add Funds</div>
        </div>
        <p className="text-white/80 text-xs">Top up your wallet securely via Razorpay.</p>
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg text-xs backdrop-blur">
          Balance: <span className="font-bold">{formatCurrency(wallet?.balance, currency)}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Select amount</label>
          <div className="grid grid-cols-3 gap-2">
            {presets.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(String(val))}
                className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                  amount === String(val)
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {formatCurrency(val, currency)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Or enter custom amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">&#8377;</span>
            <input
              type="number"
              step="0.01"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-8 pr-3 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            />
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-primary-50 border border-primary-100">
          <ShieldCheck className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-primary-700/90 leading-relaxed">
            Payment opens in the Sterling web app in a new tab, where Razorpay's secure
            checkout (card, UPI, netbanking) runs. Your wallet is credited only after the
            payment is verified.
          </p>
        </div>

        <button
          type="button"
          onClick={openPayment}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-success-600 to-primary-600 hover:from-success-700 hover:to-primary-700 shadow-lg shadow-primary-600/25 transition-all flex items-center justify-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Continue to secure payment
        </button>
      </div>
    </div>
  );
}
