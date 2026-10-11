import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Store,
  MapPin,
  Clock,
  ArrowUpRight,
  AlertCircle,
  Printer,
  Download,
  Table
} from 'lucide-react';
import CampusOperationsControl from '../components/CampusOperationsControl';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/admin/dashboard-stats');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setStats(data.stats);
            setRecentOrders(data.recent_orders || []);
          }
        }
      } catch (e) {
        console.error('Failed to load stats:', e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-slate-400 text-xs animate-pulse">
        Loading ERP Business Metrics...
      </div>
    );
  }

  const kpis = [
    {
      label: "Gross Merchandise Value (GMV)",
      val: `₹${parseFloat(stats?.total_gmv || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'from-emerald-500 to-teal-600',
      note: 'Total customer order volume'
    },
    {
      label: "Platform Net Margin",
      val: `₹${parseFloat(stats?.platform_margin || 0).toFixed(2)}`,
      icon: TrendingUp,
      color: 'from-[#FF5722] to-[#F4511E]',
      note: 'Customer price minus vendor deal'
    },
    {
      label: "Pending Vendor Payable",
      val: `₹${parseFloat(stats?.pending_vendor_payable || 0).toFixed(2)}`,
      icon: Store,
      color: 'from-amber-500 to-orange-600',
      note: 'Unsettled delivered food cost'
    },
    {
      label: "Total Orders",
      val: stats?.total_orders || 0,
      icon: ShoppingBag,
      color: 'from-blue-500 to-indigo-600',
      note: `${stats?.campus_orders || 0} Campus / ${stats?.outlet_orders || 0} Outlet`
    }
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-black text-white tracking-tight">Executive ERP Dashboard</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Real-time financial metrics, food margins, and operations overview.
        </p>
      </div>

      {/* Daily Campus Zone Slips (Buddha, KIPM, ITM) Download Section */}
      <div className="bg-gradient-to-r from-blue-950/80 via-indigo-950/80 to-purple-950/80 border border-blue-500/40 p-5 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0">
            <Printer className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white tracking-wide">
                Daily Campus Order Slips (6:05 PM Zone PDFs)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800">
                Ready for Print
              </span>
            </div>
            <p className="text-xs text-blue-200/80 mt-0.5">
              Hostel delivery slips grouped by campus zones with QR codes, customer name & secret OTP for runners.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 w-full md:w-auto items-stretch md:items-end">
          {/* Row 1: Individual Delivery Slips (PDFs) */}
          <div className="flex items-center gap-2 flex-wrap justify-start md:justify-end">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-blue-300 mr-1 hidden lg:inline">
              Delivery Slips:
            </span>
            <a
              href={`${import.meta.env.VITE_API_URL || ''}/api/orders/daily-zone-pdf?zone=Buddha`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-900/50 flex items-center gap-1.5 transition-all hover:scale-105"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Buddha Zone PDF</span>
            </a>
            <a
              href={`${import.meta.env.VITE_API_URL || ''}/api/orders/daily-zone-pdf?zone=KIPM`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-900/50 flex items-center gap-1.5 transition-all hover:scale-105"
            >
              <Download className="w-3.5 h-3.5" />
              <span>KIPM Zone PDF</span>
            </a>
            <a
              href={`${import.meta.env.VITE_API_URL || ''}/api/orders/daily-zone-pdf?zone=ITM`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-900/50 flex items-center gap-1.5 transition-all hover:scale-105"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ITM Zone PDF</span>
            </a>
          </div>

          {/* Row 2: Zero-Mistake Kitchen Production Sheets (Tabular Views) */}
          <div className="flex items-center gap-2 flex-wrap justify-start md:justify-end">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-300 mr-1 hidden lg:inline">
              Kitchen Tables:
            </span>
            <a
              href={`${import.meta.env.VITE_API_URL || ''}/api/orders/daily-zone-table?zone=Buddha`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/60 flex items-center gap-1.5 transition-all hover:scale-105 border border-emerald-400/30"
              title="Consolidated prep items and order dispatch table for Buddha zone"
            >
              <Table className="w-3.5 h-3.5" />
              <span>Buddha Kitchen Table</span>
            </a>
            <a
              href={`${import.meta.env.VITE_API_URL || ''}/api/orders/daily-zone-table?zone=KIPM`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-950/60 flex items-center gap-1.5 transition-all hover:scale-105 border border-teal-400/30"
              title="Consolidated prep items and order dispatch table for KIPM zone"
            >
              <Table className="w-3.5 h-3.5" />
              <span>KIPM Kitchen Table</span>
            </a>
            <a
              href={`${import.meta.env.VITE_API_URL || ''}/api/orders/daily-zone-table?zone=ITM`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-950/60 flex items-center gap-1.5 transition-all hover:scale-105 border border-cyan-400/30"
              title="Consolidated prep items and order dispatch table for ITM zone"
            >
              <Table className="w-3.5 h-3.5" />
              <span>ITM Kitchen Table</span>
            </a>
          </div>
        </div>
      </div>

      {/* Campus Operations Command Center (6:10 PM Accept & 7:30 PM Runner Dispatch) */}
      <CampusOperationsControl />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">{kpi.label}</span>
                <div className={`p-2 rounded-2xl bg-gradient-to-br ${kpi.color} text-white shadow-md`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-white mt-3">{kpi.val}</div>
              <p className="text-[11px] text-slate-400 mt-1">{kpi.note}</p>
            </div>
          );
        })}
      </div>

      {/* Operational Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Fulfillment Distribution */}
        <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-lg">
          <h3 className="text-sm font-black text-white mb-3">Order Distribution</h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">Campus Deliveries (Curry / Thali / Biryani / Breads)</span>
                <span className="text-white font-bold">{stats?.campus_orders || 0}</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full"
                  style={{
                    width: stats?.total_orders ? `${((stats.campus_orders || 0) / stats.total_orders) * 100}%` : '50%'
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">Physical Jhungiya Outlet Orders</span>
                <span className="text-white font-bold">{stats?.outlet_orders || 0}</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#FF5722] h-full rounded-full"
                  style={{
                    width: stats?.total_orders ? `${((stats.outlet_orders || 0) / stats.total_orders) * 100}%` : '50%'
                  }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
              💡 <strong>Margin Protection:</strong> Outlet items are priced with pre-negotiated vendor deals. Net margin stays protected automatically.
            </div>
          </div>
        </div>

        {/* Recent Live Orders Stream */}
        <div className="lg:col-span-2 bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-white">Recent Order Activity</h3>
            <span className="text-xs text-[#FF5722] font-bold">Auto-Syncing</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 pb-2">
                  <th className="pb-2 font-bold">Token</th>
                  <th className="pb-2 font-bold">Customer</th>
                  <th className="pb-2 font-bold">Location</th>
                  <th className="pb-2 font-bold">Total</th>
                  <th className="pb-2 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-slate-500">
                      No orders placed yet.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 font-black text-white">{ord.order_token}</td>
                      <td className="py-2.5 text-slate-300">{ord.customer_name}</td>
                      <td className="py-2.5 text-slate-400">
                        {ord.is_outlet_order ? '📍 Outlet' : `📍 ${ord.location_name}`}
                      </td>
                      <td className="py-2.5 font-bold text-emerald-400">
                        ₹{(parseFloat(ord.total_customer_price) + parseFloat(ord.delivery_fee || 0)).toFixed(0)}
                      </td>
                      <td className="py-2.5">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 uppercase">
                          {ord.order_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
