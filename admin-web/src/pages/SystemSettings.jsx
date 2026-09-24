import React, { useState, useEffect } from 'react';
import {
  Settings,
  Flame,
  Truck,
  Award,
  Phone,
  MessageCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  Save,
  RefreshCw,
  Bell,
  Power,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';

export default function SystemSettings() {
  const [settings, setSettings] = useState({
    kitchen_status: 'OPEN',
    kitchen_timing: '11:00 AM - 11:30 PM',
    free_delivery_threshold: '100',
    delivery_fee: '15',
    cashback_per_order: '3',
    min_wallet_redemption: '50',
    support_phone: '+91 9999999999',
    support_whatsapp: '919999999999',
    announcement_banner: 'Fresh hot meals cooked and delivered right to your campus hostel gate!'
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      }
    } catch (e) {
      console.error('Fetch settings error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg('');
      setSuccessMsg('');

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to save settings.');
      }

      setSuccessMsg(data.message || 'System settings saved successfully!');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.message || 'Error saving settings.');
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const isKitchenOpen = settings.kitchen_status === 'OPEN';

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-[#FF5722]" />
            <span>2 Roti System & Business Controls</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure delivery rules, student loyalty perks, kitchen operational hours, and support channels.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
          title="Reload Settings"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#FF5722]' : ''}`} />
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-200 flex items-center gap-2 shadow-lg">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-bold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800 text-xs text-rose-200 flex items-center gap-2 shadow-lg">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="font-bold">{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* 1. Kitchen Master Operational Status */}
        <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-lg space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <Power className="w-4 h-4 text-[#FF5722]" />
                <span>Kitchen Master Operational Switch</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Toggle kitchen live status for peak rush control or emergency closures.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSettings({ ...settings, kitchen_status: isKitchenOpen ? 'CLOSED' : 'OPEN' })}
              className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-md ${
                isKitchenOpen
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900'
                  : 'bg-rose-950 text-rose-300 border border-rose-700 hover:bg-rose-900'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${isKitchenOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span>{isKitchenOpen ? 'KITCHEN OPEN' : 'KITCHEN CLOSED'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800/80">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Operating Timings Display</span>
              </label>
              <input
                type="text"
                value={settings.kitchen_timing}
                onChange={(e) => setSettings({ ...settings, kitchen_timing: e.target.value })}
                placeholder="e.g. 11:00 AM - 11:30 PM"
                className="w-full bg-[#18202F] border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-slate-400" />
                <span>Announcement Banner (Customer App Header)</span>
              </label>
              <input
                type="text"
                value={settings.announcement_banner}
                onChange={(e) => setSettings({ ...settings, announcement_banner: e.target.value })}
                placeholder="Banner announcement message for campus students..."
                className="w-full bg-[#18202F] border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
              />
            </div>
          </div>
        </div>

        {/* 2. Campus Delivery Fee & Free Delivery Threshold */}
        <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-lg space-y-4">
          <div>
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#FF5722]" />
              <span>Campus Delivery Pricing & Free Delivery Rules</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Control the delivery fee applied to orders below the free delivery minimum threshold.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Free Campus Delivery Threshold (₹)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  step="1"
                  required
                  value={settings.free_delivery_threshold}
                  onChange={(e) => setSettings({ ...settings, free_delivery_threshold: e.target.value })}
                  placeholder="100"
                  className="w-full bg-[#18202F] border border-slate-700 rounded-2xl pl-8 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Orders at or above this cart value get 100% Free Campus Delivery.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Standard Campus Delivery Charge (₹)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  step="1"
                  required
                  value={settings.delivery_fee}
                  onChange={(e) => setSettings({ ...settings, delivery_fee: e.target.value })}
                  placeholder="15"
                  className="w-full bg-[#18202F] border border-slate-700 rounded-2xl pl-8 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Applied to small orders below the free delivery threshold.</p>
            </div>
          </div>
        </div>

        {/* 3. Student Loyalty Wallet & Cashback Parameters */}
        <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-lg space-y-4">
          <div>
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Student Loyalty Cashback & Wallet Redemption Rules</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Control the automatic reward credited upon delivery and the minimum threshold for 100% food meal redemption.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Cashback Awarded Per Delivered Order (₹)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={settings.cashback_per_order}
                  onChange={(e) => setSettings({ ...settings, cashback_per_order: e.target.value })}
                  placeholder="3"
                  className="w-full bg-[#18202F] border border-slate-700 rounded-2xl pl-8 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Credited automatically when order status reaches DELIVERED.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Minimum Wallet Balance for 100% Order Redemption (₹)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  step="1"
                  required
                  value={settings.min_wallet_redemption}
                  onChange={(e) => setSettings({ ...settings, min_wallet_redemption: e.target.value })}
                  placeholder="50"
                  className="w-full bg-[#18202F] border border-slate-700 rounded-2xl pl-8 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Students must accumulate at least this balance to pay for a food order entirely via wallet.</p>
            </div>
          </div>
        </div>

        {/* 4. Support Contacts & WhatsApp Hotline */}
        <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-lg space-y-4">
          <div>
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>Campus Helpline & WhatsApp Support Channels</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Displayed on customer order tracking and profile page for direct campus coordinator support.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Call Support Phone Number</span>
              </label>
              <input
                type="text"
                value={settings.support_phone}
                onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
                placeholder="+91 9999999999"
                className="w-full bg-[#18202F] border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp Helpline Number (Without + or spaces)</span>
              </label>
              <input
                type="text"
                value={settings.support_whatsapp}
                onChange={(e) => setSettings({ ...settings, support_whatsapp: e.target.value })}
                placeholder="919999999999"
                className="w-full bg-[#18202F] border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
              />
            </div>
          </div>
        </div>

        {/* Save Changes Floating Bar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_8px_24px_rgba(255,87,34,0.4)] hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving System Changes...' : 'Save & Deploy System Settings'}</span>
          </button>
        </div>

      </form>

    </div>
  );
}
