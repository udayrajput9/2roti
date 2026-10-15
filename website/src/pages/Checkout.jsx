import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { isCurryOrThaliItem, isBreadOrAddonItem } from '../utils/comboValidation';

const RAZORPAY_KEY = 'rzp_test_2rotiDemoKey123'; // Used strictly as a fallback if window.razorpayKey is not set

export default function CheckoutPage({ onBack, onOrderSuccess, locations = [], activeLocation }) {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const { cartItems, itemsTotal, deliveryFee, grandTotal, hasOutletItems, clearCart, isPaymentsStopped, paymentsClosedMessage } = useCart();

  const [addressNote, setAddressNote] = useState('');
  const [hpTrap, setHpTrap] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isHalted, setIsHalted] = useState(false);
  const [idempotencyKey] = useState(() => Math.random().toString(36).substring(2, 15) + Date.now().toString(36));

  const chosenLocation = activeLocation || locations[0];
  const halted = isHalted || isPaymentsStopped;

  useEffect(() => {
    // Check if kitchen/admin has stopped payments & orders
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.settings) {
          const isHalt = d.settings.emergency_stop_payments === 'true' || d.settings.kitchen_status === 'STOPPED';
          setIsHalted(isHalt);
        }
      })
      .catch(() => {});

    // Dynamically load Razorpay SDK
    if (!document.getElementById('razorpay-sdk')) {
      const script = document.createElement('script');
      script.id = 'razorpay-sdk';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handlePlaceOrder = async () => {
    // Emergency Killswitch check
    if (halted) {
      setError('Please continue order tomorrow from 8:00 AM to 7:00 PM.');
      return;
    }

    if (!isAuthenticated) {
      setError('Please log in with your phone number to place the order.');
      return;
    }

    if (cartItems.length === 0) {
      setError('Your food basket is empty.');
      return;
    }

    const hasCurryOrThali = cartItems.some(item => isCurryOrThaliItem(item) && item.quantity > 0);
    const hasBreads = cartItems.some(item => isBreadOrAddonItem(item) && item.quantity > 0);
    if (hasBreads && !hasCurryOrThali) {
      setError('Roti and breads can only be ordered as a combo with Curry or Thali. Please add a Curry or Thali dish to your basket.');
      return;
    }

    if (!window.Razorpay) {
      setError('Razorpay SDK failed to load. Please check your internet connection.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // 1. Create Razorpay Order on Backend
      const rzpRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: grandTotal })
      });
      const rzpData = await rzpRes.json();
      if (!rzpRes.ok || !rzpData.success) {
        throw new Error(rzpData.message || 'Payment initiation failed.');
      }

      const rzpOrderId = rzpData.razorpay_order_id;
      const keyId = rzpData.key_id || RAZORPAY_KEY;

      // 2. Open Razorpay Checkout Window
      const options = {
        key: keyId,
        amount: Math.round(grandTotal * 100), // in paise
        currency: 'INR',
        name: '2Roti Campus Delivery',
        description: 'Food Order Payment',
        order_id: rzpOrderId,
        prefill: {
          name: user?.name || '',
          contact: user?.phone || '',
        },
        theme: {
          color: '#FF5722'
        },
        handler: async function (response) {
          try {
            setLoading(true);
            const orderPayload = {
              items: cartItems.map(i => ({ id: i.id, quantity: i.quantity })),
              location_id: chosenLocation?.id || 1,
              delivery_address_note: addressNote.trim() || (hasOutletItems ? 'Jhungiya Outlet Counter' : chosenLocation?.name),
              is_outlet_order: hasOutletItems,
              payment_source: 'razorpay',
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              _hp_trap: hpTrap
            };

            const res = await fetch('/api/orders/create', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'x-idempotency-key': idempotencyKey
              },
              body: JSON.stringify(orderPayload)
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
              throw new Error(data.message || 'Order creation failed.');
            }

            clearCart();
            await refreshUser();
            if (onOrderSuccess) onOrderSuccess(data.order);
          } catch (err) {
            setError(err.message || 'Failed to place order after payment.');
            setLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setError(response.error.description || 'Payment failed.');
        setLoading(false);
      });
      rzp.open();

    } catch (err) {
      setError(err.message || 'Failed to initiate payment.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. Header & Location */}
      <div className="bg-[#121212] border border-neutral-800/90 rounded-3xl p-5 shadow-lg">
        <h2 className="text-lg font-black text-white flex items-center gap-2 mb-4">
          Checkout & Delivery
        </h2>
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-950/80 border border-red-800 text-xs text-red-200">
            {error}
          </div>
        )}
        <div className="p-3 bg-neutral-900/50 rounded-2xl border border-neutral-800">
          <p className="text-sm font-bold text-white mb-1">Delivering To:</p>
          <p className="text-xs text-neutral-400">{hasOutletItems ? 'Jhungiya Outlet Counter' : chosenLocation?.name}</p>
        </div>

        {/* Campus Delivery Timing Note */}
        <div className="mt-4 p-3.5 bg-neutral-900/60 border border-neutral-800 rounded-2xl text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-amber-400 font-bold text-xs">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Campus Gate Delivery</span>
          </div>
          <p className="text-neutral-300 font-medium text-[11px] leading-relaxed">
            Hot meals deliver directly to your campus gate during daily evening delivery dispatch (approx. 7:30 PM – 8:00 PM).
          </p>
        </div>
      </div>

      {/* 2. Order Summary & Bill Details */}
      <div className="bg-[#121212] border border-neutral-800/90 rounded-3xl p-4 sm:p-5 shadow-lg space-y-2.5 text-xs">
        <h3 className="font-black uppercase tracking-wider text-neutral-400 mb-1 flex items-center justify-between">
          <span>Order Summary</span>
          <span className="text-neutral-500 font-bold">{cartItems.length} items</span>
        </h3>

        <div className="space-y-1.5 pb-2.5 border-b border-neutral-800/80 max-h-48 overflow-y-auto pr-1">
          {cartItems.map((item) => (
            <div key={item.id} className="flex justify-between text-neutral-300">
              <span className="font-medium">{item.quantity}x {item.name}</span>
              <span className="font-bold text-white">₹{(item.customer_price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-between text-neutral-400 pt-1">
          <span>Items Subtotal</span>
          <span className="font-bold text-white">₹{itemsTotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-neutral-400 items-center">
          <span>Campus Delivery Charges</span>
          {deliveryFee === 0 ? (
            <span className="text-emerald-400 font-bold text-[11px] bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60">
              FREE
            </span>
          ) : (
            <span className="font-bold text-white">₹{deliveryFee.toFixed(2)}</span>
          )}
        </div>

        <div className="flex justify-between text-sm sm:text-base font-black text-white pt-2.5 border-t border-neutral-800">
          <span>Total Amount Payable</span>
          <span className="text-[#FF7043] text-lg font-black">₹{grandTotal.toFixed(2)}</span>
        </div>
      </div>

      <input type="text" name="_hp_trap" value={hpTrap} onChange={(e) => setHpTrap(e.target.value)} tabIndex={-1} autoComplete="off" className="hidden" />

      {/* Emergency Halt Notice */}
      {halted && (
        <div className="p-3.5 rounded-2xl bg-amber-950/90 border border-amber-500/70 text-amber-200 text-xs font-bold flex items-center gap-2.5 shadow-lg">
          <Clock className="w-5 h-5 text-amber-400 shrink-0" />
          <span>Please continue order tomorrow from 8:00 AM to 7:00 PM.</span>
        </div>
      )}

      {/* 3. Place Order CTA */}
      <button
        onClick={handlePlaceOrder}
        disabled={loading || halted}
        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_8px_28px_rgba(255,87,34,0.4)] active:scale-95 disabled:opacity-50 transition-all group ${
          halted
            ? 'bg-neutral-800 text-amber-300/80 cursor-not-allowed border border-amber-600/40 text-[11px] leading-tight px-2'
            : 'bg-gradient-to-r from-[#FF5722] to-[#E64A19] hover:from-[#F4511E] hover:to-[#D84315] text-white'
        }`}
      >
        {loading ? (
          <span className="animate-pulse">Processing Payment...</span>
        ) : halted ? (
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Please Continue Order Tomorrow (8 AM - 7 PM)</span>
          </span>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            <span>Pay ₹{grandTotal.toFixed(2)} with Razorpay</span>
          </>
        )}
      </button>

      {/* Trust Seal */}
      <div className="text-center text-[10px] text-neutral-500 font-semibold flex items-center justify-center gap-1.5 pt-1">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>100% Safe & Secure Payments by Razorpay</span>
      </div>
    </div>
  );
}
