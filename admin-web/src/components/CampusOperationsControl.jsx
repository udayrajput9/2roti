import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  CheckCircle,
  Bike,
  User,
  Phone,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Send,
  Zap,
  Building,
  ShieldCheck
} from 'lucide-react';
import { useLiveOrders } from '../context/LiveOrderContext';

export default function CampusOperationsControl() {
  const { orders, bulkAcceptZone, dispatchZone, updateOrderStatus } = useLiveOrders();

  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [totalIstMinutes, setTotalIstMinutes] = useState(0);
  const [loadingZone, setLoadingZone] = useState('');
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

  // Time milestones
  const isAcceptActive = totalIstMinutes >= 1090; // 18:10 (6:10 PM IST)
  const isDispatchActive = totalIstMinutes >= 1170; // 19:30 (7:30 PM IST)

  // Calculate zone stats
  const zoneStats = useMemo(() => {
    const stats = {
      buddha: { placed: 0, dispatchable: 0, delivered: 0 },
      kipm: { placed: 0, dispatchable: 0, delivered: 0 },
      itm: { placed: 0, dispatchable: 0, delivered: 0 },
      all: { placed: 0, dispatchable: 0, delivered: 0 }
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
        if (key) stats[key].dispatchable++;
        stats.all.dispatchable++;
      }
      if (o.order_status === 'DELIVERED') {
        if (key) stats[key].delivered++;
        stats.all.delivered++;
      }
    });

    return stats;
  }, [orders]);

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
      
      {/* Header Bar with Clock and Live Status */}
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
              Automated 6:10 PM order acceptance & 7:30 PM campus runner dispatch pipeline
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

      {/* SECTION 2: 7:30 PM RUNNER DISPATCH STATION */}
      <div className="space-y-4 bg-[#131D31]/60 border border-slate-800/80 p-4 sm:p-5 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>2. Campus Runner Dispatch Station</span>
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
            Dispatchable Food: <strong className="text-white">{zoneStats.all.dispatchable}</strong> orders
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
              {zoneStats.buddha.dispatchable} Orders
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
              {zoneStats.kipm.dispatchable} Orders
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
              {zoneStats.itm.dispatchable} Orders
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
              {zoneStats.all.dispatchable} Orders
            </span>
          </button>
        </div>
      </div>

    </div>
  );
}
