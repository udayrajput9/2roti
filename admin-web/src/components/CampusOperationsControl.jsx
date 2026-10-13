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
  RotateCcw
} from 'lucide-react';
import { useLiveOrders } from '../context/LiveOrderContext';

export default function CampusOperationsControl() {
  const {
    orders,
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
  const [runnerMode, setRunnerMode] = useState('AUTO'); // 'AUTO' | 'MANUAL'
  const [manualRunnerName, setManualRunnerName] = useState('');
  const [manualRunnerPhone, setManualRunnerPhone] = useState('9876543210');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Track IST time every second
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

  // Fetch active batch configuration to dynamically sync trigger milestones (6:01 Cutoff, 6:10 Slips, 7:30 QR)
  const [activeBatch, setActiveBatch] = useState(null);

  useEffect(() => {
    fetch('/api/batches')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.active_batches && d.active_batches.length > 0) {
          const cur = d.current_batch || d.active_batches[0];
          setActiveBatch(cur);
        }
      })
      .catch(() => {});
  }, []);

  // Time milestones (dynamically calculated from batch trigger events)
  const acceptMins = activeBatch?.slips_ready_time
    ? (parseInt(activeBatch.slips_ready_time.split(':')[0], 10) * 60 + parseInt(activeBatch.slips_ready_time.split(':')[1], 10))
    : 1090; // Default 18:10 (6:10 PM IST)

  const dispatchMins = activeBatch?.dispatch_time
    ? (parseInt(activeBatch.dispatch_time.split(':')[0], 10) * 60 + parseInt(activeBatch.dispatch_time.split(':')[1], 10))
    : 1170; // Default 19:30 (7:30 PM IST)

  const isAcceptActive = totalIstMinutes >= acceptMins;
  const isDispatchActive = totalIstMinutes >= dispatchMins;

  // Calculate zone stats
  const zoneStats = useMemo(() => {
    const stats = {
      buddha: { placed: 0, active: 0, delivered: 0 },
      kipm: { placed: 0, active: 0, delivered: 0 },
      itm: { placed: 0, active: 0, delivered: 0 },
      all: { placed: 0, active: 0, delivered: 0 }
    };

    orders.forEach((o) => {
      if (o.is_outlet_order) return;
      const loc = (o.location_name || '').toLowerCase();
      let key = null;
      if (loc.includes('buddha')) key = 'buddha';
      else if (loc.includes('kipm')) key = 'kipm';
      else if (loc.includes('itm')) key = 'itm';

      if (o.order_status === 'PLACED') {
        if (key) stats[key].placed++;
        stats.all.placed++;
      }
      if (['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.order_status)) {
        if (key) stats[key].active++;
        stats.all.active++;
      }
      if (o.order_status === 'DELIVERED') {
        if (key) stats[key].delivered++;
        stats.all.delivered++;
      }
    });

    return stats;
  }, [orders]);

  // Emergency Killswitch: Toggle Stop / Resume Payments
  const handleToggleKillswitch = async () => {
    const targetState = !isPaymentsStopped;
    const confirmPrompt = targetState
      ? '⚠️ ARE YOU SURE you want to STOP ALL ORDERS & PAYMENTS?\n\nCustomers will be immediately blocked from paying or creating orders.'
      : '✅ Resume online orders and payments?\n\nCustomers will be allowed to checkout again.';
    
    if (!window.confirm(confirmPrompt)) return;

    try {
      setLoadingKillswitch(true);
      const res = await toggleStopPayments(targetState);
      setActionSuccessMsg(res.message);
      setTimeout(() => setActionSuccessMsg(''), 6000);
    } catch (e) {
      alert(e.message || 'Error updating emergency killswitch');
    } finally {
      setLoadingKillswitch(false);
    }
  };

  // Handle Zone Bulk Accept (Active at 6:10 PM IST)
  const handleZoneAccept = async (zone) => {
    if (!isAcceptActive) {
      const proceed = window.confirm(
        `⏰ Scheduled Accept time is 6:10 PM IST (Current: ${currentTimeStr}).\n\nDo you want to proceed and accept ${zone} orders now for testing?`
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
    const targetCount = zone === 'ALL' ? zoneStats.all.active : (zoneStats[zone.toLowerCase()]?.active || 0);
    if (targetCount === 0) {
      alert(`No active orders to cancel for ${zone}.`);
      return;
    }

    const proceed = window.confirm(
      `⚠️ CANCEL & REFUND CONFIRMATION:\n\nAre you sure you want to CANCEL all ${targetCount} active orders for ${zone}?\n\nThis will AUTOMATICALLY trigger Razorpay refunds for online payments and credit wallets immediately!`
    );
    if (!proceed) return;

    const reason = window.prompt('Enter cancellation reason (sent to customer & Razorpay notes):', 'Kitchen operations cancelled by admin');
    if (reason === null) return; // User pressed cancel on prompt

    try {
      setLoadingZone(`cancel_${zone}`);
      const res = await bulkCancelZone(zone, reason.trim() || 'Kitchen batch cancellation');
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

  // Handle Zone Dispatch & Runner Assignment (Active at 7:30 PM IST)
  const handleZoneDispatch = async (zone) => {
    if (!isDispatchActive) {
      const proceed = window.confirm(
        `⏰ Scheduled Runner Dispatch time is 7:30 PM IST (Current: ${currentTimeStr}).\n\nDo you want to dispatch ${zone} orders now for testing?`
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

  return (
    <div className="bg-[#101726] border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-6">
      
      {/* Top Header Bar with Clock and Live Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF5722] to-amber-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-wide flex items-center gap-2">
              Campus Operations Command Center
            </h2>
            <p className="text-xs text-slate-400">
              Automated 6:10 PM order acceptance, Razorpay cancellations & 7:30 PM runner dispatch pipeline
            </p>
          </div>
        </div>

        {/* Live IST Clock Badge */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="px-3.5 py-1.5 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center gap-2 text-xs font-mono font-bold text-slate-200 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-[#FF5722] animate-spin" style={{ animationDuration: '6s' }} />
            <span>{currentTimeStr || 'Loading IST...'}</span>
          </div>
        </div>
      </div>

      {/* EMERGENCY KILLSWITCH BANNER (Stop All Orders & Payments) */}
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

      {/* SECTION 1: 6:10 PM ACCEPTANCE STATION */}
      <div className="space-y-3 bg-[#131D31]/60 border border-slate-800/80 p-4 sm:p-5 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>1. Campus Kitchen Order Acceptance</span>
            </h3>
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                isAcceptActive
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                  : 'bg-amber-950/80 text-amber-300 border-amber-700'
              }`}
            >
              {isAcceptActive ? '🟢 Active (6:10 PM)' : '⏰ Unlocks at 6:10 PM IST'}
            </span>
          </div>

          <span className="text-[11px] text-slate-400">
            Pending Placed: <strong className="text-white">{zoneStats.all.placed}</strong> orders
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Clicking accept moves orders from <strong>PLACED</strong> to <strong>ACCEPTED</strong> and notifies the kitchen to begin cooking.
        </p>

        {/* 3 Zone Acceptance Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
          {/* Buddha Button */}
          <button
            onClick={() => handleZoneAccept('Buddha')}
            disabled={loadingZone === 'accept_Buddha'}
            className="p-3 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-between disabled:opacity-50"
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
            disabled={loadingZone === 'accept_KIPM'}
            className="p-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-between disabled:opacity-50"
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
            disabled={loadingZone === 'accept_ITM'}
            className="p-3 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-between disabled:opacity-50"
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
            disabled={loadingZone === 'accept_ALL'}
            className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-between disabled:opacity-50"
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

      {/* SECTION 2: CANCEL & AUTOMATED RAZORPAY REFUND STATION */}
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
            Active Orders: <strong className="text-white">{zoneStats.all.active}</strong>
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Cancels active orders for the zone and <strong>instantly triggers online refunds via Razorpay API</strong> (or credits wallet). Customer status immediately displays <span className="text-rose-400 font-bold">CANCELLED & REFUNDED</span>.
        </p>

        {/* 3 Zone Cancellation & Refund Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
          {/* Cancel Buddha Button */}
          <button
            onClick={() => handleZoneCancel('Buddha')}
            disabled={loadingZone === 'cancel_Buddha'}
            className="p-3 rounded-2xl bg-gradient-to-r from-rose-900 to-rose-700 hover:from-rose-800 hover:to-rose-600 border border-rose-700/60 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-between disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-300" />
              <span>Cancel Buddha (Refund)</span>
            </div>
            <span className="px-2 py-0.5 rounded-xl bg-black/40 text-[10px] font-black text-rose-200">
              {zoneStats.buddha.active} Active
            </span>
          </button>

          {/* Cancel KIPM Button */}
          <button
            onClick={() => handleZoneCancel('KIPM')}
            disabled={loadingZone === 'cancel_KIPM'}
            className="p-3 rounded-2xl bg-gradient-to-r from-red-900 to-red-700 hover:from-red-800 hover:to-red-600 border border-red-700/60 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-between disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-300" />
              <span>Cancel KIPM (Refund)</span>
            </div>
            <span className="px-2 py-0.5 rounded-xl bg-black/40 text-[10px] font-black text-red-200">
              {zoneStats.kipm.active} Active
            </span>
          </button>

          {/* Cancel ITM Button */}
          <button
            onClick={() => handleZoneCancel('ITM')}
            disabled={loadingZone === 'cancel_ITM'}
            className="p-3 rounded-2xl bg-gradient-to-r from-pink-950 to-pink-800 hover:from-pink-900 hover:to-pink-700 border border-pink-700/60 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-between disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-pink-300" />
              <span>Cancel ITM (Refund)</span>
            </div>
            <span className="px-2 py-0.5 rounded-xl bg-black/40 text-[10px] font-black text-pink-200">
              {zoneStats.itm.active} Active
            </span>
          </button>

          {/* Cancel All Button */}
          <button
            onClick={() => handleZoneCancel('ALL')}
            disabled={loadingZone === 'cancel_ALL'}
            className="p-3 rounded-2xl bg-gradient-to-r from-stone-900 to-rose-950 hover:from-stone-800 hover:to-rose-900 border border-rose-800 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-between disabled:opacity-50"
          >
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Cancel All Zones</span>
            </div>
            <span className="px-2 py-0.5 rounded-xl bg-black/50 text-[10px] font-black text-rose-300">
              {zoneStats.all.active} Active
            </span>
          </button>
        </div>
      </div>

      {/* SECTION 3: 7:30 PM RUNNER DISPATCH STATION */}
      <div className="space-y-4 bg-[#131D31]/60 border border-slate-800/80 p-4 sm:p-5 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>3. Campus Runner Dispatch Station</span>
            </h3>
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                isDispatchActive
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                  : 'bg-amber-950/80 text-amber-300 border-amber-700'
              }`}
            >
              {isDispatchActive ? '🟢 Active (7:30 PM)' : '⏰ Unlocks at 7:30 PM IST'}
            </span>
          </div>

          <span className="text-[11px] text-slate-400">
            Dispatchable Food: <strong className="text-white">{zoneStats.all.active}</strong> orders
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Clicking dispatch updates status to <strong>OUT_FOR_DELIVERY</strong> and attaches the runner's contact info. Customer tracking immediately turns blue with a "Call Runner" button.
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

        {/* 3 Zone Dispatch Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
          {/* Dispatch Buddha */}
          <button
            onClick={() => handleZoneDispatch('Buddha')}
            disabled={loadingZone === 'dispatch_Buddha'}
            className="p-3 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#E64A19] hover:from-[#F4511E] hover:to-[#D84315] text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center justify-between disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <Bike className="w-4 h-4" />
              <span>Dispatch Buddha</span>
            </div>
            <span className="px-2 py-0.5 rounded-xl bg-black/30 text-[10px] font-black">
              {zoneStats.buddha.active} Orders
            </span>
          </button>

          {/* Dispatch KIPM */}
          <button
            onClick={() => handleZoneDispatch('KIPM')}
            disabled={loadingZone === 'dispatch_KIPM'}
            className="p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-between disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <Bike className="w-4 h-4" />
              <span>Dispatch KIPM</span>
            </div>
            <span className="px-2 py-0.5 rounded-xl bg-black/30 text-[10px] font-black">
              {zoneStats.kipm.active} Orders
            </span>
          </button>

          {/* Dispatch ITM */}
          <button
            onClick={() => handleZoneDispatch('ITM')}
            disabled={loadingZone === 'dispatch_ITM'}
            className="p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition-all active:scale-95 flex items-center justify-between disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <Bike className="w-4 h-4" />
              <span>Dispatch ITM</span>
            </div>
            <span className="px-2 py-0.5 rounded-xl bg-black/30 text-[10px] font-black">
              {zoneStats.itm.active} Orders
            </span>
          </button>

          {/* Dispatch All Campuses */}
          <button
            onClick={() => handleZoneDispatch('ALL')}
            disabled={loadingZone === 'dispatch_ALL'}
            className="p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-between disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              <span>Dispatch All</span>
            </div>
            <span className="px-2 py-0.5 rounded-xl bg-black/30 text-[10px] font-black">
              {zoneStats.all.active} Orders
            </span>
          </button>
        </div>
      </div>

    </div>
  );
}
