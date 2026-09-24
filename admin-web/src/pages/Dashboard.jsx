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
  AlertCircle
} from 'lucide-react';

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
                <span className="text-slate-300">Campus Deliveries (Curry/Thali/Biryani/Pizza)</span>
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
