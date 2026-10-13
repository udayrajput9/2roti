import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  CheckCircle,
  Bike,
  User,
  Phone,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Send,
  Zap,
  Building,
  ShieldCheck,
  XCircle,
  Power,
  RotateCcw,
  Layers,
  Lock,
  Printer,
  Truck,
  RefreshCw,
  Download,
  Table,
  ExternalLink,
  Volume2,
  Calendar,
  PackageCheck,
  TrendingUp,
  MapPin,
  Flame,
  Check
} from 'lucide-react';
import { useLiveOrders } from '../context/LiveOrderContext';

export default function CampusOperationsControl() {
  const {
    orders,
    connected,
    playAlertChime,
    refreshOrders,
    bulkAcceptZone,
    dispatchZone,
    bulkCancelZone,
    isPaymentsStopped,
    toggleStopPayments
  } = useLiveOrders();

  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [totalIstMinutes, setTotalIstMinutes] = useState(0);
  const [loadingZone, setLoadingZone] = useState('');
  const [loadingKillswitch, setLoadingKillswitch] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [runnerMode, setRunnerMode] = useState('AUTO'); // 'AUTO' | 'MANUAL'
  const [manualRunnerName, setManualRunnerName] = useState('');
  const [manualRunnerPhone, setManualRunnerPhone] = useState('9876543210');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [scopeFilter, setScopeFilter] = useState('TODAY'); // 'TODAY' | 'ALL'

  // Live IST Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(now.getTime() + istOffset);
      const hours = istDate.getUTCHours();
      const minutes = istDate.getUTCMinutes();
      const seconds = istDate.getUTCSeconds();
      setTotalIstMinutes(hours * 60 + minutes);

      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
      const displaySeconds = seconds < 10 ? `0${seconds}` : seconds;
      setCurrentTimeStr(`${displayHours}:${displayMinutes}:${displaySeconds} ${period} IST`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Standard operational time milestones (Daily campus cycle)
  const cutoffMins = 1081;   // 18:01 (6:01 PM IST)
  const acceptMins = 1090;   // 18:10 (6:10 PM IST)
  const dispatchMins = 1170; // 19:30 (7:30 PM IST)
  const handoverMins = 1200; // 20:00 (8:00 PM IST)
  const wrapUpMins = 1260;   // 21:00 (9:00 PM IST)

  // Current Daily Operational Phase
  const currentPhase = useMemo(() => {
    if (totalIstMinutes < cutoffMins) {
      return {
        step: 1,
        title: 'Phase 1: Student Order Intake',
        status: isPaymentsStopped ? 'PAUSED' : 'LIVE',
        badge: isPaymentsStopped ? '🛑 Intake Paused' : '🟢 Orders Live',
        badgeColor: isPaymentsStopped ? 'bg-rose-950 text-rose-300 border-rose-700' : 'bg-emerald-950 text-emerald-300 border-emerald-700',
        desc: 'Campus students are placing dinner meal orders online. Kitchen preparation will begin after 6:01 PM cutoff.',
        target: 'Cutoff at 6:01 PM'
      };
    } else if (totalIstMinutes < acceptMins) {
      return {
        step: 2,
        title: 'Phase 2: Order Cutoff & Kitchen Prep Review',
        status: 'CUTOFF',
        badge: '⏰ Cutoff Reached',
        badgeColor: 'bg-amber-950 text-amber-300 border-amber-700',
        desc: 'New orders closed. Kitchen staff reviews consolidated dish quantities on the Kitchen Tables to start bulk cooking.',
        target: 'Slips & Kitchen Accept at 6:10 PM'
      };
    } else if (totalIstMinutes < dispatchMins) {
      return {
        step: 3,
        title: 'Phase 3: Kitchen Cooking & Order Slips Printing',
        status: 'COOKING',
        badge: '👨‍🍳 Kitchen Cooking',
        badgeColor: 'bg-blue-950 text-blue-300 border-blue-700',
        desc: 'Orders accepted and in production. Packing station stickers meal boxes with zone slips and 4-digit OTPs.',
        target: 'Runner Dispatch at 7:30 PM'
      };
    } else if (totalIstMinutes < wrapUpMins) {
      return {
        step: 4,
        title: 'Phase 4: Campus Runner Dispatch & Gate Transit',
        status: 'DISPATCH',
        badge: '🚀 En Route to Gates',
        badgeColor: 'bg-purple-950 text-purple-300 border-purple-700',
        desc: 'Runners dispatched with insulated bags. Students receive real-time tracking with runner phone and secret code.',
        target: 'Campus Gate Handover at ~8:00 PM'
      };
    } else {
      return {
        step: 5,
        title: 'Phase 5: Gate Deliveries & Daily Mission Wrap-Up',
        status: 'WRAP_UP',
        badge: '🏁 Fulfillment Complete',
        badgeColor: 'bg-teal-950 text-teal-300 border-teal-700',
        desc: 'Campus gate deliveries complete. OTP/QR verified. Daily sales and operational metrics finalized.',
        target: 'Completed for Today'
      };
    }
  }, [totalIstMinutes, isPaymentsStopped]);

  // Helper to check if order was created today in IST
  const isCreatedTodayIst = (dateStr) => {
    if (!dateStr) return true;
    const d = new Date(dateStr);
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istOrder = new Date(d.getTime() + istOffset);
    const istToday = new Date(now.getTime() + istOffset);
    return (
      istOrder.getUTCFullYear() === istToday.getUTCFullYear() &&
      istOrder.getUTCMonth() === istToday.getUTCMonth() &&
      istOrder.getUTCDate() === istToday.getUTCDate()
    );
  };

  // Filtered orders list based on Scope (Today vs All Loaded)
  const scopedOrders = useMemo(() => {
    if (scopeFilter === 'ALL') return orders;
    return orders.filter(o => isCreatedTodayIst(o.created_at));
  }, [orders, scopeFilter]);

  // Comprehensive Zone Statistics for Whole-Day Visibility
  const zoneStats = useMemo(() => {
    const stats = {
      buddha: { total: 0, placed: 0, cooking: 0, inTransit: 0, delivered: 0, cancelled: 0, revenue: 0 },
      kipm: { total: 0, placed: 0, cooking: 0, inTransit: 0, delivered: 0, cancelled: 0, revenue: 0 },
      itm: { total: 0, placed: 0, cooking: 0, inTransit: 0, delivered: 0, cancelled: 0, revenue: 0 },
      all: { total: 0, placed: 0, cooking: 0, inTransit: 0, delivered: 0, cancelled: 0, revenue: 0 }
    };

    scopedOrders.forEach((o) => {
      if (o.is_outlet_order) return;
      const loc = (o.location_name || '').toLowerCase();
      let key = null;
      if (loc.includes('buddha')) key = 'buddha';
      else if (loc.includes('kipm')) key = 'kipm';
      else if (loc.includes('itm')) key = 'itm';

      const orderPrice = parseFloat(o.total_customer_price || 0) + parseFloat(o.delivery_fee || 0);

      // Increment Total Orders
      if (key) stats[key].total++;
      stats.all.total++;

      // Revenue (excluding cancelled)
      if (o.order_status !== 'CANCELLED') {
        if (key) stats[key].revenue += orderPrice;
        stats.all.revenue += orderPrice;
      }

      // Status distribution
      if (o.order_status === 'PLACED') {
        if (key) stats[key].placed++;
        stats.all.placed++;
      } else if (['ACCEPTED', 'PREPARING', 'READY'].includes(o.order_status)) {
        if (key) stats[key].cooking++;
        stats.all.cooking++;
      } else if (o.order_status === 'OUT_FOR_DELIVERY') {
        if (key) stats[key].inTransit++;
        stats.all.inTransit++;
      } else if (o.order_status === 'DELIVERED') {
        if (key) stats[key].delivered++;
        stats.all.delivered++;
      } else if (['CANCELLED', 'REFUNDED'].includes(o.order_status)) {
        if (key) stats[key].cancelled++;
        stats.all.cancelled++;
      }
    });

    return stats;
  }, [scopedOrders]);

  // Orders dispatchable (food ready or accepted to be dispatched)
  const dispatchableCount = (zone) => {
    if (zone === 'ALL') {
      return zoneStats.all.placed + zoneStats.all.cooking;
    }
    const z = zone.toLowerCase();
    return (zoneStats[z]?.placed || 0) + (zoneStats[z]?.cooking || 0);
  };

  // Orders active (placed, cooking, or in transit - cancellable with refund)
  const activeCount = (zone) => {
    if (zone === 'ALL') {
      return zoneStats.all.placed + zoneStats.all.cooking + zoneStats.all.inTransit;
    }
    const z = zone.toLowerCase();
    return (zoneStats[z]?.placed || 0) + (zoneStats[z]?.cooking || 0) + (zoneStats[z]?.inTransit || 0);
  };

  // Manual Refresh
  const handleManualRefresh = async () => {
    try {
      setIsRefreshing(true);
      await refreshOrders();
      setActionSuccessMsg('🔄 Live orders synchronized with server.');
      setTimeout(() => setActionSuccessMsg(''), 3000);
    } catch (e) {
      alert('Error refreshing orders: ' + e.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Emergency Killswitch: Toggle Stop / Resume Payments
  const handleToggleKillswitch = async () => {
    const targetState = !isPaymentsStopped;
    const confirmPrompt = targetState
      ? '⚠️ ARE YOU SURE you want to STOP ALL ORDERS & PAYMENTS?\n\nCustomers will be immediately blocked from paying or creating orders.'
      : '✅ Resume online orders and payments?\n\nCustomers will be allowed to checkout again.';

    if (!window.confirm(confirmPrompt)) return;

    try {
      setLoadingKillswitch(true);
      const res = await toggleStopPayments(!isPaymentsStopped);
      setActionSuccessMsg(
        res.stopped
          ? '🛑 EMERGENCY STOP ACTIVE: Online payments & orders paused across website and app.'
          : '🟢 RESUMED: Online ordering and payments are now LIVE!'
      );
      setTimeout(() => setActionSuccessMsg(''), 5000);
    } catch (e) {
      alert(e.message || 'Error updating killswitch state');
    } finally {
      setLoadingKillswitch(false);
    }
  };

  // Handle Zone Bulk Accept (Scheduled 6:10 PM IST)
  const handleZoneAccept = async (zone) => {
    const count = zone === 'ALL' ? zoneStats.all.placed : (zoneStats[zone.toLowerCase()]?.placed || 0);
    if (count === 0) {
      alert(`No pending PLACED orders to accept for ${zone}.`);
      return;
    }

    if (totalIstMinutes < acceptMins) {
      const proceed = window.confirm(
        `⏰ Scheduled Kitchen Accept time is 6:10 PM IST (Current: ${currentTimeStr}).\n\nDo you want to proceed and accept ${count} orders for ${zone} now?`
      );
      if (!proceed) return;
    }

    try {
      setLoadingZone(`accept_${zone}`);
      const res = await bulkAcceptZone(zone);
      setActionSuccessMsg(`✅ Successfully accepted ${res.count || 0} orders for ${zone}! Status moved to ACCEPTED.`);
      setTimeout(() => setActionSuccessMsg(''), 5000);
    } catch (e) {
      alert(e.message || 'Error accepting orders');
    } finally {
      setLoadingZone('');
    }
  };

  // Handle Zone Bulk Cancel & Automated Refund (Razorpay / Wallet)
  const handleZoneCancel = async (zone) => {
    const targetCount = activeCount(zone);
    if (targetCount === 0) {
      alert(`No active orders to cancel for ${zone}.`);
      return;
    }

    const proceed = window.confirm(
      `⚠️ CANCEL & REFUND CONFIRMATION:\n\nAre you sure you want to CANCEL all ${targetCount} active orders for ${zone}?\n\nThis will AUTOMATICALLY trigger Razorpay refunds for online payments and credit wallets immediately!`
    );
    if (!proceed) return;

    const reason = window.prompt('Enter cancellation reason (sent to customer & Razorpay notes):', 'Kitchen operations cancelled by admin');
    if (reason === null) return;

    try {
      setLoadingZone(`cancel_${zone}`);
      const res = await bulkCancelZone(zone, reason.trim() || 'Kitchen cancellation');
      setActionSuccessMsg(
        `❌ Cancelled ${res.count || 0} orders for ${zone}! Total Refunds of ₹${parseFloat(res.total_refunded || 0).toFixed(2)} automatically initiated via Razorpay/Wallet!`
      );
      setTimeout(() => setActionSuccessMsg(''), 7000);
    } catch (e) {
      alert(e.message || 'Error cancelling orders');
    } finally {
      setLoadingZone('');
    }
  };

  // Handle Zone Dispatch & Runner Assignment (Scheduled 7:30 PM IST)
  const handleZoneDispatch = async (zone) => {
    const toDispatch = dispatchableCount(zone);
    if (toDispatch === 0) {
      alert(`No pending/cooking orders to dispatch for ${zone}. (Active orders may already be out for delivery).`);
      return;
    }

    if (totalIstMinutes < dispatchMins) {
      const proceed = window.confirm(
        `⏰ Scheduled Runner Dispatch time is 7:30 PM IST (Current: ${currentTimeStr}).\n\nDo you want to dispatch ${toDispatch} orders for ${zone} now?`
      );
      if (!proceed) return;
    }

    if (runnerMode === 'MANUAL') {
      if (!manualRunnerName.trim()) {
        alert('Please enter a Runner Name for manual dispatch.');
        return;
      }
    }

    try {
      setLoadingZone(`dispatch_${zone}`);
      const payload = {
        zone,
        runner_name: runnerMode === 'MANUAL' ? manualRunnerName.trim() : null,
        runner_phone: runnerMode === 'MANUAL' ? manualRunnerPhone.trim() : '9876543210',
        is_auto: runnerMode === 'AUTO'
      };

      const res = await dispatchZone(payload);
      setActionSuccessMsg(
        `🚀 Dispatched ${res.count || 0} orders for ${zone}! Runner: ${res.runner_name || 'Assigned'}. Customer status updated to OUT_FOR_DELIVERY.`
      );
      setTimeout(() => setActionSuccessMsg(''), 5000);
    } catch (e) {
      alert(e.message || 'Error dispatching orders');
    } finally {
      setLoadingZone('');
    }
  };

  const apiBase = import.meta.env.VITE_API_URL || '';

  return (
    <div className="bg-[#101726] border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-6">

      {/* TOP HEADER: TITLE, LIVE CLOCK, CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FF5722] to-amber-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                Campus Operations Command Center
              </h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                connected
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/60'
                  : 'bg-amber-950/80 text-amber-400 border-amber-700/60'
              }`}>
                {connected ? '● Live WebSocket' : '○ Polling Fallback'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Direct master control for Kitchen Order Acceptance, Daily Zone Slips, Cancellations & Runner Dispatch
            </p>
          </div>
        </div>

        {/* Live IST Clock, Audio Test & Refresh Bar */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {/* Date Scope Filter Toggle */}
          <div className="flex items-center p-0.5 bg-slate-900 rounded-xl border border-slate-800">
            <button
              onClick={() => setScopeFilter('TODAY')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                scopeFilter === 'TODAY'
                  ? 'bg-[#FF5722] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Only show orders placed today in IST"
            >
              Today
            </button>
            <button
              onClick={() => setScopeFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                scopeFilter === 'ALL'
                  ? 'bg-[#FF5722] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Show all recent orders in memory"
            >
              All Recent
            </button>
          </div>

          {/* Audio Chime Test Button */}
          <button
            onClick={() => {
              playAlertChime();
              setActionSuccessMsg('🔔 Sound chime tested successfully.');
              setTimeout(() => setActionSuccessMsg(''), 2000);
            }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white transition-all active:scale-95"
            title="Test kitchen loudspeaker order bell"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>

          {/* Manual Refresh */}
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white transition-all active:scale-95"
            title="Refresh live orders"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#FF5722]' : ''}`} />
          </button>

          {/* Live Clock Badge */}
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center gap-2 text-xs font-mono font-bold text-slate-200 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-[#FF5722] animate-spin" style={{ animationDuration: '6s' }} />
            <span>{currentTimeStr || 'Loading IST...'}</span>
          </div>
        </div>
      </div>

      {/* OPERATIONS PIPELINE LIFECYCLE TRACKER (WHOLE DAY CYCLE) */}
      <div className="bg-[#131D31] border border-blue-900/40 rounded-2xl p-4 space-y-3 shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Daily Operations Lifecycle
                </span>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase border ${currentPhase.badgeColor}`}>
                  {currentPhase.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Current: <strong className="text-white">{currentPhase.title}</strong> — {currentPhase.desc}
              </p>
            </div>
          </div>

          <div className="text-right self-stretch md:self-auto flex items-center md:flex-col justify-between md:justify-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Next Target</span>
            <span className="text-xs font-mono font-black text-amber-300">{currentPhase.target}</span>
          </div>
        </div>

        {/* 5-Step Visual Timeline Progress */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 border-t border-slate-800/80">
          <div className={`p-2 rounded-xl border text-[10px] font-mono flex items-center gap-1.5 ${
            totalIstMinutes < cutoffMins
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700 font-bold ring-1 ring-emerald-500/30'
              : 'bg-slate-900/60 text-slate-400 border-slate-800'
          }`}>
            <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[9px] font-black">1</span>
            <span>Intake: Live</span>
          </div>

          <div className={`p-2 rounded-xl border text-[10px] font-mono flex items-center gap-1.5 ${
            totalIstMinutes >= cutoffMins && totalIstMinutes < acceptMins
              ? 'bg-amber-950/60 text-amber-300 border-amber-700 font-bold ring-1 ring-amber-500/30'
              : 'bg-slate-900/60 text-slate-400 border-slate-800'
          }`}>
            <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[9px] font-black">2</span>
            <span>Cutoff: 6:01 PM</span>
          </div>

          <div className={`p-2 rounded-xl border text-[10px] font-mono flex items-center gap-1.5 ${
            totalIstMinutes >= acceptMins && totalIstMinutes < dispatchMins
              ? 'bg-blue-950/60 text-blue-300 border-blue-700 font-bold ring-1 ring-blue-500/30'
              : 'bg-slate-900/60 text-slate-400 border-slate-800'
          }`}>
            <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[9px] font-black">3</span>
            <span>Slips/Cook: 6:10 PM</span>
          </div>

          <div className={`p-2 rounded-xl border text-[10px] font-mono flex items-center gap-1.5 ${
            totalIstMinutes >= dispatchMins && totalIstMinutes < wrapUpMins
              ? 'bg-purple-950/60 text-purple-300 border-purple-700 font-bold ring-1 ring-purple-500/30'
              : 'bg-slate-900/60 text-slate-400 border-slate-800'
          }`}>
            <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[9px] font-black">4</span>
            <span>Dispatch: 7:30 PM</span>
          </div>

          <div className={`p-2 rounded-xl border text-[10px] font-mono flex items-center gap-1.5 col-span-2 sm:col-span-1 ${
            totalIstMinutes >= wrapUpMins
              ? 'bg-teal-950/60 text-teal-300 border-teal-700 font-bold ring-1 ring-teal-500/30'
              : 'bg-slate-900/60 text-slate-400 border-slate-800'
          }`}>
            <span className="w-4 h-4 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-[9px] font-black">5</span>
            <span>Complete: 9:00 PM</span>
          </div>
        </div>
      </div>

      {/* MASTER ORDERING KILLSWITCH BANNER */}
      <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
        isPaymentsStopped
          ? 'bg-rose-950/80 border-rose-500/70 shadow-lg shadow-rose-950/50'
          : 'bg-slate-900/80 border-slate-700/70'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isPaymentsStopped
              ? 'bg-rose-500 text-white animate-pulse'
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
          }`}>
            <Power className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                {isPaymentsStopped
                  ? '🛑 EMERGENCY HALT ACTIVE: Orders & Payments Stopped'
                  : '🟢 Online Ordering & Payment Gateways are LIVE'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isPaymentsStopped
                  ? 'bg-rose-500 text-white'
                  : 'bg-emerald-950 text-emerald-400 border border-emerald-700'
              }`}>
                {isPaymentsStopped ? 'HALTED' : 'ACCEPTING'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {isPaymentsStopped
                ? 'All checkout payments & new order placements are blocked across website and app.'
                : 'Students can place orders and make Razorpay online payments during kitchen hours.'}
            </p>
          </div>
        </div>

        {/* Killswitch Action Button */}
        <button
          onClick={handleToggleKillswitch}
          disabled={loadingKillswitch}
          className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center gap-2 shrink-0 ${
            isPaymentsStopped
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/40'
              : 'bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 text-white shadow-rose-900/50'
          }`}
        >
          <Power className="w-4 h-4" />
          <span>{isPaymentsStopped ? '🟢 RESUME Orders & Payments' : '🔴 STOP All Orders & Payments'}</span>
        </button>
      </div>

      {/* Success notification banner */}
      {actionSuccessMsg && (
        <div className="bg-emerald-950/90 border border-emerald-500/60 p-3.5 rounded-2xl text-emerald-200 text-xs font-bold flex items-center justify-between animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg('')} className="text-emerald-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* FULL-SPECTRUM METRICS BAR (ZERO BLINDSPOTS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1: Total Orders */}
        <div className="bg-[#131D31]/90 border border-slate-800 p-3.5 rounded-2xl shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">
            {scopeFilter === 'TODAY' ? "Today's Orders" : 'All Orders'}
          </span>
          <div className="text-xl font-black text-white mt-1">{zoneStats.all.total}</div>
          <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">
            ₹{zoneStats.all.revenue.toFixed(0)} GMV
          </span>
        </div>

        {/* Metric 2: Placed (Pending Accept) */}
        <div className="bg-[#131D31]/90 border border-amber-900/40 p-3.5 rounded-2xl shadow-sm">
          <span className="text-[10px] text-amber-400/90 uppercase tracking-wider font-extrabold block">
            1. Pending Placed
          </span>
          <div className="text-xl font-black text-amber-300 mt-1">{zoneStats.all.placed}</div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Awaiting accept</span>
        </div>

        {/* Metric 3: Cooking / Active */}
        <div className="bg-[#131D31]/90 border border-blue-900/40 p-3.5 rounded-2xl shadow-sm">
          <span className="text-[10px] text-blue-400/90 uppercase tracking-wider font-extrabold block">
            2. Kitchen Prep
          </span>
          <div className="text-xl font-black text-blue-300 mt-1">{zoneStats.all.cooking}</div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Cooking & packing</span>
        </div>

        {/* Metric 4: In Transit / With Runner */}
        <div className="bg-[#131D31]/90 border border-purple-900/40 p-3.5 rounded-2xl shadow-sm">
          <span className="text-[10px] text-purple-400/90 uppercase tracking-wider font-extrabold block">
            3. In Transit
          </span>
          <div className="text-xl font-black text-purple-300 mt-1">{zoneStats.all.inTransit}</div>
          <span className="text-[10px] text-slate-400 block mt-0.5">With runners</span>
        </div>

        {/* Metric 5: Delivered */}
        <div className="bg-[#131D31]/90 border border-emerald-900/40 p-3.5 rounded-2xl shadow-sm">
          <span className="text-[10px] text-emerald-400/90 uppercase tracking-wider font-extrabold block">
            4. Delivered
          </span>
          <div className="text-xl font-black text-emerald-300 mt-1">{zoneStats.all.delivered}</div>
          <span className="text-[10px] text-emerald-400/80 block mt-0.5">Gate verified</span>
        </div>

        {/* Metric 6: Cancelled & Refunded */}
        <div className="bg-[#131D31]/90 border border-rose-900/40 p-3.5 rounded-2xl shadow-sm">
          <span className="text-[10px] text-rose-400/90 uppercase tracking-wider font-extrabold block">
            Cancelled
          </span>
          <div className="text-xl font-black text-rose-300 mt-1">{zoneStats.all.cancelled}</div>
          <span className="text-[10px] text-rose-400/80 block mt-0.5">Auto-refunded</span>
        </div>
      </div>

      {/* SECTION 1: DAILY CAMPUS ORDER SLIPS & TABLES QUICK ACCESS */}
      <div className="bg-[#131D31]/80 border border-blue-800/60 p-4 sm:p-5 rounded-2xl shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Daily Campus Order Slips & Kitchen Sheets
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`${apiBase}/api/orders/daily-zone-pdf?zone=ALL`}
              target="_blank"
              rel="noreferrer"
              className="py-1 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all"
              title="Combined delivery receipts for all campuses"
            >
              <Download className="w-3 h-3" />
              <span>All Campuses Combined Slips</span>
            </a>
            <a
              href={`${apiBase}/api/orders/daily-zone-table?zone=ALL`}
              target="_blank"
              rel="noreferrer"
              className="py-1 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 text-[11px] font-bold flex items-center gap-1 border border-slate-700 transition-all"
              title="Master dish preparation summary for chefs"
            >
              <Table className="w-3 h-3" />
              <span>All Campuses Master Table</span>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Buddha Zone Slips */}
          <div className="bg-slate-900/80 border border-amber-600/30 rounded-xl p-3 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300">Buddha PG College</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-amber-400 font-black">
                {zoneStats.buddha.total} orders
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between py-0.5">
              <span>Placed: <strong className="text-amber-400">{zoneStats.buddha.placed}</strong></span>
              <span>Cooking: <strong className="text-blue-400">{zoneStats.buddha.cooking}</strong></span>
              <span>Transit: <strong className="text-purple-400">{zoneStats.buddha.inTransit}</strong></span>
              <span>Done: <strong className="text-emerald-400">{zoneStats.buddha.delivered}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <a
                href={`${apiBase}/api/orders/daily-zone-pdf?zone=Buddha`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-1.5 px-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold text-center flex items-center justify-center gap-1 shadow-sm"
              >
                <Download className="w-3 h-3" />
                <span>Slips PDF</span>
              </a>
              <a
                href={`${apiBase}/api/orders/daily-zone-table?zone=Buddha`}
                target="_blank"
                rel="noreferrer"
                className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold text-center flex items-center justify-center gap-1 border border-slate-700"
                title="Kitchen Prep Sheet"
              >
                <Table className="w-3 h-3" />
                <span>Table</span>
              </a>
            </div>
          </div>

          {/* KIPM Zone Slips */}
          <div className="bg-slate-900/80 border border-indigo-600/30 rounded-xl p-3 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300">KIPM Engineering</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-indigo-400 font-black">
                {zoneStats.kipm.total} orders
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between py-0.5">
              <span>Placed: <strong className="text-amber-400">{zoneStats.kipm.placed}</strong></span>
              <span>Cooking: <strong className="text-blue-400">{zoneStats.kipm.cooking}</strong></span>
              <span>Transit: <strong className="text-purple-400">{zoneStats.kipm.inTransit}</strong></span>
              <span>Done: <strong className="text-emerald-400">{zoneStats.kipm.delivered}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <a
                href={`${apiBase}/api/orders/daily-zone-pdf?zone=KIPM`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-1.5 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold text-center flex items-center justify-center gap-1 shadow-sm"
              >
                <Download className="w-3 h-3" />
                <span>Slips PDF</span>
              </a>
              <a
                href={`${apiBase}/api/orders/daily-zone-table?zone=KIPM`}
                target="_blank"
                rel="noreferrer"
                className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-bold text-center flex items-center justify-center gap-1 border border-slate-700"
                title="Kitchen Prep Sheet"
              >
                <Table className="w-3 h-3" />
                <span>Table</span>
              </a>
            </div>
          </div>

          {/* ITM Zone Slips */}
          <div className="bg-slate-900/80 border border-purple-600/30 rounded-xl p-3 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300">ITM Gorakhpur</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-purple-400 font-black">
                {zoneStats.itm.total} orders
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between py-0.5">
              <span>Placed: <strong className="text-amber-400">{zoneStats.itm.placed}</strong></span>
              <span>Cooking: <strong className="text-blue-400">{zoneStats.itm.cooking}</strong></span>
              <span>Transit: <strong className="text-purple-400">{zoneStats.itm.inTransit}</strong></span>
              <span>Done: <strong className="text-emerald-400">{zoneStats.itm.delivered}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <a
                href={`${apiBase}/api/orders/daily-zone-pdf?zone=ITM`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-1.5 px-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold text-center flex items-center justify-center gap-1 shadow-sm"
              >
                <Download className="w-3 h-3" />
                <span>Slips PDF</span>
              </a>
              <a
                href={`${apiBase}/api/orders/daily-zone-table?zone=ITM`}
                target="_blank"
                rel="noreferrer"
                className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 text-[11px] font-bold text-center flex items-center justify-center gap-1 border border-slate-700"
                title="Kitchen Prep Sheet"
              >
                <Table className="w-3 h-3" />
                <span>Table</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: KITCHEN ORDER ACCEPTANCE STATION */}
      <div className="space-y-3 bg-[#131D31]/60 border border-slate-800/80 p-4 sm:p-5 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>1. Campus Kitchen Order Acceptance</span>
            </h3>
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                totalIstMinutes >= acceptMins
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                  : 'bg-amber-950/80 text-amber-300 border-amber-700'
              }`}
            >
              {totalIstMinutes >= acceptMins
                ? '🟢 Active (6:10 PM IST)'
                : '⏰ Standard Acceptance at 6:10 PM IST'}
            </span>
          </div>

          <span className="text-[11px] text-slate-400">
            Pending Placed: <strong className="text-white">{zoneStats.all.placed}</strong> orders
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Clicking accept moves orders from <strong>PLACED</strong> to <strong>ACCEPTED</strong> and notifies chefs to begin cooking.
        </p>

        {/* 3 Zone Acceptance Buttons + Accept All */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
          {/* Buddha Button */}
          <button
            onClick={() => handleZoneAccept('Buddha')}
            disabled={loadingZone === 'accept_Buddha' || zoneStats.buddha.placed === 0}
            className="p-3 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-between disabled:opacity-40"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Accept Buddha</span>
            </div>
            <span className="px-2 py-0.5 rounded-xl bg-black/30 text-[10px] font-black">
              {zoneStats.buddha.placed} Placed
            </span>
          </button>

          {/* KIPM Button */}
          <button
            onClick={() => handleZoneAccept('KIPM')}
            disabled={loadingZone === 'accept_KIPM' || zoneStats.kipm.placed === 0}
            className="p-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-between disabled:opacity-40"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Accept KIPM</span>
            </div>
            <span className="px-2 py-0.5 rounded-xl bg-black/30 text-[10px] font-black">
              {zoneStats.kipm.placed} Placed
            </span>
          </button>

          {/* ITM Button */}
          <button
            onClick={() => handleZoneAccept('ITM')}
            disabled={loadingZone === 'accept_ITM' || zoneStats.itm.placed === 0}
            className="p-3 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-between disabled:opacity-40"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Accept ITM</span>
            </div>
            <span className="px-2 py-0.5 rounded-xl bg-black/30 text-[10px] font-black">
              {zoneStats.itm.placed} Placed
            </span>
          </button>

          {/* Accept All Button */}
          <button
            onClick={() => handleZoneAccept('ALL')}
            disabled={loadingZone === 'accept_ALL' || zoneStats.all.placed === 0}
            className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-between disabled:opacity-40"
          >
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Accept All Zones</span>
            </div>
            <span className="px-2 py-0.5 rounded-xl bg-slate-900 text-[10px] font-black text-slate-300">
              {zoneStats.all.placed}
            </span>
          </button>
        </div>
      </div>

      {/* SECTION 3: CANCEL & AUTOMATED RAZORPAY REFUND STATION */}
      <div className="space-y-3 bg-[#131D31]/60 border border-rose-900/40 p-4 sm:p-5 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>2. Campus Order Cancellation & Automated Refund Station</span>
            </h3>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-rose-950 text-rose-300 border border-rose-800">
              ⚡ Razorpay & Wallet Auto-Refund
            </span>
          </div>

          <span className="text-[11px] text-slate-400">
            Active Cancellable Orders: <strong className="text-white">{activeCount('ALL')}</strong>
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Cancels active orders for the zone and <strong>instantly triggers online refunds via Razorpay API</strong> (or credits wallet). Customer status immediately displays <span className="text-rose-400 font-bold">CANCELLED & REFUNDED</span>.
        </p>

        {/* 3 Zone Cancellation & Refund Buttons + Cancel All */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
          {/* Cancel Buddha Button */}
          <button
            onClick={() => handleZoneCancel('Buddha')}
            disabled={loadingZone === 'cancel_Buddha' || activeCount('Buddha') === 0}
            className="p-3 rounded-2xl bg-gradient-to-r from-rose-900 to-rose-700 hover:from-rose-800 hover:to-rose-600 border border-rose-700/60 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-between disabled:opacity-40"
          >
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-300" />
              <span>Cancel Buddha (Refund)</span>
            </div>
            <span className="px-2 py-0.5 rounded-xl bg-black/40 text-[10px] font-black text-rose-200">
              {activeCount('Buddha')} Active
            </span>
          </button>

          {/* Cancel KIPM Button */}
          <button
            onClick={() => handleZoneCancel('KIPM')}
            disabled={loadingZone === 'cancel_KIPM' || activeCount('KIPM') === 0}
            className="p-3 rounded-2xl bg-gradient-to-r from-red-900 to-red-700 hover:from-red-800 hover:to-red-600 border border-red-700/60 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-between disabled:opacity-40"
          >
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-300" />
              <span>Cancel KIPM (Refund)</span>
            </div>
            <span className="px-2 py-0.5 rounded-xl bg-black/40 text-[10px] font-black text-red-200">
              {activeCount('KIPM')} Active
            </span>
          </button>

          {/* Cancel ITM Button */}
          <button
            onClick={() => handleZoneCancel('ITM')}
            disabled={loadingZone === 'cancel_ITM' || activeCount('ITM') === 0}
            className="p-3 rounded-2xl bg-gradient-to-r from-pink-950 to-pink-800 hover:from-pink-900 hover:to-pink-700 border border-pink-700/60 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-between disabled:opacity-40"
          >
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-pink-300" />
              <span>Cancel ITM (Refund)</span>
            </div>
            <span className="px-2 py-0.5 rounded-xl bg-black/40 text-[10px] font-black text-pink-200">
              {activeCount('ITM')} Active
            </span>
          </button>

          {/* Cancel All Button */}
          <button
            onClick={() => handleZoneCancel('ALL')}
            disabled={loadingZone === 'cancel_ALL' || activeCount('ALL') === 0}
            className="p-3 rounded-2xl bg-gradient-to-r from-stone-900 to-rose-950 hover:from-stone-800 hover:to-rose-900 border border-rose-800 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-between disabled:opacity-40"
          >
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Cancel All Zones</span>
            </div>
            <span className="px-2 py-0.5 rounded-xl bg-black/50 text-[10px] font-black text-rose-300">
              {activeCount('ALL')} Active
            </span>
          </button>
        </div>
      </div>

      {/* SECTION 4: RUNNER DISPATCH STATION (7:30 PM IST) */}
      <div className="space-y-4 bg-[#131D31]/60 border border-slate-800/80 p-4 sm:p-5 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>3. Campus Runner Dispatch Station</span>
            </h3>
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                totalIstMinutes >= dispatchMins
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                  : 'bg-amber-950/80 text-amber-300 border-amber-700'
              }`}
            >
              {totalIstMinutes >= dispatchMins
                ? '🟢 Active (7:30 PM IST)'
                : '⏰ Standard Dispatch at 7:30 PM IST'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>Ready to Dispatch: <strong className="text-white">{dispatchableCount('ALL')}</strong></span>
            <span>•</span>
            <span className="text-purple-300">Currently in Transit: <strong className="text-white">{zoneStats.all.inTransit}</strong></span>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Clicking dispatch updates status to <strong>OUT_FOR_DELIVERY</strong> and attaches the runner's contact info. Customer tracking immediately turns blue with a "Call Runner" button and Secret OTP Code.
        </p>

        {/* Runner Mode Selector (AUTO vs MANUAL) */}
        <div className="bg-[#0D1424] p-3 rounded-2xl border border-slate-800/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300">Runner Mode:</span>
            <div className="flex items-center p-0.5 bg-slate-900 rounded-xl border border-slate-800">
              <button
                onClick={() => setRunnerMode('AUTO')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  runnerMode === 'AUTO'
                    ? 'bg-[#FF5722] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ⚡ Auto Runner
              </button>
              <button
                onClick={() => setRunnerMode('MANUAL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  runnerMode === 'MANUAL'
                    ? 'bg-[#FF5722] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ✏️ Manual Runner Name
              </button>
            </div>
          </div>

          {runnerMode === 'AUTO' ? (
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
              <span className="text-amber-400 font-bold">Auto Pre-sets:</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Buddha: Campus Runner (Buddha)</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">KIPM: Campus Runner (KIPM)</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">ITM: Campus Runner (ITM)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <div className="relative flex-1 md:w-48">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Runner Name (e.g. Ramesh)"
                  value={manualRunnerName}
                  onChange={(e) => setManualRunnerName(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#FF5722]"
                />
              </div>
              <div className="relative flex-1 md:w-36">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Phone"
                  value={manualRunnerPhone}
                  onChange={(e) => setManualRunnerPhone(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#FF5722]"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3 Zone Dispatch Buttons + Dispatch All */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
          {/* Dispatch Buddha */}
          <button
            onClick={() => handleZoneDispatch('Buddha')}
            disabled={loadingZone === 'dispatch_Buddha' || dispatchableCount('Buddha') === 0}
            className="p-3 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#E64A19] hover:from-[#F4511E] hover:to-[#D84315] text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center justify-between disabled:opacity-40"
          >
            <div className="flex items-center gap-2">
              <Bike className="w-4 h-4" />
              <span>Dispatch Buddha</span>
            </div>
            <span className="px-2 py-0.5 rounded-xl bg-black/30 text-[10px] font-black">
              {dispatchableCount('Buddha')} Ready
            </span>
          </button>

          {/* Dispatch KIPM */}
          <button
            onClick={() => handleZoneDispatch('KIPM')}
            disabled={loadingZone === 'dispatch_KIPM' || dispatchableCount('KIPM') === 0}
            className="p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-between disabled:opacity-40"
          >
            <div className="flex items-center gap-2">
              <Bike className="w-4 h-4" />
              <span>Dispatch KIPM</span>
            </div>
            <span className="px-2 py-0.5 rounded-xl bg-black/30 text-[10px] font-black">
              {dispatchableCount('KIPM')} Ready
            </span>
          </button>

          {/* Dispatch ITM */}
          <button
            onClick={() => handleZoneDispatch('ITM')}
            disabled={loadingZone === 'dispatch_ITM' || dispatchableCount('ITM') === 0}
            className="p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition-all active:scale-95 flex items-center justify-between disabled:opacity-40"
          >
            <div className="flex items-center gap-2">
              <Bike className="w-4 h-4" />
              <span>Dispatch ITM</span>
            </div>
            <span className="px-2 py-0.5 rounded-xl bg-black/30 text-[10px] font-black">
              {dispatchableCount('ITM')} Ready
            </span>
          </button>

          {/* Dispatch All Campuses */}
          <button
            onClick={() => handleZoneDispatch('ALL')}
            disabled={loadingZone === 'dispatch_ALL' || dispatchableCount('ALL') === 0}
            className="p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-between disabled:opacity-40"
          >
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              <span>Dispatch All</span>
            </div>
            <span className="px-2 py-0.5 rounded-xl bg-black/30 text-[10px] font-black">
              {dispatchableCount('ALL')} Ready
            </span>
          </button>
        </div>
      </div>

      {/* SECTION 5: CAMPUS GATE HANDOVER & DAILY COMPLETION TRACKER */}
      <div className="bg-[#131D31]/40 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>Campus Gate Handover & Daily Mission Fulfillment</span>
              {zoneStats.all.total > 0 && zoneStats.all.delivered === (zoneStats.all.total - zoneStats.all.cancelled) && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-950 text-emerald-300 border border-emerald-700">
                  🎉 100% Fulfilled
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Runners scan student QR code or verify secret OTP at campus gates to mark orders delivered.
            </p>
          </div>
        </div>

        {/* Progress Bar & Rate */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-right">
            <span className="text-xs font-mono font-black text-white">
              {zoneStats.all.delivered} / {Math.max(0, zoneStats.all.total - zoneStats.all.cancelled)}
            </span>
            <span className="text-[10px] text-slate-400 block font-bold">
              {zoneStats.all.total > 0
                ? `${Math.round((zoneStats.all.delivered / Math.max(1, zoneStats.all.total - zoneStats.all.cancelled)) * 100)}% Fulfilled`
                : '0% Fulfilled'}
            </span>
          </div>
          <div className="w-24 sm:w-32 bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
              style={{
                width: `${zoneStats.all.total > 0
                  ? Math.min(100, Math.round((zoneStats.all.delivered / Math.max(1, zoneStats.all.total - zoneStats.all.cancelled)) * 100))
                  : 0}%`
              }}
            />
          </div>
        </div>
      </div>

    </div>
  );
}
