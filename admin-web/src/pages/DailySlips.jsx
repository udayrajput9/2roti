import React, { useState, useEffect } from 'react';
import {
  Printer,
  Download,
  Table,
  MapPin,
  Clock,
  CheckCircle,
  FileText,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useLiveOrders } from '../context/LiveOrderContext';

export default function DailySlips() {
  const { orders, refreshOrders } = useLiveOrders();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Live IST Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(now.getTime() + istOffset);
      const hours = istDate.getUTCHours();
      const minutes = istDate.getUTCMinutes();
      const seconds = istDate.getUTCSeconds();
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

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshOrders();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const [scopeFilter, setScopeFilter] = useState('TODAY');

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

  const scopedOrders = React.useMemo(() => {
    if (scopeFilter === 'ALL') return orders;
    return orders.filter(o => isCreatedTodayIst(o.created_at));
  }, [orders, scopeFilter]);

  // Group orders by campus zone
  const zoneBreakdown = React.useMemo(() => {
    const zones = {
      Buddha: { total: 0, placed: 0, accepted: 0, outForDelivery: 0, delivered: 0 },
      KIPM: { total: 0, placed: 0, accepted: 0, outForDelivery: 0, delivered: 0 },
      ITM: { total: 0, placed: 0, accepted: 0, outForDelivery: 0, delivered: 0 },
      All: { total: 0, placed: 0, accepted: 0, outForDelivery: 0, delivered: 0 }
    };

    scopedOrders.forEach((o) => {
      if (o.is_outlet_order) return;
      const loc = (o.location_name || '').toLowerCase();
      let key = null;
      if (loc.includes('buddha')) key = 'Buddha';
      else if (loc.includes('kipm')) key = 'KIPM';
      else if (loc.includes('itm')) key = 'ITM';

      if (key) {
        zones[key].total++;
        if (o.order_status === 'PLACED') zones[key].placed++;
        if (['ACCEPTED', 'PREPARING', 'READY'].includes(o.order_status)) zones[key].accepted++;
        if (o.order_status === 'OUT_FOR_DELIVERY') zones[key].outForDelivery++;
        if (o.order_status === 'DELIVERED') zones[key].delivered++;
      }

      zones.All.total++;
      if (o.order_status === 'PLACED') zones.All.placed++;
      if (['ACCEPTED', 'PREPARING', 'READY'].includes(o.order_status)) zones.All.accepted++;
      if (o.order_status === 'OUT_FOR_DELIVERY') zones.All.outForDelivery++;
      if (o.order_status === 'DELIVERED') zones.All.delivered++;
    });

    return zones;
  }, [scopedOrders]);

  const apiBase = import.meta.env.VITE_API_URL || '';

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-blue-950/90 via-indigo-950/80 to-purple-950/90 border border-blue-500/40 p-6 rounded-3xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/50 flex items-center justify-center text-blue-300 shadow-lg shadow-blue-500/20 shrink-0">
            <Printer className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                Daily Campus Order Slips & Kitchen Sheets
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800">
                Live Slips Engine
              </span>
            </div>
            <p className="text-xs text-blue-200/90 mt-1 max-w-2xl leading-relaxed">
              Generate and download zone-wise delivery slips with QR verification codes for runners, and clean consolidated prep tables for kitchen cooking.
            </p>
          </div>
        </div>

        {/* Live IST Clock, Scope Filter & Refresh */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {/* Scope Filter */}
          <div className="flex items-center p-0.5 bg-slate-900 rounded-xl border border-slate-800">
            <button
              onClick={() => setScopeFilter('TODAY')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                scopeFilter === 'TODAY'
                  ? 'bg-[#FF5722] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
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
            >
              All Recent
            </button>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center gap-2 text-xs font-mono font-bold text-slate-200 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-[#FF5722] animate-spin" style={{ animationDuration: '6s' }} />
            <span>{currentTimeStr || 'IST Clock'}</span>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-all active:scale-95 shadow-inner"
            title="Refresh order counts"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#FF5722]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Master All Campuses Quick Bar */}
      <div className="bg-[#101726] border border-blue-800/70 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-black shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                All Campuses Master Package (Combined)
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 font-bold border border-blue-800">
                {zoneBreakdown.All.total} Total Orders
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              1-Click downloads for Buddha, KIPM & ITM combined into a single sheet for the central kitchen.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <a
            href={`${apiBase}/api/orders/daily-zone-pdf?zone=ALL`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 md:flex-none py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-950/50 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>All Campuses Slips (PDF)</span>
          </a>
          <a
            href={`${apiBase}/api/orders/daily-zone-table?zone=ALL`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 md:flex-none py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-blue-300 hover:text-white border border-blue-700/40 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Table className="w-4 h-4 text-blue-400" />
            <span>All Campuses Kitchen Prep Table</span>
          </a>
        </div>
      </div>

      {/* 2. Campus Zone Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* ZONE 1: BUDDHA */}
        <div className="bg-[#101726] border border-amber-600/30 hover:border-amber-500/60 rounded-3xl p-5 shadow-xl transition-all space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Buddha PG College</h3>
                <span className="text-[11px] text-amber-400/90 font-semibold">Buddha Campus Zone</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-amber-950/60 border border-amber-700/50 text-amber-300 text-xs font-black">
              {zoneBreakdown.Buddha.total} Orders
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs py-1">
            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Placed</span>
              <span className="text-xs font-black text-amber-400">{zoneBreakdown.Buddha.placed}</span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Cooking</span>
              <span className="text-xs font-black text-blue-400">{zoneBreakdown.Buddha.accepted}</span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Dispatched</span>
              <span className="text-xs font-black text-emerald-400">{zoneBreakdown.Buddha.outForDelivery}</span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <a
              href={`${apiBase}/api/orders/daily-zone-pdf?zone=Buddha`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-md shadow-orange-900/40 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download Buddha Slips (PDF)</span>
            </a>
            <a
              href={`${apiBase}/api/orders/daily-zone-table?zone=Buddha`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-white border border-amber-700/40 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Table className="w-4 h-4 text-amber-400" />
              <span>Buddha Kitchen Table Sheet</span>
            </a>
          </div>
        </div>

        {/* ZONE 2: KIPM */}
        <div className="bg-[#101726] border border-indigo-600/30 hover:border-indigo-500/60 rounded-3xl p-5 shadow-xl transition-all space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-black">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">KIPM Engineering</h3>
                <span className="text-[11px] text-indigo-400/90 font-semibold">KIPM Campus Zone</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-indigo-950/60 border border-indigo-700/50 text-indigo-300 text-xs font-black">
              {zoneBreakdown.KIPM.total} Orders
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs py-1">
            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Placed</span>
              <span className="text-xs font-black text-amber-400">{zoneBreakdown.KIPM.placed}</span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Cooking</span>
              <span className="text-xs font-black text-blue-400">{zoneBreakdown.KIPM.accepted}</span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Dispatched</span>
              <span className="text-xs font-black text-emerald-400">{zoneBreakdown.KIPM.outForDelivery}</span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <a
              href={`${apiBase}/api/orders/daily-zone-pdf?zone=KIPM`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-indigo-900/40 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download KIPM Slips (PDF)</span>
            </a>
            <a
              href={`${apiBase}/api/orders/daily-zone-table?zone=KIPM`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-300 hover:text-white border border-indigo-700/40 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Table className="w-4 h-4 text-indigo-400" />
              <span>KIPM Kitchen Table Sheet</span>
            </a>
          </div>
        </div>

        {/* ZONE 3: ITM */}
        <div className="bg-[#101726] border border-purple-600/30 hover:border-purple-500/60 rounded-3xl p-5 shadow-xl transition-all space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-black">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">ITM Gorakhpur</h3>
                <span className="text-[11px] text-purple-400/90 font-semibold">ITM Campus Zone</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-purple-950/60 border border-purple-700/50 text-purple-300 text-xs font-black">
              {zoneBreakdown.ITM.total} Orders
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs py-1">
            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Placed</span>
              <span className="text-xs font-black text-amber-400">{zoneBreakdown.ITM.placed}</span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Cooking</span>
              <span className="text-xs font-black text-blue-400">{zoneBreakdown.ITM.accepted}</span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Dispatched</span>
              <span className="text-xs font-black text-emerald-400">{zoneBreakdown.ITM.outForDelivery}</span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <a
              href={`${apiBase}/api/orders/daily-zone-pdf?zone=ITM`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-md shadow-purple-900/40 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download ITM Slips (PDF)</span>
            </a>
            <a
              href={`${apiBase}/api/orders/daily-zone-table?zone=ITM`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-purple-300 hover:text-white border border-purple-700/40 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Table className="w-4 h-4 text-purple-400" />
              <span>ITM Kitchen Table Sheet</span>
            </a>
          </div>
        </div>

      </div>

      {/* 3. Operational Guidelines & Dispatch Protocol */}
      <div className="bg-[#101726] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Campus Dispatch & Runner Protocol</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
          <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-1">
            <span className="font-bold text-amber-300 block">1. 6:05 PM Slips Print</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Kitchen download zone slips and gives to packing stations. Orders are sorted into separate Buddha, KIPM & ITM hot boxes.
            </p>
          </div>
          <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-1">
            <span className="font-bold text-blue-300 block">2. Packing & QR Match</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Each food packet is stickered with the order receipt slip containing customer name, phone number, and secret 4-digit OTP.
            </p>
          </div>
          <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-1">
            <span className="font-bold text-emerald-300 block">3. 7:30 PM Gate Handover</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Campus runners reach college gates. Students show their profile QR code to the runner for instant verification and handover.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
