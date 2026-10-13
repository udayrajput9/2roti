import React, { useState, useEffect } from 'react';
import {
  Activity,
  UserX,
  Users,
  ShoppingCart,
  Eye,
  RefreshCw,
  Copy,
  Check,
  Search,
  Clock,
  Flame,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  Radio,
  ExternalLink
} from 'lucide-react';

export default function UserActivity() {
  const [activeTab, setActiveTab] = useState('dropoffs'); // dropoffs | cart | traffic | ledger
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const [overview, setOverview] = useState(null);
  const [dropoffsData, setDropoffsData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedEmail, setCopiedEmail] = useState(null);

  // Load all activity & drop-offs data
  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [overviewRes, dropoffsRes] = await Promise.all([
        fetch('/api/admin/activity/overview'),
        fetch('/api/admin/activity/dropoffs')
      ]);

      if (overviewRes.ok) {
        const d = await overviewRes.json();
        if (d.success) setOverview(d);
      }

      if (dropoffsRes.ok) {
        const d = await dropoffsRes.json();
        if (d.success) setDropoffsData(d);
      }
    } catch (err) {
      console.error('Failed to load activity data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadData(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(text);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const formatIST = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const todayStats = overview?.today || {};
  const dropoffStats = dropoffsData?.stats || {};
  const dropoffList = (dropoffsData?.dropoffs || []).filter(u => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term))
    );
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Live User Activity & Drop-offs</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  TODAY ONLY (24H RETENTION)
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time monitoring for today's visitors, incomplete sign-ins, cart additions & page traffic.
              </p>
            </div>
          </div>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              autoRefresh
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/80 hover:bg-emerald-950/60'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'text-emerald-400 animate-pulse' : ''}`} />
            <span>Auto Refresh: {autoRefresh ? 'ON (15s)' : 'OFF'}</span>
          </button>

          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="bg-[#1F2937] hover:bg-slate-700 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-orange-400' : 'text-slate-400'}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Top 4 Stat Cards (Strictly Today) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Incomplete Drop-offs */}
        <div className="bg-[#111827] border border-amber-900/40 hover:border-amber-700/60 transition-all rounded-3xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400">Today's Form Drop-offs</span>
            <div className="p-2 rounded-xl bg-amber-950 text-amber-400 border border-amber-800/60">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-white tracking-tight">
              {dropoffStats.today_dropoffs ?? '0'}
            </div>
            <div className="text-[11px] text-amber-400/80 font-medium mt-1 flex items-center gap-1">
              <span>{dropoffStats.today_dropoff_rate || '0%'} drop-off rate</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">{dropoffStats.today_signups || 0} total signups</span>
            </div>
          </div>
        </div>

        {/* Card 2: Today's Unique Visitors */}
        <div className="bg-[#111827] border border-blue-900/40 hover:border-blue-700/60 transition-all rounded-3xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400">Unique Visitors Today</span>
            <div className="p-2 rounded-xl bg-blue-950 text-blue-400 border border-blue-800/60">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-white tracking-tight">
              {todayStats.total_unique_visitors ?? '0'}
            </div>
            <div className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{todayStats.active_visitors_now ?? 0} active in last 15m</span>
            </div>
          </div>
        </div>

        {/* Card 3: Today's Cart Additions */}
        <div className="bg-[#111827] border border-emerald-900/40 hover:border-emerald-700/60 transition-all rounded-3xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400">Cart Additions Today</span>
            <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/60">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-white tracking-tight">
              {todayStats.total_cart_additions ?? '0'}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">
              Items added to cart by visitors
            </div>
          </div>
        </div>

        {/* Card 4: Today's Total Page Views */}
        <div className="bg-[#111827] border border-purple-900/40 hover:border-purple-700/60 transition-all rounded-3xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-400">Total Page Views Today</span>
            <div className="p-2 rounded-xl bg-purple-950 text-purple-400 border border-purple-800/60">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-white tracking-tight">
              {todayStats.total_page_views ?? '0'}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">
              Across Home, Menu & Checkout
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('dropoffs')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'dropoffs'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-[#111827] text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <UserX className="w-3.5 h-3.5" />
          <span>Incomplete Sign-Ins (Form Drop-offs)</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
            activeTab === 'dropoffs' ? 'bg-black/20 text-slate-950' : 'bg-amber-950 text-amber-400 border border-amber-800'
          }`}>
            {dropoffStats.today_dropoffs || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('cart')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'cart'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'bg-[#111827] text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Cart Monitoring (Items Added)</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
            activeTab === 'cart' ? 'bg-black/20 text-slate-950' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
          }`}>
            {todayStats.total_cart_additions || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('traffic')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'traffic'
              ? 'bg-blue-500 text-slate-950 shadow-md shadow-blue-500/20'
              : 'bg-[#111827] text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Page Traffic Breakdown</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
            activeTab === 'traffic' ? 'bg-black/20 text-slate-950' : 'bg-blue-950 text-blue-400 border border-blue-800'
          }`}>
            {todayStats.total_page_views || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'ledger'
              ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20'
              : 'bg-[#111827] text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Live Activity Ledger</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
            activeTab === 'ledger' ? 'bg-black/20 text-slate-950' : 'bg-purple-950 text-purple-400 border border-purple-800'
          }`}>
            Live
          </span>
        </button>
      </div>

      {/* TAB 1: Incomplete Sign-Ins (Form Drop-offs) */}
      {activeTab === 'dropoffs' && (
        <div className="space-y-4">
          <div className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                These students signed in with Google, but closed the website before submitting their 10-digit mobile number and campus drop point.
              </span>
            </div>
            <div className="relative shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter by name or email..."
                className="bg-[#1F2937] border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 w-56"
              />
            </div>
          </div>

          <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-lg overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 pb-2">
                  <th className="pb-2 font-bold">Student Name</th>
                  <th className="pb-2 font-bold">Google Email Address</th>
                  <th className="pb-2 font-bold">Signed Up (Time)</th>
                  <th className="pb-2 font-bold">Time Ago</th>
                  <th className="pb-2 font-bold">Profile Status</th>
                  <th className="pb-2 font-bold text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {dropoffList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500">
                      No incomplete Google sign-ins found.
                    </td>
                  </tr>
                ) : (
                  dropoffList.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-800/30">
                      <td className="py-3">
                        <div className="font-bold text-white">{user.name || 'Anonymous Student'}</div>
                        <span className="text-[10px] text-slate-500">User ID: #{user.id}</span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-300">{user.email || 'No email provided'}</span>
                          {user.email && (
                            <button
                              onClick={() => copyToClipboard(user.email)}
                              className="text-slate-500 hover:text-white p-1 rounded transition-colors"
                              title="Copy student email"
                            >
                              {copiedEmail === user.email ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 font-mono text-slate-400">
                        {formatIST(user.created_at)}
                      </td>
                      <td className="py-3 font-mono text-amber-400">
                        {formatTimeAgo(user.created_at)}
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/70 border border-amber-800/70 px-2 py-0.5 rounded-md">
                          ⚠️ Mobile & Campus Not Filled
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {user.email && (
                          <a
                            href={`mailto:${user.email}?subject=Welcome%20to%202%20Roti%20-%20Complete%20Your%20Campus%20Profile&body=Hi%20${encodeURIComponent(user.name || 'Student')},%20we%20noticed%20you%20signed%20in%20to%202Roti%20campus%20delivery%20service.%20Please%20log%20in%20and%20provide%20your%20campus%20location%20to%20place%20orders!`}
                            className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors"
                          >
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                            <span>Email Student</span>
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Cart Activity & Popular Dishes */}
      {activeTab === 'cart' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top Added Dishes */}
          <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>Most Added Dishes to Cart (Today)</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Ranked by Demand</span>
            </div>

            {(!overview?.top_items_today || overview.top_items_today.length === 0) ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No items added to cart yet today.
              </div>
            ) : (
              <div className="space-y-2.5">
                {overview.top_items_today.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#1F2937]/50 border border-slate-800 rounded-2xl flex items-center justify-between hover:bg-[#1F2937] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                        idx === 0 ? 'bg-orange-500 text-slate-950 font-black' :
                        idx === 1 ? 'bg-amber-500 text-slate-950 font-black' :
                        idx === 2 ? 'bg-yellow-500 text-slate-950 font-black' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">{item.itemName}</div>
                        <div className="text-[10px] text-slate-400">₹{item.price?.toFixed(2) || '0.00'} each</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-emerald-400">
                        {item.totalQty} in cart
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Added {item.count} times
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Cart Actions Stream */}
          <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-400" />
                <span>Recent Cart Additions (Live Stream)</span>
              </h3>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Active Feed
              </span>
            </div>

            {(!overview?.recent_cart_actions || overview.recent_cart_actions.length === 0) ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Waiting for student cart activity...
              </div>
            ) : (
              <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                {overview.recent_cart_actions.map((act, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-[#1F2937]/40 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs hover:bg-[#1F2937]"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center justify-center shrink-0">
                        <ShoppingCart className="w-3 h-3" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200">
                          <span className="text-white font-bold">{act.user}</span> added{' '}
                          <span className="text-orange-400 font-bold">"{act.itemName}"</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Qty: {act.quantity} • ₹{act.price}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono shrink-0">
                      {formatTimeAgo(act.time)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Page Traffic Breakdown */}
      {activeTab === 'traffic' && (
        <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-lg space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span>Page Visits Breakdown (Today)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Which sections of the website students are visiting today.
              </p>
            </div>
            <div className="text-xs font-bold text-slate-300">
              Total Page Views: <span className="text-white font-mono">{todayStats.total_page_views || 0}</span>
            </div>
          </div>

          {(!overview?.page_views_breakdown || overview.page_views_breakdown.length === 0) ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No page view records yet today.
            </div>
          ) : (
            <div className="space-y-4">
              {overview.page_views_breakdown.map((row, idx) => {
                const total = todayStats.total_page_views || 1;
                const percent = Math.min(100, Math.round((row.views / total) * 100));
                const pageLabel =
                  row.page === 'home' ? '🏠 Home / Menu Selection' :
                  row.page === 'checkout' ? '💳 Checkout & Order Confirmation' :
                  row.page === 'profile' ? '👤 Student Profile & Order History' :
                  row.page === 'search' ? '🔍 Food Search Page' :
                  row.page === 'chat' ? '💬 Customer Support Chat' :
                  row.page === 'legal' ? '📜 Terms & Policies' :
                  `📄 ${row.page}`;

                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{pageLabel}</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-300">{row.views} views</span>
                        <span className="text-blue-400 font-bold">({percent}%)</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Live Activity Ledger */}
      {activeTab === 'ledger' && (
        <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <span>Real-Time Activity Stream (Today's Last 50 Events)</span>
            </h3>
            <span className="text-[10px] text-purple-400 font-bold uppercase">Auto-pruned after 24h</span>
          </div>

          {(!overview?.recent_events || overview.recent_events.length === 0) ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No events recorded yet today.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800 pb-2">
                    <th className="pb-2 font-bold">Event Type</th>
                    <th className="pb-2 font-bold">Visitor / Student</th>
                    <th className="pb-2 font-bold">Page / Context</th>
                    <th className="pb-2 font-bold">Event Details</th>
                    <th className="pb-2 font-bold text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {overview.recent_events.map((evt) => {
                    const isCart = evt.event_type === 'CART_ADD';
                    const isPage = evt.event_type === 'PAGE_VIEW';
                    const isOnboarding = evt.event_type === 'ONBOARDING_VIEW';

                    return (
                      <tr key={evt.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isCart ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            isPage ? 'bg-blue-950 text-blue-400 border border-blue-800' :
                            isOnboarding ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {evt.event_type}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-200">
                          {evt.user_name || (evt.user_email ? evt.user_email : `Guest (${evt.session_id.slice(-6)})`)}
                        </td>
                        <td className="py-2.5 text-slate-400">
                          /{evt.page || 'home'}
                        </td>
                        <td className="py-2.5 text-slate-300">
                          {evt.metadata ? (
                            typeof evt.metadata === 'object' ? (
                              <span>
                                {evt.metadata.itemName ? `${evt.metadata.itemName} (Qty: ${evt.metadata.quantity})` : JSON.stringify(evt.metadata)}
                              </span>
                            ) : (
                              <span>{evt.metadata}</span>
                            )
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-2.5 text-right text-slate-400">
                          {formatIST(evt.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
