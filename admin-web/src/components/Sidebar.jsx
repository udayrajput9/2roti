import React, { useState } from 'react';
import {
  LayoutDashboard,
  BellRing,
  Wallet,
  Users,
  CreditCard,
  RotateCcw,
  Utensils,
  MapPin,
  Settings,
  ShieldCheck,
  Lock,
  LogOut,
  Menu,
  X,
  Radio,
  ChevronDown,
  ChevronRight,
  Clock,
  Flame,
  CheckCircle2,
  PackageCheck,
  ListOrdered,
  Sparkles
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useLiveOrders } from '../context/LiveOrderContext';

export default function Sidebar({ activeTab, onSelectTab }) {
  const { staff, logout, isSuperAdmin, isOrderManager, isVendor } = useAdminAuth();
  const { orders, connected } = useLiveOrders();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [kitchenExpanded, setKitchenExpanded] = useState(true);

  // Active placed/in-prep orders count for main badge
  const activeCount = orders.filter(
    o => o.order_status !== 'DELIVERED' && o.order_status !== 'CANCELLED' && o.order_status !== 'REFUNDED'
  ).length;

  // Individual stage counts
  const placedCount = orders.filter(o => o.order_status === 'PLACED').length;
  const preparingCount = orders.filter(o => o.order_status === 'PREPARING' || o.order_status === 'ACCEPTED').length;
  const readyCount = orders.filter(o => o.order_status === 'READY' || o.order_status === 'OUT_FOR_DELIVERY').length;
  const deliveredCount = orders.filter(o => o.order_status === 'DELIVERED').length;
  const allCount = orders.length;

  const isLiveKitchenActive = activeTab === 'live_orders' || activeTab?.startsWith('live_orders_');

  const kitchenSubItems = [
    {
      id: 'live_orders_active',
      label: 'Active Kitchen (Live)',
      icon: Sparkles,
      count: activeCount,
      color: 'text-[#FF5722]',
      badgeClass: 'bg-orange-950/80 text-orange-400 border border-orange-800'
    },
    {
      id: 'live_orders_placed',
      label: 'New Placed',
      icon: Clock,
      count: placedCount,
      pulse: placedCount > 0,
      color: 'text-red-400',
      badgeClass: 'bg-red-500 text-white font-black'
    },
    {
      id: 'live_orders_preparing',
      label: 'In Kitchen (Cooking)',
      icon: Flame,
      count: preparingCount,
      color: 'text-amber-400',
      badgeClass: 'bg-amber-950/80 text-amber-300 border border-amber-800'
    },
    {
      id: 'live_orders_ready',
      label: 'Ready / Dispatched',
      icon: PackageCheck,
      count: readyCount,
      color: 'text-emerald-400',
      badgeClass: 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
    },
    {
      id: 'live_orders_delivered',
      label: 'Delivered Orders',
      icon: CheckCircle2,
      count: deliveredCount,
      color: 'text-slate-400',
      badgeClass: 'bg-slate-800 text-slate-300 border border-slate-700'
    },
    {
      id: 'live_orders_all',
      label: 'All Orders Ledger',
      icon: ListOrdered,
      count: allCount,
      color: 'text-slate-400',
      badgeClass: 'bg-slate-800 text-slate-400 border border-slate-700'
    }
  ];

  const navItems = [
    {
      id: 'dashboard',
      label: 'ERP Dashboard',
      icon: LayoutDashboard,
      roles: ['SUPER_ADMIN']
    },
    {
      id: 'live_orders',
      label: 'Live Kitchen Orders',
      icon: BellRing,
      roles: ['SUPER_ADMIN', 'ORDER_MANAGER', 'VENDOR'],
      badge: activeCount > 0 ? activeCount : null,
      highlight: true
    },
    {
      id: 'menu_management',
      label: 'Menu & Inventory',
      icon: Utensils,
      roles: ['SUPER_ADMIN', 'ORDER_MANAGER']
    },
    {
      id: 'locations',
      label: 'Campus Drop Points',
      icon: MapPin,
      roles: ['SUPER_ADMIN', 'ORDER_MANAGER']
    },
    {
      id: 'customers',
      label: 'Customer Directory',
      icon: Users,
      roles: ['SUPER_ADMIN', 'ORDER_MANAGER']
    },
    {
      id: 'vendor_portal',
      label: isVendor ? 'My Outlet Wallet & Orders' : 'Vendor Settlements & Wallets',
      icon: Wallet,
      roles: ['SUPER_ADMIN', 'VENDOR']
    },
    {
      id: 'payments',
      label: 'Razorpay & Webhooks',
      icon: CreditCard,
      roles: ['SUPER_ADMIN']
    },
    {
      id: 'refunds',
      label: 'Refund Management',
      icon: RotateCcw,
      roles: ['SUPER_ADMIN']
    },
    {
      id: 'rbac',
      label: 'Staff & Roles (RBAC)',
      icon: Lock,
      roles: ['SUPER_ADMIN']
    },
    {
      id: 'security',
      label: 'Security & Anti-Bot',
      icon: ShieldCheck,
      roles: ['SUPER_ADMIN']
    },
    {
      id: 'settings',
      label: 'System & Controls',
      icon: Settings,
      roles: ['SUPER_ADMIN']
    }
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(staff?.role));

  const roleColor =
    staff?.role === 'SUPER_ADMIN'
      ? 'bg-purple-950 text-purple-300 border-purple-800'
      : staff?.role === 'ORDER_MANAGER'
      ? 'bg-blue-950 text-blue-300 border-blue-800'
      : 'bg-emerald-950 text-emerald-300 border-emerald-800';

  return (
    <>
      {/* Mobile Top Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-[#111827] border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF7043] to-[#BF360C] flex items-center justify-center font-black text-white text-sm">
            2R
          </div>
          <div>
            <h1 className="text-xs font-black text-white">2 ROTI ERP</h1>
            <span className="text-[10px] text-slate-400 font-semibold">{staff?.role}</span>
          </div>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#111827] border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF7043] to-[#BF360C] flex items-center justify-center font-black text-white text-lg shadow-[0_4px_16px_rgba(255,87,34,0.4)]">
                2R
              </div>
              <div>
                <h1 className="text-sm font-black text-white tracking-wide flex items-center gap-1.5">
                  <span>2 ROTI ERP</span>
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-ping' : 'bg-red-500'}`} />
                  <span className="text-[10px] text-slate-400 font-medium">
                    {connected ? 'Realtime Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>

            {/* User Profile Card */}
            <div className="mt-4 p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="text-xs font-bold text-white truncate">{staff?.name}</div>
              <div className="text-[11px] text-slate-400 truncate">{staff?.email}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${roleColor}`}>
                  {staff?.role.replace(/_/g, ' ')}
                </span>
                {staff?.outlet_name && (
                  <span className="text-[10px] text-orange-400 font-bold truncate max-w-[90px]">
                    📍 {staff.outlet_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-280px)]">
            {filteredNav.map((item) => {
              const Icon = item.icon;
              const isLive = item.id === 'live_orders';
              const isActive = isLive ? isLiveKitchenActive : activeTab === item.id;
              return (
                <div key={item.id} className="space-y-0.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        if (isLive) {
                          onSelectTab('live_orders_active');
                          setKitchenExpanded(true);
                        } else {
                          onSelectTab(item.id);
                        }
                        setMobileOpen(false);
                      }}
                      className={`flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-[#FF5722] to-[#F4511E] text-white shadow-[0_4px_16px_rgba(255,87,34,0.35)]'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-[10px] font-black animate-pulse">
                          {item.badge}
                        </span>
                      )}
                    </button>

                    {/* Expand/Collapse Chevron for Live Kitchen */}
                    {isLive && (
                      <button
                        onClick={() => setKitchenExpanded(!kitchenExpanded)}
                        className={`p-2 rounded-xl transition-colors ${
                          isActive
                            ? 'text-white hover:bg-white/10'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'
                        }`}
                        title={kitchenExpanded ? 'Collapse Stage Tabs' : 'Expand Stage Tabs'}
                      >
                        {kitchenExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Live Kitchen Sub-Tabs Pointed in Left Navigation */}
                  {isLive && (kitchenExpanded || isLiveKitchenActive) && (
                    <div className="ml-3 pl-3 border-l-2 border-slate-800/80 my-1 space-y-0.5">
                      {kitchenSubItems.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive =
                          activeTab === sub.id ||
                          (sub.id === 'live_orders_active' && activeTab === 'live_orders');
                        return (
                          <button
                            key={sub.id}
                            onClick={() => {
                              onSelectTab(sub.id);
                              setMobileOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                              isSubActive
                                ? 'bg-[#FF5722]/20 border border-[#FF5722]/50 text-[#FF5722] font-black shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <SubIcon
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  isSubActive ? 'text-[#FF5722]' : sub.color
                                }`}
                              />
                              <span className="truncate">{sub.label}</span>
                            </div>

                            {sub.count > 0 && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                                  sub.badgeClass
                                } ${sub.pulse ? 'animate-pulse' : ''}`}
                              >
                                {sub.count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Footer Logout */}
        <div className="p-4 border-t border-slate-800/80">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-slate-900 hover:bg-red-950/60 border border-slate-800 hover:border-red-800 text-slate-400 hover:text-red-300 text-xs font-bold transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}
    </>
  );
}
