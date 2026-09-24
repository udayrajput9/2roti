import React, { useState, useEffect } from 'react';
import { RotateCcw, AlertTriangle, CheckCircle, ShieldCheck, Search, DollarSign } from 'lucide-react';

export default function Refunds() {
  const [orders, setOrders] = useState([]);
  const [orderId, setOrderId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const loadDeliveredOrders = async () => {
    try {
      const res = await fetch('/api/orders/staff?status=ALL');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setOrders(data.orders || []);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadDeliveredOrders();
  }, []);

  const handleRefund = async (e) => {
    e.preventDefault();
    if (!orderId) {
      setError('Please select or enter an Order ID.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMsg('');

      const res = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: parseInt(orderId),
          reason: reason.trim() || 'Admin initiated refund'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Refund processing failed.');
      }

      setMsg(data.message);
      setOrderId('');
      setReason('');
      await loadDeliveredOrders();
    } catch (err) {
      setError(err.message || 'Refund error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      
      {/* Title */}
      <div>
        <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <span>Refund Management System</span>
          <span className="text-xs bg-red-950 text-red-400 border border-red-800 px-2.5 py-0.5 rounded-full font-bold">
            Cashback Reversal Protected
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Process refunds with automated wallet re-crediting or Razorpay refund, plus ₹3 cashback rollback.
        </p>
      </div>

      {msg && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-800 text-xs text-red-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Refund Trigger Card */}
      <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-lg max-w-xl">
        <h3 className="text-sm font-black text-white mb-3 flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-[#FF5722]" />
          <span>Issue Customer Refund</span>
        </h3>

        <form onSubmit={handleRefund} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-300 mb-1">Target Order</label>
            <select
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="w-full bg-[#1F2937] border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#FF5722]"
            >
              <option value="">Select an order to refund...</option>
              {orders.filter(o => o.order_status !== 'REFUNDED').map(o => (
                <option key={o.id} value={o.id}>
                  {o.order_token} — {o.customer_name} (₹{o.total_customer_price}) [Source: {o.payment_source}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Reason for Refund</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Food damaged, delivery cancelled, customer complained"
              className="w-full bg-[#1F2937] border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
            />
          </div>

          <div className="p-3 bg-slate-900 rounded-xl text-[11px] text-slate-400 space-y-1">
            <p>🛡️ <strong>Wallet Paid Orders:</strong> Refunded 100% back to Customer Wallet immediately.</p>
            <p>🔄 <strong>Cashback Reversal:</strong> If ₹3 cashback was previously credited on delivery, it will be automatically revoked with zero-floor balance protection.</p>
          </div>

          <button
            type="submit"
            disabled={loading || !orderId}
            className="w-full mt-4 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
          >
            {loading ? 'Processing Refund...' : 'Authorize Full Refund'}
          </button>
        </form>
      </div>

    </div>
  );
}
