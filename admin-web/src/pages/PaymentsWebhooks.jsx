import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Play,
  ShieldCheck,
  X,
  Code
} from 'lucide-react';

export default function PaymentsWebhooks() {
  const [logs, setLogs] = useState({ webhooks: [], transactions: [] });
  const [loading, setLoading] = useState(true);
  const [showSimModal, setShowSimModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [simOrderId, setSimOrderId] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [selectedPayload, setSelectedPayload] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payments/logs');
      if (res.ok) {
        const data = await res.json();
        if (data.success) setLogs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSimulateWebhook = async (e) => {
    e.preventDefault();
    if (confirmText !== 'CONFIRM') {
      alert('You must type "CONFIRM" in capital letters to execute simulation.');
      return;
    }

    try {
      setSimulating(true);
      const res = await fetch('/api/payments/webhook-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm: 'CONFIRM',
          order_id: simOrderId ? parseInt(simOrderId) : null
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Simulation rejected');
      }

      setShowSimModal(false);
      setConfirmText('');
      setSimOrderId('');
      await fetchLogs();
      alert(`Simulation Success! Event ID: ${data.simulated_event_id}`);
    } catch (err) {
      alert(err.message || 'Simulation error');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Razorpay Payments & Webhook Monitor</span>
            <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
              Idempotency Protected
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time Razorpay payment verification, webhook signatures, and event deduplication.
          </p>
        </div>

        <button
          onClick={() => setShowSimModal(true)}
          className="px-4 py-2 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Simulate Test Webhook</span>
        </button>
      </div>

      {/* Grid: Live Transactions & Webhook Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Real-time Razorpay Transactions */}
        <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#FF5722]" />
              <span>Razorpay Captured Payments</span>
            </h3>
            <span className="text-xs text-slate-400">{logs.transactions.length} records</span>
          </div>

          <div className="overflow-x-auto max-h-[460px]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 pb-2">
                  <th className="pb-2 font-bold">Order Token</th>
                  <th className="pb-2 font-bold">Payment ID</th>
                  <th className="pb-2 font-bold">Amount</th>
                  <th className="pb-2 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.transactions.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-slate-500">
                      No Razorpay payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 font-bold text-white">{tx.order_token}</td>
                      <td className="py-2.5 font-mono text-[11px] text-slate-400">
                        {tx.razorpay_payment_id || 'N/A'}
                      </td>
                      <td className="py-2.5 font-black text-emerald-400">
                        ₹{(parseFloat(tx.total_customer_price) + parseFloat(tx.delivery_fee || 0)).toFixed(2)}
                      </td>
                      <td className="py-2.5">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 uppercase">
                          {tx.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Webhooks Stream & Inspector */}
        <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Incoming Webhooks Log</span>
            </h3>
            <span className="text-xs text-slate-400">{logs.webhooks.length} events</span>
          </div>

          <div className="overflow-x-auto max-h-[460px]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 pb-2">
                  <th className="pb-2 font-bold">Event ID</th>
                  <th className="pb-2 font-bold">Type</th>
                  <th className="pb-2 font-bold">Processed</th>
                  <th className="pb-2 font-bold">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.webhooks.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-slate-500">
                      No webhook requests received yet.
                    </td>
                  </tr>
                ) : (
                  logs.webhooks.map((wh) => (
                    <tr key={wh.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 font-mono text-[11px] text-slate-300">{wh.event_id}</td>
                      <td className="py-2.5 font-bold text-orange-400">{wh.event_type}</td>
                      <td className="py-2.5 text-slate-400 text-[10px]">
                        {new Date(wh.processed_at).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5">
                        <button
                          onClick={() => setSelectedPayload(wh.payload)}
                          className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold"
                        >
                          View JSON
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* JSON Viewer Modal */}
      {selectedPayload && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedPayload(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-black text-white mb-2 flex items-center gap-2">
              <Code className="w-4 h-4 text-[#FF5722]" />
              <span>Raw Webhook Payload JSON</span>
            </h3>
            <pre className="bg-[#0B0F17] p-3 rounded-2xl text-[11px] text-emerald-400 font-mono overflow-auto max-h-80 border border-slate-800">
              {JSON.stringify(JSON.parse(selectedPayload), null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Gated Webhook Simulator Modal */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-amber-600 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowSimModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-black text-white">Gated Webhook Test Simulator</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">
              This safely triggers an idempotent <code>payment.captured</code> webhook. The simulated order is flagged <code>is_test_simulated = true</code> to prevent corrupting real vendor payouts.
            </p>

            <form onSubmit={handleSimulateWebhook} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Target Order ID (Optional)</label>
                <input
                  type="number"
                  value={simOrderId}
                  onChange={(e) => setSimOrderId(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full bg-[#1F2937] border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-amber-300 mb-1">
                  Type "CONFIRM" to authorize simulation:
                </label>
                <input
                  type="text"
                  required
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="CONFIRM"
                  className="w-full bg-[#1F2937] border border-amber-500/80 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={simulating || confirmText !== 'CONFIRM'}
                className="w-full mt-4 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
              >
                {simulating ? 'Injecting Webhook...' : 'Execute Test Webhook Event'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
