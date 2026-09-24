import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  CheckCircle,
  Clock,
  MapPin,
  Phone,
  User,
  Bike,
  UtensilsCrossed,
  Volume2,
  AlertTriangle,
  Send,
  X,
  Search,
  LayoutList,
  LayoutGrid,
  CheckCircle2,
  PackageCheck,
  Flame,
  Radio,
  RotateCcw,
  Receipt,
  ChevronRight,
  Sparkles,
  ListOrdered,
  Eye,
  Filter,
  RefreshCw,
  Building
} from 'lucide-react';
import { useLiveOrders } from '../context/LiveOrderContext';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function LiveOrders({ activeTab = 'live_orders_active', onSelectTab }) {
  const {
    orders,
    updateOrderStatus,
    assignRunner,
    lastAlert,
    dismissAlert,
    playAlertChime,
    refreshOrders
  } = useLiveOrders();
  const { staff, isVendor, isSuperAdmin, isOrderManager } = useAdminAuth();

  // Helper mappings between Sidebar activeTab and page filterStatus
  const getFilterFromTab = (tab) => {
    if (tab === 'live_orders_placed') return 'PLACED';
    if (tab === 'live_orders_preparing') return 'PREPARING';
    if (tab === 'live_orders_ready') return 'READY';
    if (tab === 'live_orders_delivered') return 'DELIVERED';
    if (tab === 'live_orders_all') return 'ALL';
    return 'ACTIVE';
  };

  const getTabFromFilter = (status) => {
    if (status === 'PLACED') return 'live_orders_placed';
    if (status === 'PREPARING') return 'live_orders_preparing';
    if (status === 'READY') return 'live_orders_ready';
    if (status === 'DELIVERED') return 'live_orders_delivered';
    if (status === 'ALL') return 'live_orders_all';
    return 'live_orders_active';
  };

  const [filterStatus, setFilterStatus] = useState(() => getFilterFromTab(activeTab));
  const [viewMode, setViewMode] = useState('TABLE'); // 'TABLE' | 'CARDS'
  const [searchQuery, setSearchQuery] = useState('');
  const [outletFilter, setOutletFilter] = useState('ALL'); // 'ALL' | 'OUTLET' | 'CAMPUS'
  const [selectedOrderForRunner, setSelectedOrderForRunner] = useState(null);
  const [runnerName, setRunnerName] = useState('');
  const [runnerPhone, setRunnerPhone] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Sync state if activeTab changes from Sidebar navigation
  useEffect(() => {
    setFilterStatus(getFilterFromTab(activeTab));
  }, [activeTab]);

  // Auto-polling fallback (every 10 seconds) since WebSockets disconnect on Vercel
  useEffect(() => {
    const interval = setInterval(() => {
      if (refreshOrders && typeof refreshOrders === 'function') {
        refreshOrders(); // silent fetch
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [refreshOrders]);

  const handleTabClick = (tabId) => {
    setFilterStatus(tabId);
    if (onSelectTab) {
      onSelectTab(getTabFromFilter(tabId));
    }
  };

  // Stage meta information
  const stageMeta = {
    ACTIVE: {
      title: 'Active Kitchen Orders (Live)',
      description: 'Real-time orders currently being placed, cooked, or awaiting campus runner dispatch.',
      badge: 'Live Operations',
      icon: Sparkles,
      color: 'text-[#FF5722]'
    },
    PLACED: {
      title: 'New Incoming Orders (Pending Acceptance)',
      description: 'Fresh incoming orders requiring immediate kitchen confirmation and prep acceptance.',
      badge: 'Needs Acceptance',
      icon: Clock,
      color: 'text-red-400'
    },
    PREPARING: {
      title: 'Kitchen Cooking & Preparation Station',
      description: 'Accepted orders currently firing in the kitchen. Mark ready once cooked and packed.',
      badge: 'In Kitchen',
      icon: Flame,
      color: 'text-amber-400'
    },
    READY: {
      title: 'Ready for Dispatch & Pickup Station',
      description: 'Food packed and ready for counter collection or campus runner assignment.',
      badge: 'Dispatch Ready',
      icon: PackageCheck,
      color: 'text-emerald-400'
    },
    DELIVERED: {
      title: 'Delivered & Completed Orders Ledger',
      description: 'Fulfilled orders with customer delivery verification and cashback logged.',
      badge: 'Completed Orders',
      icon: CheckCircle2,
      color: 'text-emerald-400'
    },
    ALL: {
      title: 'Master Orders Audit & Historic Ledger',
      description: 'Complete order registry across all stages, statuses, and locations.',
      badge: 'Complete Audit',
      icon: ListOrdered,
      color: 'text-slate-300'
    }
  };

  const currentMeta = stageMeta[filterStatus] || stageMeta.ACTIVE;
  const CurrentIcon = currentMeta.icon;

  // Filter orders
  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return orders.filter((order) => {
      // 1. Status Filter
      if (filterStatus === 'ACTIVE') {
        if (
          order.order_status === 'DELIVERED' ||
          order.order_status === 'CANCELLED' ||
          order.order_status === 'REFUNDED'
        ) {
          return false;
        }
      } else if (filterStatus === 'PREPARING') {
        if (order.order_status !== 'PREPARING' && order.order_status !== 'ACCEPTED') {
          return false;
        }
      } else if (filterStatus !== 'ALL') {
        if (order.order_status !== filterStatus) return false;
      }

      // 2. Outlet vs Campus Drop Filter
      if (outletFilter === 'OUTLET' && !order.is_outlet_order) return false;
      if (outletFilter === 'CAMPUS' && order.is_outlet_order) return false;

      // 3. Search Query (O(1) hoisted query)
      if (q) {
        const matchesToken = order.order_token && order.order_token.toLowerCase().includes(q);
        const matchesCust = order.customer_name && order.customer_name.toLowerCase().includes(q);
        const matchesPhone = order.customer_phone && order.customer_phone.includes(q);
        const matchesLoc = order.location_name && order.location_name.toLowerCase().includes(q);
        const matchesItems =
          order.items &&
          order.items.some((i) => i.item_name && i.item_name.toLowerCase().includes(q));
        if (!matchesToken && !matchesCust && !matchesPhone && !matchesLoc && !matchesItems) {
          return false;
        }
      }

      return true;
    });
  }, [orders, filterStatus, outletFilter, searchQuery]);

  // Aggregate stats for this current tab
  const tabStats = useMemo(() => {
    let totalValue = 0;
    let totalPortions = 0;
    let outletCount = 0;
    let campusCount = 0;

    filteredOrders.forEach((o) => {
      if (isVendor) {
        totalValue += parseFloat(o.total_vendor_cost || 0);
      } else {
        totalValue +=
          parseFloat(o.total_customer_price || 0) + parseFloat(o.delivery_fee || 0);
      }

      if (Array.isArray(o.items)) {
        o.items.forEach((it) => {
          totalPortions += it.quantity || 1;
        });
      }

      if (o.is_outlet_order) {
        outletCount++;
      } else {
        campusCount++;
      }
    });

    return { totalValue, totalPortions, outletCount, campusCount };
  }, [filteredOrders, isVendor]);

  // Status transitions
  const handleStatusChange = async (orderId, nextStatus) => {
    try {
      setLoadingAction(true);
      await updateOrderStatus(orderId, nextStatus);
    } catch (e) {
      alert(e.message || 'Status update error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAssignRunnerSubmit = async (e) => {
    e.preventDefault();
    if (!runnerName.trim() || !runnerPhone.trim()) {
      alert('Runner name and phone required');
      return;
    }
    try {
      setLoadingAction(true);
      await assignRunner(selectedOrderForRunner.id, runnerName.trim(), runnerPhone.trim());
      setSelectedOrderForRunner(null);
      setRunnerName('');
      setRunnerPhone('');
    } catch (e) {
      alert(e.message || 'Runner assignment error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    if (refreshOrders) {
      await refreshOrders();
    }
    setTimeout(() => setRefreshing(false), 500);
  };

  // Helper for Status Badge styling
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'PLACED':
        return (
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-orange-950/80 text-orange-400 border border-orange-800 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            <span>PLACED</span>
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-blue-950/80 text-blue-300 border border-blue-800 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>ACCEPTED</span>
          </span>
        );
      case 'PREPARING':
        return (
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-800 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-spin" />
            <span>PREPARING</span>
          </span>
        );
      case 'READY':
        return (
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-800 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            <span>READY</span>
          </span>
        );
      case 'OUT_FOR_DELIVERY':
        return (
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-indigo-950/80 text-indigo-300 border border-indigo-800 flex items-center gap-1">
            <Bike className="w-3 h-3" />
            <span>ON RUNNER</span>
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>DELIVERED</span>
          </span>
        );
      case 'CANCELLED':
      case 'REFUNDED':
        return (
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-rose-950/80 text-rose-300 border border-rose-800 flex items-center gap-1">
            <X className="w-3 h-3" />
            <span>{status}</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 max-w-7xl mx-auto font-sans">
      
      {/* Top Banner Alert when New Order Arrives */}
      {lastAlert && (
        <div className="bg-gradient-to-r from-[#FF5722] to-[#F4511E] text-white p-4 rounded-3xl shadow-[0_10px_40px_rgba(255,87,34,0.5)] flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Bell className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="font-black text-sm tracking-wide">
                🔔 NEW ORDER RECEIVED: {lastAlert.order_token}!
              </div>
              <p className="text-xs text-orange-100">
                {lastAlert.is_outlet_order
                  ? 'Outlet Pickup'
                  : `Campus Drop: ${lastAlert.location_name}`}{' '}
                • {lastAlert.items?.length || 0} items
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={playAlertChime}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white"
              title="Re-play chime"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              onClick={dismissAlert}
              className="px-3 py-1.5 rounded-xl bg-white text-[#BF360C] font-black text-xs shadow-md"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Screen Title & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#FF5722] to-[#E64A19] text-white shadow-md">
            <CurrentIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                {currentMeta.title}
              </h1>
              <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                {currentMeta.badge}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{currentMeta.description}</p>
          </div>
        </div>

        {/* View Mode Toggle & Utility Buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {/* Table vs Cards Toggle */}
          <div className="flex items-center p-1 bg-[#18202F] rounded-2xl border border-slate-800">
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'TABLE'
                  ? 'bg-[#FF5722] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Tabular Data Table View"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Tabular Table</span>
            </button>

            <button
              onClick={() => setViewMode('CARDS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'CARDS'
                  ? 'bg-[#FF5722] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Kitchen Order Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards Grid</span>
            </button>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#FF5722]' : ''}`} />
          </button>

          {/* Audio Chime Test */}
          <button
            onClick={playAlertChime}
            className="px-3 py-1.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <Volume2 className="w-3.5 h-3.5 text-[#FF5722]" />
            <span className="hidden sm:inline">Alert Chime</span>
          </button>
        </div>
      </div>

      {/* Horizontal Stage Tab Navigation (In Sync with Left Sidebar) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'ACTIVE', label: 'Active Kitchen (Live)', icon: Sparkles },
          { id: 'PLACED', label: 'New Placed', icon: Clock },
          { id: 'PREPARING', label: 'In Kitchen', icon: Flame },
          { id: 'READY', label: 'Ready / Dispatched', icon: PackageCheck },
          { id: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 },
          { id: 'ALL', label: 'All Orders Ledger', icon: ListOrdered }
        ].map((tab) => {
          const isSelected = filterStatus === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-[#FF5722] text-white border-[#FF5722] shadow-[0_4px_16px_rgba(255,87,34,0.35)]'
                  : 'bg-[#111827] text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <TabIcon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tabular Page Top Summary Bar & Search Controls */}
      <div className="bg-[#111827] border border-slate-800 rounded-3xl p-4 shadow-lg space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-3 overflow-x-auto pb-1 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-[#18202F] border border-slate-800 flex items-center gap-1.5">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Orders:</span>
              <span className="font-mono font-black text-white">{filteredOrders.length}</span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-[#18202F] border border-slate-800 flex items-center gap-1.5">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Portions Cooked:</span>
              <span className="font-mono font-black text-white">{tabStats.totalPortions}</span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-emerald-950/50 border border-emerald-800/60 flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold uppercase text-[10px]">
                {isVendor ? 'Vendor Earnings:' : 'Tab Total Value:'}
              </span>
              <span className="font-mono font-black text-emerald-400">
                ₹{tabStats.totalValue.toFixed(2)}
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-[#18202F] border border-slate-800 flex items-center gap-2 text-slate-400 text-[11px]">
              <span>📍 {tabStats.outletCount} Counter</span>
              <span>•</span>
              <span>🏢 {tabStats.campusCount} Campus Drop</span>
            </div>
          </div>

          {/* Search Box & Outlet Filter */}
          <div className="flex items-center gap-2 flex-1 max-w-lg justify-end">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by token (#2R-...), customer, phone, or dish..."
                className="w-full bg-[#18202F] border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
              />
            </div>

            <select
              value={outletFilter}
              onChange={(e) => setOutletFilter(e.target.value)}
              className="bg-[#18202F] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF5722]"
            >
              <option value="ALL">All Types</option>
              <option value="OUTLET">Outlet Counter Only</option>
              <option value="CAMPUS">Campus Delivery Only</option>
            </select>
          </div>

        </div>
      </div>

      {/* VIEW MODE 1: TABULAR TABLE PAGE (Default) */}
      {viewMode === 'TABLE' ? (
        <div className="bg-[#111827] border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 pb-3">
                  <th className="pb-3 px-3 font-bold">Order Token</th>
                  <th className="pb-3 px-3 font-bold">Time</th>
                  <th className="pb-3 px-3 font-bold">Destination / Drop</th>
                  <th className="pb-3 px-3 font-bold">Customer Details</th>
                  <th className="pb-3 px-3 font-bold">Dishes & Portions</th>
                  <th className="pb-3 px-3 font-bold">
                    {isVendor ? 'Vendor Payout' : 'Order Total'}
                  </th>
                  <th className="pb-3 px-3 font-bold">Payment</th>
                  <th className="pb-3 px-3 font-bold">Campus Runner</th>
                  <th className="pb-3 px-3 text-center font-bold">Status</th>
                  <th className="pb-3 px-3 text-right font-bold">Stage Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <UtensilsCrossed className="w-10 h-10 opacity-30 stroke-1" />
                        <p className="font-bold text-sm text-slate-300">
                          No orders currently in {currentMeta.title}.
                        </p>
                        <p className="text-xs text-slate-500">
                          New orders placed by students or outlet visitors appear here in real-time.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const isPlaced = order.order_status === 'PLACED';
                    const isAccepted = order.order_status === 'ACCEPTED';
                    const isPreparing = order.order_status === 'PREPARING';
                    const isReady = order.order_status === 'READY';
                    const isOut = order.order_status === 'OUT_FOR_DELIVERY';
                    const isDelivered = order.order_status === 'DELIVERED';

                    const displayAmount = isVendor
                      ? parseFloat(order.total_vendor_cost || 0).toFixed(2)
                      : (
                          parseFloat(order.total_customer_price || 0) +
                          parseFloat(order.delivery_fee || 0)
                        ).toFixed(2);

                    return (
                      <tr key={order.id} className="hover:bg-slate-800/40 transition-colors">
                        
                        {/* 1. Order Token */}
                        <td className="py-3 px-3">
                          <div className="font-mono font-black text-white text-sm">
                            {order.order_token}
                          </div>
                        </td>

                        {/* 2. Time Placed */}
                        <td className="py-3 px-3 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                          {new Date(order.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>

                        {/* 3. Destination */}
                        <td className="py-3 px-3">
                          {order.is_outlet_order ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-lg">
                              <Building className="w-3 h-3" />
                              <span>Outlet Counter</span>
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-blue-950/80 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-lg">
                                <MapPin className="w-3 h-3" />
                                <span>{order.location_name}</span>
                              </span>
                              {order.delivery_address_note && (
                                <p className="text-[10px] text-slate-400 truncate max-w-[120px]" title={order.delivery_address_note}>
                                  {order.delivery_address_note}
                                </p>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 4. Customer */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-200">{order.customer_name}</div>
                          {order.customer_phone && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] font-mono text-slate-400">
                                {order.customer_phone}
                              </span>
                              <a
                                href={`tel:${order.customer_phone}`}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                                title="Call Customer"
                              >
                                <Phone className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          )}
                        </td>

                        {/* 5. Dishes & Portions */}
                        <td className="py-3 px-3">
                          <div className="space-y-1 max-w-[200px]">
                            {order.items?.map((it, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                                <span className="font-black text-[#FF5722] bg-[#FF5722]/10 px-1 rounded">
                                  ×{it.quantity}
                                </span>
                                <span className="font-bold text-slate-200 truncate">{it.item_name}</span>
                                <span className="text-[10px] font-mono text-slate-500">
                                  (₹{isVendor ? (it.vendor_cost ?? it.customer_price) : it.customer_price})
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* 6. Amount / Payout */}
                        <td className="py-3 px-3">
                          <div className={`font-mono font-black text-sm ${isVendor ? 'text-emerald-400' : 'text-white'}`}>
                            ₹{displayAmount}
                          </div>
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">
                            {isVendor ? 'Vendor Earnings' : 'Retail Bill'}
                          </span>
                        </td>

                        {/* 7. Payment Source */}
                        <td className="py-3 px-3">
                          <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300">
                            {order.payment_source}
                          </span>
                        </td>

                        {/* 8. Campus Runner */}
                        <td className="py-3 px-3">
                          {order.assigned_runner_name ? (
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <Bike className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <div>
                                <span className="font-bold text-white block">{order.assigned_runner_name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{order.assigned_runner_phone}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">—</span>
                          )}
                        </td>

                        {/* 9. Status Badge */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {renderStatusBadge(order.order_status)}
                        </td>

                        {/* 10. Stage Actions */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            
                            {/* Placed Actions */}
                            {isPlaced && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(order.id, 'ACCEPTED')}
                                  disabled={loadingAction}
                                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
                                >
                                  Accept Order
                                </button>
                                <button
                                  onClick={() => handleStatusChange(order.id, 'CANCELLED')}
                                  disabled={loadingAction}
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 font-bold text-xs transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {/* Accepted Action */}
                            {isAccepted && (
                              <button
                                onClick={() => handleStatusChange(order.id, 'PREPARING')}
                                disabled={loadingAction}
                                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all"
                              >
                                Start Cooking
                              </button>
                            )}

                            {/* Preparing Action */}
                            {isPreparing && (
                              <button
                                onClick={() => handleStatusChange(order.id, 'READY')}
                                disabled={loadingAction}
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all"
                              >
                                Food Ready
                              </button>
                            )}

                            {/* Ready Action */}
                            {isReady && (
                              <>
                                {order.is_outlet_order ? (
                                  <button
                                    onClick={() => handleStatusChange(order.id, 'DELIVERED')}
                                    disabled={loadingAction}
                                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all"
                                  >
                                    Collected (Delivered)
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => setSelectedOrderForRunner(order)}
                                      disabled={loadingAction}
                                      className="px-2.5 py-1.5 rounded-xl bg-[#FF5722] hover:bg-[#F4511E] text-white font-bold text-xs shadow-md flex items-center gap-1 active:scale-95 transition-all"
                                    >
                                      <Bike className="w-3.5 h-3.5" />
                                      <span>Assign Runner</span>
                                    </button>
                                    <button
                                      onClick={() => handleStatusChange(order.id, 'DELIVERED')}
                                      disabled={loadingAction}
                                      className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs active:scale-95"
                                    >
                                      Delivered
                                    </button>
                                  </>
                                )}
                              </>
                            )}

                            {/* Out For Delivery Action */}
                            {isOut && (
                              <button
                                onClick={() => handleStatusChange(order.id, 'DELIVERED')}
                                disabled={loadingAction}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all"
                              >
                                Confirm Drop-off (+₹3)
                              </button>
                            )}

                            {/* Delivered Status */}
                            {isDelivered && (
                              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Fulfilled</span>
                              </span>
                            )}

                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: KITCHEN ORDER CARDS GRID (Touchscreen / Tablet) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-[#111827] rounded-3xl border border-slate-800 text-slate-500">
              <UtensilsCrossed className="w-12 h-12 mx-auto mb-2 opacity-30 stroke-1" />
              <p className="text-sm font-semibold">No orders in this state.</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Incoming customer orders appear here with audio chime alert.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isPlaced = order.order_status === 'PLACED';
              const isAccepted = order.order_status === 'ACCEPTED';
              const isPreparing = order.order_status === 'PREPARING';
              const isReady = order.order_status === 'READY';
              const isOut = order.order_status === 'OUT_FOR_DELIVERY';
              const isDelivered = order.order_status === 'DELIVERED';

              return (
                <div
                  key={order.id}
                  className={`bg-[#111827] border rounded-3xl p-4 flex flex-col justify-between shadow-xl transition-all ${
                    isPlaced
                      ? 'border-[#FF5722] ring-1 ring-[#FF5722]/50 glow-alert'
                      : 'border-slate-800'
                  }`}
                >
                  <div>
                    {/* Order Token & Header */}
                    <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-white">{order.order_token}</span>
                          {order.is_outlet_order ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-black uppercase">
                              Outlet Counter
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-black uppercase">
                              {order.location_name} Campus
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#FF5722]" />
                          <span>
                            {new Date(order.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-sm font-black ${isVendor ? 'text-emerald-400' : 'text-white'}`}>
                          ₹{parseFloat(
                            isVendor
                              ? (order.total_vendor_cost || 0)
                              : (parseFloat(order.total_customer_price || 0) +
                                  parseFloat(order.delivery_fee || 0))
                          ).toFixed(0)}
                        </span>
                        <span className="block text-[10px] text-slate-400 uppercase font-semibold">
                          {isVendor ? 'Vendor Earnings' : order.payment_source}
                        </span>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="py-2.5 border-b border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-200">{order.customer_name}</span>
                        <p className="text-[11px] text-slate-400">{order.delivery_address_note}</p>
                      </div>
                      {order.customer_phone && (
                        <a
                          href={`tel:${order.customer_phone}`}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                          title="Call Customer"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    {/* Food Items Ordered */}
                    <div className="py-3 space-y-1.5">
                      {order.items?.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-200">
                            <span className="text-[#FF5722] font-black mr-1.5">{item.quantity}×</span>
                            {item.item_name}
                          </span>
                          <span className="text-slate-400 font-medium">
                            ₹{(((isVendor ? item.vendor_cost : item.customer_price) || 0) * item.quantity).toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Runner Info if Assigned */}
                    {order.assigned_runner_name && (
                      <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bike className="w-4 h-4 text-emerald-400" />
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Campus Runner</span>
                            <span className="font-bold text-white">{order.assigned_runner_name}</span>
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-400">{order.assigned_runner_phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Stepper Buttons */}
                  <div className="pt-3 border-t border-slate-800 mt-2 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
                      <span>Current Status:</span>
                      <span className="text-[#FF7043] uppercase tracking-wider">
                        {order.order_status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {isPlaced && (
                        <>
                          <button
                            onClick={() => handleStatusChange(order.id, 'ACCEPTED')}
                            disabled={loadingAction}
                            className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
                          >
                            Accept Order
                          </button>
                          <button
                            onClick={() => handleStatusChange(order.id, 'CANCELLED')}
                            disabled={loadingAction}
                            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 font-bold text-xs transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {isAccepted && (
                        <button
                          onClick={() => handleStatusChange(order.id, 'PREPARING')}
                          disabled={loadingAction}
                          className="col-span-2 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all"
                        >
                          Start Cooking (In Kitchen)
                        </button>
                      )}

                      {isPreparing && (
                        <button
                          onClick={() => handleStatusChange(order.id, 'READY')}
                          disabled={loadingAction}
                          className="col-span-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all"
                        >
                          Food Ready for Pickup
                        </button>
                      )}

                      {isReady && (
                        <>
                          {order.is_outlet_order ? (
                            <button
                              onClick={() => handleStatusChange(order.id, 'DELIVERED')}
                              disabled={loadingAction}
                              className="col-span-2 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all"
                            >
                              Customer Collected (Delivered)
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => setSelectedOrderForRunner(order)}
                                disabled={loadingAction}
                                className="py-3 rounded-2xl bg-[#FF5722] hover:bg-[#F4511E] text-white font-bold text-xs shadow-md flex items-center justify-center gap-1 active:scale-95 transition-all"
                              >
                                <Bike className="w-3.5 h-3.5" />
                                <span>Assign Runner</span>
                              </button>
                              <button
                                onClick={() => handleStatusChange(order.id, 'DELIVERED')}
                                disabled={loadingAction}
                                className="py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs active:scale-95"
                              >
                                Delivered
                              </button>
                            </>
                          )}
                        </>
                      )}

                      {isOut && (
                        <button
                          onClick={() => handleStatusChange(order.id, 'DELIVERED')}
                          disabled={loadingAction}
                          className="col-span-2 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all"
                        >
                          Confirm Drop-off (Delivered + ₹3 Cashback)
                        </button>
                      )}

                      {isDelivered && (
                        <div className="col-span-2 py-2 text-center text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 rounded-2xl">
                          ✓ Order Completed & Settled
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>
      )}

      {/* Runner Assignment Modal */}
      {selectedOrderForRunner && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedOrderForRunner(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-white">Assign Campus Runner</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Dispatching {selectedOrderForRunner.order_token} to {selectedOrderForRunner.location_name} campus.
            </p>

            <form onSubmit={handleAssignRunnerSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Runner Full Name</label>
                <input
                  type="text"
                  required
                  value={runnerName}
                  onChange={(e) => setRunnerName(e.target.value)}
                  placeholder="e.g. Vikas Yadav"
                  className="w-full bg-[#1F2937] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Runner Mobile Phone</label>
                <input
                  type="tel"
                  required
                  value={runnerPhone}
                  onChange={(e) => setRunnerPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full bg-[#1F2937] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
                />
              </div>

              <button
                type="submit"
                disabled={loadingAction}
                className="w-full mt-4 py-3 rounded-2xl bg-[#FF5722] hover:bg-[#F4511E] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Dispatch Runner</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
