import React, { useState } from 'react';
import { ArrowLeft, MapPin, Wallet, CreditCard, Banknote, ShieldCheck, CheckCircle2, AlertCircle, Sparkles, Zap, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function CheckoutPage({ onBack, onOrderSuccess, locations = [], activeLocation }) {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const { cartItems, itemsTotal, deliveryFee, grandTotal, hasOutletItems, clearCart } = useCart();

  const [paymentMethod, setPaymentMethod] = useState('razorpay'); // 'wallet' | 'razorpay' | 'cod_outlet'
  const [addressNote, setAddressNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const walletBalance = parseFloat(user?.wallet_balance || 0);
  const isWalletEligible = walletBalance >= 50.00 && walletBalance >= grandTotal;

  // Selected delivery location
  const chosenLocation = activeLocation || locations[0];

  const quickChips = ['Hostel Gate 1', 'Hostel Gate 2', 'Call upon arrival', 'Leave at reception'];

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      setError('Please log in with your phone number to place the order.');
      return;
    }

    if (cartItems.length === 0) {
      setError('Your food basket is empty.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      let paymentSource = paymentMethod;
      let rzpOrderId = null;
      let rzpPaymentId = null;

      if (paymentMethod === 'razorpay') {
        const rzpRes = await fetch('/api/payments/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: grandTotal })
        });
        const rzpData = await rzpRes.json();
        if (!rzpRes.ok || !rzpData.success) {
          throw new Error(rzpData.message || 'Payment initiation failed.');
        }

        rzpOrderId = rzpData.razorpay_order_id;
        rzpPaymentId = `pay_${Date.now()}`;
      }

      const orderPayload = {
        items: cartItems.map(i => ({ id: i.id, quantity: i.quantity })),
        location_id: chosenLocation?.id || 1,
        delivery_address_note: addressNote.trim() || (hasOutletItems ? 'Jhungiya Outlet Counter' : chosenLocation?.name),
        is_outlet_order: hasOutletItems,
        payment_source: paymentSource,
        razorpay_order_id: rzpOrderId,
        razorpay_payment_id: rzpPaymentId
      };

      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setError(err.message || 'Failed to place order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-28 pt-3 px-3 sm:px-4 max-w-2xl mx-auto space-y-4">
      
      {/* 1. Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2.5 rounded-2xl bg-[#141414] hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-all active:scale-95 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-base sm:text-lg font-black text-white tracking-tight leading-none">
            Final Checkout
          </h1>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Campus delivery details & payment
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800/80 text-xs text-rose-200 flex items-center gap-2 shadow-md">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Delivery Location Card */}
      <div className="bg-[#121212] border border-neutral-800/90 rounded-3xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-neutral-400">
            <MapPin className="w-3.5 h-3.5 text-[#FF5722]" />
            <span>{hasOutletItems ? 'Counter Pickup Location' : 'Campus Delivery Drop Point'}</span>
          </div>
          <span className="text-[10px] font-black text-emerald-400 bg-emerald-950/80 border border-emerald-800/50 px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Verified Drop</span>
          </span>
        </div>

        <div className="bg-[#181818] border border-neutral-700/60 rounded-2xl p-3.5 space-y-2">
          <div className="text-sm font-black text-white">
            {hasOutletItems ? 'Jhungiya Outlet Counter' : `${chosenLocation?.name} Campus`}
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed font-medium">
            {hasOutletItems
              ? 'Self-pickup at the physical counter inside the Jhungiya outlet.'
              : 'Our campus runner will deliver your hot food right to your hostel/campus gate.'}
          </p>

          {/* Quick chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {quickChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setAddressNote(chip)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all active:scale-95 ${
                  addressNote === chip
                    ? 'bg-[#FF5722] text-white border-[#FF5722]'
                    : 'bg-[#121212] text-neutral-400 border-neutral-700/80 hover:text-white hover:border-neutral-600'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={addressNote}
            onChange={(e) => setAddressNote(e.target.value)}
            placeholder="Hostel name, room number, or special instructions"
            className="w-full bg-[#121212] border border-neutral-700/80 rounded-xl px-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] transition-all font-medium"
          />
        </div>
      </div>

      {/* 3. Payment Method Selection */}
      <div className="bg-[#121212] border border-neutral-800/90 rounded-3xl p-4 sm:p-5 shadow-lg">
        <h2 className="text-xs font-black uppercase tracking-wider text-neutral-400 mb-3">
          Select Payment Method
        </h2>

        <div className="space-y-2.5">
          
          {/* 1. 2 Roti Loyalty Wallet */}
          <div
            onClick={() => {
              if (isWalletEligible) setPaymentMethod('wallet');
            }}
            className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between cursor-pointer ${
              paymentMethod === 'wallet'
                ? 'bg-[#FF5722]/15 border-[#FF5722] text-white shadow-[0_0_20px_rgba(255,87,34,0.15)] ring-1 ring-[#FF5722]'
                : isWalletEligible
                ? 'bg-[#181818] border-neutral-700/80 hover:border-neutral-500 text-neutral-200'
                : 'bg-[#141414] border-neutral-800/80 opacity-50 cursor-not-allowed text-neutral-500'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl mt-0.5 ${paymentMethod === 'wallet' ? 'bg-[#FF5722] text-white' : 'bg-neutral-800 text-neutral-400'}`}>
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black">2 Roti Loyalty Wallet</span>
                  <span className="text-[10px] font-black text-[#FF9800] bg-[#FF9800]/15 border border-[#FF9800]/30 px-2 py-0.5 rounded-full">
                    Bal: ₹{walletBalance.toFixed(2)}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  {isWalletEligible
                    ? '1-Click Free Checkout! Balance covers full order amount.'
                    : walletBalance < 50.00
                    ? 'Minimum ₹50 balance required to redeem wallet.'
                    : `Insufficient balance (Requires ₹${grandTotal.toFixed(2)}).`}
                </p>
              </div>
            </div>

            <div className="mt-1">
              <input
                type="radio"
                name="payment_opt"
                disabled={!isWalletEligible}
                checked={paymentMethod === 'wallet'}
                onChange={() => setPaymentMethod('wallet')}
                className="w-4 h-4 text-[#FF5722] focus:ring-0 cursor-pointer"
              />
            </div>
          </div>

          {/* 2. Razorpay Online */}
          <div
            onClick={() => setPaymentMethod('razorpay')}
            className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between cursor-pointer ${
              paymentMethod === 'razorpay'
                ? 'bg-[#FF5722]/15 border-[#FF5722] text-white shadow-[0_0_20px_rgba(255,87,34,0.15)] ring-1 ring-[#FF5722]'
                : 'bg-[#181818] border-neutral-700/80 hover:border-neutral-500 text-neutral-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl mt-0.5 ${paymentMethod === 'razorpay' ? 'bg-[#FF5722] text-white' : 'bg-neutral-800 text-neutral-400'}`}>
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black">Online Payment (UPI, Cards)</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded-full font-black">
                    +₹3 Cashback
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  UPI (GPay, PhonePe, Paytm, QR), Cards & Netbanking
                </p>
              </div>
            </div>

            <div className="mt-1">
              <input
                type="radio"
                name="payment_opt"
                checked={paymentMethod === 'razorpay'}
                onChange={() => setPaymentMethod('razorpay')}
                className="w-4 h-4 text-[#FF5722] focus:ring-0 cursor-pointer"
              />
            </div>
          </div>

          {/* 3. Outlet Counter Pay */}
          {hasOutletItems && (
            <div
              onClick={() => setPaymentMethod('cod_outlet')}
              className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between cursor-pointer ${
                paymentMethod === 'cod_outlet'
                  ? 'bg-[#FF5722]/15 border-[#FF5722] text-white shadow-[0_0_20px_rgba(255,87,34,0.15)] ring-1 ring-[#FF5722]'
                : 'bg-[#181818] border-neutral-700/80 hover:border-neutral-500 text-neutral-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl mt-0.5 ${paymentMethod === 'cod_outlet' ? 'bg-[#FF5722] text-white' : 'bg-neutral-800 text-neutral-400'}`}>
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-black">Pay at Counter (Cash/QR)</span>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Pay directly at the Jhungiya Outlet upon food collection.
                  </p>
                </div>
              </div>

              <div className="mt-1">
                <input
                  type="radio"
                  name="payment_opt"
                  checked={paymentMethod === 'cod_outlet'}
                  onChange={() => setPaymentMethod('cod_outlet')}
                  className="w-4 h-4 text-[#FF5722] focus:ring-0 cursor-pointer"
                />
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 4. Order Summary & Bill Details */}
      <div className="bg-[#121212] border border-neutral-800/90 rounded-3xl p-4 sm:p-5 shadow-lg space-y-2.5 text-xs">
        <h3 className="font-black uppercase tracking-wider text-neutral-400 mb-1 flex items-center justify-between">
          <span>Order Summary</span>
          <span className="text-neutral-500 font-bold">{cartItems.length} items</span>
        </h3>

        <div className="space-y-1.5 pb-2.5 border-b border-neutral-800/80 max-h-48 overflow-y-auto pr-1">
          {cartItems.map((item) => (
            <div key={item.id} className="flex justify-between text-neutral-300">
              <span className="font-medium">{item.quantity}× {item.name}</span>
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

        {/* Cashback notice */}
        <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-amber-400 font-bold">
          <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" />
            <span>Guaranteed Student Cashback:</span>
          </span>
          <span>+ ₹3.00 into Wallet</span>
        </div>

        <div className="flex justify-between text-sm sm:text-base font-black text-white pt-2.5 border-t border-neutral-800">
          <span>Total Amount Payable</span>
          <span className="text-[#FF7043] text-lg font-black">₹{grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* 5. Place Order CTA */}
      <button
        onClick={handlePlaceOrder}
        disabled={loading}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#E64A19] hover:from-[#F4511E] hover:to-[#D84315] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_8px_28px_rgba(255,87,34,0.4)] active:scale-95 disabled:opacity-50 transition-all group"
      >
        {loading ? (
          <span className="animate-pulse">Placing Order & Connecting...</span>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            <span>Confirm & Place Order (₹{grandTotal.toFixed(2)})</span>
          </>
        )}
      </button>

      {/* Trust Seal */}
      <div className="text-center text-[10px] text-neutral-500 font-semibold flex items-center justify-center gap-1.5 pt-1">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>100% Safe & Secure Food Delivery • Campus Priority Kitchen</span>
      </div>

    </div>
  );
}
