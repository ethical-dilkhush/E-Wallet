import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PlusCircle, CheckCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { paymentApi } from '../services/api';

function formatCurrency(val) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(val || 0);
}

const presets = [500, 1000, 2000, 5000, 10000, 25000];

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

// Load the Razorpay Checkout script on demand; resolves false if it can't load.
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Topup() {
  const { wallet, pollWallet, user } = useAuth();
  const notify = useNotifications();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  // Prefill the amount when arriving from the browser extension (e.g. ?amount=500).
  useEffect(() => {
    const preset = searchParams.get('amount');
    if (preset && !Number.isNaN(parseFloat(preset))) {
      setAmount(String(parseFloat(preset)));
    }
  }, [searchParams]);

  const selectPreset = (val) => setAmount(String(val));

  const submit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt < 1) return;
    setLoading(true);

    try {
      const ready = await loadRazorpayScript();
      if (!ready) {
        notify.error('Could not load the payment gateway. Check your connection.');
        setLoading(false);
        return;
      }

      // Step 1: create an order server-side (payment-service holds the key secret).
      const orderRes = await paymentApi.createOrder({ amount: amt });
      const { orderId, keyId, currency } = orderRes.data?.data || {};
      if (!orderId || !keyId) {
        notify.error('Could not start the payment.');
        setLoading(false);
        return;
      }

      const prevBalance = Number(wallet?.balance ?? 0);

      // Step 2: open Razorpay Checkout (handles card / UPI / netbanking).
      const rzp = new window.Razorpay({
        key: keyId,
        amount: Math.round(amt * 100),
        currency: currency || 'INR',
        order_id: orderId,
        name: 'Sterling E-Wallet',
        description: 'Wallet top-up',
        prefill: {
          name: user?.fullName || user?.username || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: { color: '#4f46e5' },
        // Step 3: verify the signature server-side; only then is the wallet credited.
        handler: async (response) => {
          try {
            await paymentApi.verify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            // The credit settles asynchronously; wait until the balance rises.
            await pollWallet((w) => Number(w?.balance ?? 0) > prevBalance);
            setSuccess({ reference: response.razorpay_payment_id });
            notify.success(`${formatCurrency(amt)} added to your wallet!`);
          } catch (ex) {
            notify.error(ex.response?.data?.message || 'Payment verification failed');
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });

      rzp.on('payment.failed', (resp) => {
        notify.error(resp.error?.description || 'Payment failed');
        setLoading(false);
      });

      rzp.open();
    } catch (ex) {
      notify.error(ex.response?.data?.message || 'Top-up failed');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-success-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-success-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Top-up Successful!</h2>
          <p className="text-gray-500 mb-2">{formatCurrency(amount)} has been added to your wallet.</p>
          <p className="text-sm text-gray-400 mb-6 font-mono">Payment ID: {success.reference}</p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-500">New Balance</p>
            <p className="text-3xl font-bold text-primary-700">{formatCurrency(wallet?.balance)}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setSuccess(null); setAmount(''); }} className="flex-1 py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
              Add More
            </button>
            <button onClick={() => navigate('/dashboard')} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors">
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-success-600 to-primary-600 p-6 sm:p-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <PlusCircle className="w-6 h-6" />
            <h2 className="text-xl font-bold">Add Funds</h2>
          </div>
          <p className="text-white/80 text-sm">Top up your wallet balance securely via Razorpay.</p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl text-sm backdrop-blur">
            Current Balance: <span className="font-bold">{formatCurrency(wallet?.balance)}</span>
          </div>
        </div>

        <form onSubmit={submit} className="p-6 sm:p-8 space-y-6">
          {/* Preset Amounts */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Select Amount</label>
            <div className="grid grid-cols-3 gap-3">
              {presets.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => selectPreset(val)}
                  className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                    amount === String(val)
                      ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {formatCurrency(val)}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Or enter custom amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">&#8377;</span>
              <input
                type="number"
                step="0.01"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all text-lg font-semibold"
              />
            </div>
          </div>

          {/* Secure payment note */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-primary-50 border border-primary-100">
            <ShieldCheck className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-primary-700/90 leading-relaxed">
              You'll complete payment in Razorpay's secure window, where you can pay by card, UPI, or netbanking.
              Your wallet is credited only after the payment is verified on our servers.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !amount}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-success-600 to-primary-600 hover:from-success-700 hover:to-primary-700 shadow-lg shadow-primary-600/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            <PlusCircle className="w-4 h-4" />
            Pay {amount ? formatCurrency(amount) : 'Funds'}
          </button>
        </form>
      </div>
    </div>
  );
}
