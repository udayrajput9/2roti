import React, { useState, useEffect } from 'react';
import { 
  User, 
  Wallet as WalletIcon, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  LogOut, 
  ChevronRight, 
  Award, 
  ShieldCheck, 
  ArrowDownLeft, 
  ArrowUpRight, 
  CheckCircle2, 
  Sparkles, 
  RefreshCw, 
  Zap, 
  Copy, 
  Check, 
  Edit3, 
  Repeat, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  ShoppingBag, 
  Truck, 
  AlertCircle,
  X,
  MessageCircle,
  Flame,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { CashbackCoinIcon } from '../components/FoodIcons';

export default function ProfilePage({ 
  onOpenAuth, 
  locations = [], 
  activeLocation, 
  onSelectLocation, 
  onNavigateToTab, 
  onOpenCart 
}) {
  const { user, isAuthenticated, logout, refreshUser, updateProfile } = useAuth();
  const { addToCart } = useCart();

  const [activeTab, setActiveTab] = useState('ORDERS'); // ORDERS | WALLET | ADDRESS | HELP
  const [orderFilter, setOrderFilter] = useState('ALL'); // ALL | ACTIVE | DELIVERED | CANCELLED
  const [walletFilter, setWalletFilter] = useState('ALL'); // ALL | CREDIT | DEBIT

  const [orders, setOrders] = useState([]);
  const [walletData, setWalletData] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingWallet, setLoadingWallet] = useState(false);

  // Modals & UI States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [expandedReceiptId, setExpandedReceiptId] = useState(null);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // Form State for Edit Profile
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editLocationId, setEditLocationId] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editError, setEditError] = useState('');

  // Toast System
  const [toastMessage, setToastMessage] = useState(null);
  const [copiedToken, setCopiedToken] = useState(null);

  const showToast = (text, type = 'info', action = null) => {
    setToastMessage({ text, type, action });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      fetchWallet();
      if (user) {
        setEditName(user.name || '');
        setEditEmail(user.email || '');
        setEditLocationId(user.default_location_id || (locations[0]?.id || ''));
      }
    }
  }, [isAuthenticated, user]);

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const res = await fetch('/api/orders/my-orders');
      if (res.ok) {
        const data = await res.json();
        if (data.success) setOrders(data.orders || []);
      }
    } catch (e) {
      console.error('Fetch orders error:', e);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchWallet = async () => {
    try {
      setLoadingWallet(true);
      const res = await fetch('/api/wallet/my-wallet');
      if (res.ok) {
        const data = await res.json();
        if (data.success) setWalletData(data);
      }
    } catch (e) {
      console.error('Fetch wallet error:', e);
    } finally {
      setLoadingWallet(false);
    }
  };

  const handleCopyToken = (token) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(token);
    }
    setCopiedToken(token);
    showToast(`Order Token ${token} copied to clipboard!`, 'success');
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleReorder = (order) => {
    if (!order.items || order.items.length === 0) return;
    
    let addedCount = 0;
    order.items.forEach(item => {
      addToCart({
        id: item.menu_item_id || item.id,
        name: item.item_name,
        customer_price: parseFloat(item.customer_price),
        is_veg: item.is_veg !== undefined ? item.is_veg : true
      });
      addedCount += (item.quantity || 1);
    });

    showToast(
      `Added ${order.items.length} item(s) from ${order.order_token} to cart!`,
      'success',
      {
        label: 'View Cart',
        onClick: () => {
          if (onOpenCart) onOpenCart();
        }
      }
    );
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      setEditError('Please enter your full name.');
      return;
    }
    if (!editLocationId) {
      setEditError('Please choose your campus location.');
      return;
    }

    try {
      setIsSavingProfile(true);
      setEditError('');
      await updateProfile({
        name: editName.trim(),
        email: editEmail ? editEmail.trim() : null,
        location_id: parseInt(editLocationId)
      });
      
      const matchedLoc = locations.find(l => l.id === parseInt(editLocationId));
      if (matchedLoc && onSelectLocation) {
        onSelectLocation(matchedLoc);
      }

      setIsEditModalOpen(false);
      showToast('Profile updated successfully!', 'success');
      refreshUser();
    } catch (err) {
      setEditError(err.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="pb-28 pt-12 px-4 max-w-md mx-auto text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-[#FF5722] shadow-[0_12px_32px_rgba(255,87,34,0.15)] relative">
          <User className="w-10 h-10" />
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Login to Your Campus Profile</h2>
          <p className="text-xs text-neutral-400 mt-2 max-w-sm mx-auto leading-relaxed">
            Track hot meals delivered to your hostel gate, unlock ₹3 instant cashback on every meal, and repeat your favorite orders with 1 tap.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="p-3.5 rounded-2xl bg-[#141414] border border-neutral-800 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-400">
              <Zap className="w-3.5 h-3.5" />
              <span>₹3 Cashback</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-tight">Every delivery automatically credits loyalty points.</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#141414] border border-neutral-800 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400">
              <Truck className="w-3.5 h-3.5" />
              <span>Live Tracking</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-tight">Watch your food go from kitchen to campus gate.</p>
          </div>
        </div>

        <button
          onClick={onOpenAuth}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white font-black text-xs uppercase tracking-wider shadow-[0_8px_24px_rgba(255,87,34,0.4)] active:scale-95 hover:brightness-110 transition-all flex items-center justify-center gap-2"
        >
          <Phone className="w-4 h-4" />
          <span>Login with Mobile Number</span>
        </button>
      </div>
    );
  }

  const walletBalance = parseFloat(user?.wallet_balance || walletData?.wallet_balance || 0);
  const milestoneTarget = 50.00;
  const milestonePercent = Math.min(100, (walletBalance / milestoneTarget) * 100);
  const amountNeeded = Math.max(0, milestoneTarget - walletBalance);

  // Filtered Orders
  const filteredOrders = orders.filter(order => {
    if (orderFilter === 'ALL') return true;
    if (orderFilter === 'ACTIVE') {
      return ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(order.order_status);
    }
    if (orderFilter === 'DELIVERED') return order.order_status === 'DELIVERED';
    if (orderFilter === 'CANCELLED') return ['CANCELLED', 'REFUNDED'].includes(order.order_status);
    return true;
  });

  // Filtered Transactions
  const rawTransactions = walletData?.transactions || [];
  const filteredTransactions = rawTransactions.filter(tx => {
    if (walletFilter === 'ALL') return true;
    if (walletFilter === 'CREDIT') return tx.type === 'CREDIT' || tx.type === 'cashback_credit' || tx.type === 'order_refund_credit';
    if (walletFilter === 'DEBIT') return tx.type === 'DEBIT' || tx.type === 'order_debit' || tx.type === 'cashback_reversal';
    return true;
  });

  // Campus location helper
  const userCampusName = user?.location_name || locations.find(l => l.id === user?.default_location_id)?.name || 'Campus Drop Point';

  return (
    <div className="pb-28 md:pb-12 pt-3 px-3 sm:px-4 max-w-4xl mx-auto space-y-4">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[92%] bg-[#1E1E1E] border border-[#FF5722]/60 text-white px-4 py-3 rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.8)] flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2 text-xs font-bold truncate">
            <CheckCircle2 className="w-4 h-4 text-[#FF5722] shrink-0" />
            <span className="truncate">{toastMessage.text}</span>
          </div>
          {toastMessage.action && (
            <button
              onClick={toastMessage.action.onClick}
              className="text-[11px] font-black uppercase text-[#FF7043] hover:text-white bg-[#FF5722]/20 px-2.5 py-1 rounded-xl shrink-0 transition-colors"
            >
              {toastMessage.action.label}
            </button>
          )}
        </div>
      )}

      {/* 1. Enhanced User Header Card */}
      <div className="bg-gradient-to-b from-[#161616] to-[#101010] border border-neutral-800/90 rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#FF5722]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF7043] via-[#FF5722] to-[#BF360C] flex items-center justify-center text-white font-black text-lg shadow-[0_6px_20px_rgba(255,87,34,0.4)] relative shrink-0">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : '2R'}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#161616] flex items-center justify-center text-white" title="Verified Campus Student">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-white leading-tight">
                  {user?.name || 'Campus Student'}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-[10px] font-bold text-neutral-300">
                  Student Member
                </span>
              </div>

              <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400 font-medium flex-wrap">
                <span className="flex items-center gap-1 text-neutral-300">
                  <Phone className="w-3 h-3 text-[#FF5722]" />
                  +91 {user?.phone}
                </span>
                {user?.email && (
                  <span className="flex items-center gap-1 text-neutral-400 hidden sm:flex">
                    <Mail className="w-3 h-3 text-neutral-500" />
                    {user?.email}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF7043] bg-[#FF5722]/10 border border-[#FF5722]/30 px-2 py-0.5 rounded-xl">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>{userCampusName} Drop</span>
                </span>
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-800/80">
            <button
              onClick={() => {
                setEditName(user?.name || '');
                setEditEmail(user?.email || '');
                setEditLocationId(user?.default_location_id || (locations[0]?.id || ''));
                setIsEditModalOpen(true);
              }}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-2xl bg-[#1D1D1D] hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#FF7043]" />
              <span>Edit Profile</span>
            </button>

            <button
              onClick={() => setIsLogoutModalOpen(true)}
              className="p-2.5 rounded-2xl bg-[#1D1D1D] hover:bg-rose-950/40 border border-neutral-700 hover:border-rose-900/60 text-neutral-400 hover:text-rose-400 transition-all active:scale-95 shadow-sm shrink-0"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Metric Bar */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-neutral-800/80">
          <div className="bg-[#181818] border border-neutral-800/80 rounded-2xl p-2.5 text-center">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total Orders</div>
            <div className="text-base sm:text-lg font-black text-white mt-0.5">{orders.length}</div>
          </div>
          <div className="bg-[#181818] border border-neutral-800/80 rounded-2xl p-2.5 text-center">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Wallet Balance</div>
            <div className="text-base sm:text-lg font-black text-[#FF7043] mt-0.5">₹{walletBalance.toFixed(2)}</div>
          </div>
          <div className="bg-[#181818] border border-neutral-800/80 rounded-2xl p-2.5 text-center">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Loyalty Perks</div>
            <div className="text-base sm:text-lg font-black text-amber-400 mt-0.5">₹3 / Order</div>
          </div>
        </div>
      </div>

      {/* 2. Top-Level Tab Navigator */}
      <div className="grid grid-cols-4 gap-1.5 bg-[#121212] p-1.5 rounded-2xl border border-neutral-800 shadow-inner">
        <button
          onClick={() => setActiveTab('ORDERS')}
          className={`py-2 px-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'ORDERS'
              ? 'bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white shadow-[0_4px_12px_rgba(255,87,34,0.35)]'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden xs:inline">Orders</span>
          <span className="text-[10px] opacity-80">({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('WALLET')}
          className={`py-2 px-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'WALLET'
              ? 'bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white shadow-[0_4px_12px_rgba(255,87,34,0.35)]'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
          }`}
        >
          <WalletIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Wallet</span>
        </button>

        <button
          onClick={() => setActiveTab('ADDRESS')}
          className={`py-2 px-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'ADDRESS'
              ? 'bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white shadow-[0_4px_12px_rgba(255,87,34,0.35)]'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden xs:inline">Campus</span>
        </button>

        <button
          onClick={() => setActiveTab('HELP')}
          className={`py-2 px-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'HELP'
              ? 'bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white shadow-[0_4px_12px_rgba(255,87,34,0.35)]'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Help</span>
        </button>
      </div>

      {/* 3. TAB 1: MY ORDERS */}
      {activeTab === 'ORDERS' && (
        <div className="space-y-3.5">
          
          {/* Orders Header & Filter Pills */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 px-1">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: 'ALL', label: 'All Orders' },
                { id: 'ACTIVE', label: 'Live Active' },
                { id: 'DELIVERED', label: 'Delivered' },
                { id: 'CANCELLED', label: 'Cancelled' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setOrderFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                    orderFilter === tab.id
                      ? 'bg-neutral-200 text-neutral-900 shadow-sm'
                      : 'bg-[#181818] text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={fetchOrders}
              className="text-xs font-bold text-[#FF7043] hover:text-white flex items-center gap-1 self-end sm:self-auto transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingOrders ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>
          </div>

          {/* Empty State */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-14 px-4 bg-[#121212] rounded-3xl border border-neutral-800/80 text-neutral-500 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-600">
                <Clock className="w-8 h-8 opacity-40 stroke-1" />
              </div>
              <div>
                <p className="text-sm font-black text-neutral-200">No orders found in this filter.</p>
                <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                  Craving fresh rotis, piping hot curries, or outlet pizzas? Order now!
                </p>
              </div>
              {onNavigateToTab && (
                <button
                  onClick={() => onNavigateToTab('home')}
                  className="px-5 py-2.5 rounded-2xl bg-[#FF5722] hover:bg-[#E64A19] text-white font-black text-xs uppercase tracking-wider shadow-[0_4px_16px_rgba(255,87,34,0.3)] transition-all active:scale-95 inline-flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Browse Full Menu</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredOrders.map((order) => {
                const isDelivered = order.order_status === 'DELIVERED';
                const isCancelled = ['CANCELLED', 'REFUNDED'].includes(order.order_status);
                const isActive = !isDelivered && !isCancelled;
                const isExpanded = expandedReceiptId === order.id;

                // Step status progress logic
                const statusMap = {
                  PLACED: 1,
                  ACCEPTED: 2,
                  PREPARING: 3,
                  READY: 4,
                  OUT_FOR_DELIVERY: 5,
                  DELIVERED: 6
                };
                const currentStep = statusMap[order.order_status] || 1;

                return (
                  <div
                    key={order.id}
                    className={`bg-[#121212] border rounded-3xl p-4 sm:p-5 shadow-lg space-y-3.5 transition-all ${
                      isActive 
                        ? 'border-[#FF5722]/50 shadow-[0_8px_24px_rgba(255,87,34,0.12)]' 
                        : 'border-neutral-800/90'
                    }`}
                  >
                    {/* Top Row: Token, Copy, Date, Status */}
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-neutral-800/80">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleCopyToken(order.order_token)}
                            className="text-xs sm:text-sm font-black text-white hover:text-[#FF7043] flex items-center gap-1 bg-[#181818] px-2 py-0.5 rounded-lg border border-neutral-700 transition-colors group"
                            title="Click to copy Order ID"
                          >
                            <span>{order.order_token}</span>
                            {copiedToken === order.order_token ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-neutral-500 group-hover:text-[#FF7043]" />
                            )}
                          </button>

                          {order.is_outlet_order ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/60 uppercase">
                              🏪 Outlet Pickup
                            </span>
                          ) : (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800/60 uppercase">
                              📍 {order.location_name} Drop
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-neutral-400 font-medium mt-1 block">
                          {new Date(order.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-[11px] font-black px-3 py-1 rounded-xl uppercase tracking-wider flex items-center gap-1.5 shrink-0 ${
                          isDelivered
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                            : isCancelled
                            ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                            : 'bg-[#FF5722]/20 text-[#FF7043] border border-[#FF5722]/50 animate-pulse'
                        }`}
                      >
                        {isActive && <span className="w-2 h-2 rounded-full bg-[#FF5722] animate-ping" />}
                        <span>{order.order_status.replace(/_/g, ' ')}</span>
                      </span>
                    </div>

                    {/* Live Progress Bar Stepper */}
                    {!isCancelled && (
                      <div className="bg-[#181818] border border-neutral-800/80 rounded-2xl p-3 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-neutral-400">
                          <span className={currentStep >= 1 ? 'text-[#FF5722]' : ''}>1. Placed</span>
                          <span className={currentStep >= 3 ? 'text-amber-400' : ''}>2. Kitchen</span>
                          <span className={currentStep >= 5 ? 'text-blue-400' : ''}>3. {order.is_outlet_order ? 'Ready' : 'Dispatched'}</span>
                          <span className={currentStep >= 6 ? 'text-emerald-400' : ''}>4. Completed</span>
                        </div>

                        <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden flex p-0.5">
                          <div
                            className="bg-gradient-to-r from-[#FF5722] via-amber-400 to-emerald-400 h-full rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(255,87,34,0.6)]"
                            style={{
                              width:
                                order.order_status === 'PLACED' ? '20%' :
                                order.order_status === 'ACCEPTED' ? '38%' :
                                order.order_status === 'PREPARING' ? '58%' :
                                order.order_status === 'READY' ? '78%' :
                                order.order_status === 'OUT_FOR_DELIVERY' ? '90%' : '100%'
                            }}
                          />
                        </div>

                        {/* Runner Info Alert if assigned */}
                        {order.assigned_runner_name && !isDelivered && (
                          <div className="mt-2 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 text-blue-300 font-bold">
                              <Truck className="w-3.5 h-3.5 text-blue-400" />
                              <span>Campus Runner: {order.assigned_runner_name}</span>
                            </div>
                            {order.assigned_runner_phone && (
                              <a
                                href={`tel:${order.assigned_runner_phone}`}
                                className="text-[11px] font-black text-white bg-blue-600 hover:bg-blue-500 px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-sm"
                              >
                                <Phone className="w-3 h-3" />
                                <span>Call Runner</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Delivery Address Note (Hostel/Gate) */}
                    {order.delivery_address_note && (
                      <div className="text-[11px] text-neutral-300 bg-[#161616] px-3 py-1.5 rounded-xl border border-neutral-800 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-[#FF5722] shrink-0" />
                        <span className="font-semibold text-neutral-400">Delivery Instructions:</span>
                        <span className="truncate">{order.delivery_address_note}</span>
                      </div>
                    )}

                    {/* Items List */}
                    <div className="py-1 space-y-1.5 text-xs text-neutral-200">
                      {order.items?.map((item) => (
                        <div key={item.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-neutral-800 border border-neutral-700 text-[10px] font-black flex items-center justify-center text-white">
                              {item.quantity}x
                            </span>
                            <span className="font-medium text-neutral-200">{item.item_name}</span>
                          </div>
                          <span className="font-bold text-white">₹{(item.customer_price * item.quantity).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Collapsible Receipt / Breakdown */}
                    {isExpanded && (
                      <div className="pt-2.5 pb-1 border-t border-neutral-800/80 space-y-1.5 text-xs text-neutral-400 animate-in fade-in duration-200">
                        <div className="flex justify-between">
                          <span>Items Subtotal</span>
                          <span>₹{parseFloat(order.total_customer_price || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Delivery Fee</span>
                          <span>
                            {parseFloat(order.delivery_fee || 0) === 0 ? (
                              <strong className="text-emerald-400 uppercase text-[10px]">Free Delivery</strong>
                            ) : (
                              `₹${parseFloat(order.delivery_fee || 0).toFixed(2)}`
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Payment Method</span>
                          <span className="capitalize font-bold text-neutral-300">
                            {order.payment_source === 'razorpay' ? 'Razorpay (Online UPI)' :
                             order.payment_source === 'wallet' ? 'Loyalty Cashback Wallet' : 'Cash at Outlet'}
                          </span>
                        </div>
                        {order.is_cashback_awarded && (
                          <div className="flex justify-between text-amber-400 font-bold">
                            <span className="flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Loyalty Cashback Earned
                            </span>
                            <span>+₹3.00 Credited</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bottom Action Row */}
                    <div className="pt-3 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-2.5">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">Total Amount</span>
                        <span className="text-sm sm:text-base font-black text-white">
                          ₹{(parseFloat(order.total_customer_price || 0) + parseFloat(order.delivery_fee || 0)).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Receipt toggle */}
                        <button
                          onClick={() => setExpandedReceiptId(isExpanded ? null : order.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700 text-[11px] font-bold text-neutral-300 flex items-center gap-1 transition-colors"
                        >
                          <FileText className="w-3 h-3 text-neutral-400" />
                          <span>{isExpanded ? 'Hide Bill' : 'View Bill'}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        {/* Reorder Button */}
                        <button
                          onClick={() => handleReorder(order)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-[0_4px_12px_rgba(255,87,34,0.35)] active:scale-95 transition-all"
                        >
                          <Repeat className="w-3 h-3" />
                          <span>Re-order</span>
                        </button>

                        {/* Order Help via WhatsApp */}
                        <a
                          href={`https://wa.me/919999999999?text=${encodeURIComponent(`Hi 2 Roti Support, I need help with my Order Token ${order.order_token}`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 hover:text-white transition-colors"
                          title="WhatsApp Help for this Order"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. TAB 2: LOYALTY WALLET & CASHBACK LEDGER */}
      {activeTab === 'WALLET' && (
        <div className="space-y-4">
          
          {/* Main Gold Card */}
          <div className="bg-gradient-to-br from-[#1F150E] via-[#16120E] to-[#120F0D] border border-[#FF5722]/60 rounded-3xl p-5 shadow-[0_12px_36px_rgba(255,87,34,0.22)] relative overflow-hidden">
            {/* Background sparkle & circles */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF5722]/15 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 uppercase tracking-wider">
                  <Award className="w-4 h-4" />
                  <span>2 Roti Loyalty Wallet</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-white mt-1.5 flex items-baseline gap-1">
                  <span>₹{walletBalance.toFixed(2)}</span>
                  <span className="text-xs text-neutral-400 font-bold">Total Available</span>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-[#FF5722]/20 border border-[#FF5722]/40 text-[#FF7043] text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>₹3 Cashback / Order</span>
              </span>
            </div>

            {/* Gamified Milestone Progress Bar */}
            <div className="mt-4 pt-3.5 border-t border-neutral-800/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-neutral-300 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-[#FF5722]" />
                  <span>₹50 Free Food Redemption Milestone</span>
                </span>
                <span className="text-amber-400 font-black">{milestonePercent.toFixed(0)}%</span>
              </div>

              <div className="w-full bg-neutral-900 h-2.5 rounded-full overflow-hidden p-0.5 border border-neutral-800 flex">
                <div
                  className="bg-gradient-to-r from-amber-500 via-[#FF7043] to-[#FF5722] h-full rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(255,87,34,0.6)]"
                  style={{ width: `${milestonePercent}%` }}
                />
              </div>

              <p className="text-[11px] text-neutral-400 leading-relaxed font-medium">
                {walletBalance >= 50.00 ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Congratulations! You can pay 100% of your meal total with this wallet balance!
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 mt-1">
                    <CashbackCoinIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>Earn ₹{amountNeeded.toFixed(2)} more cashback to unlock <strong>100% Free Food Redemption</strong> on your next meal!</span>
                  </span>
                )}
              </p>
            </div>

            {/* Quick student info box */}
            <div className="mt-3 bg-[#130E0A]/90 border border-amber-900/30 rounded-2xl p-3 text-[11px] text-amber-200/90 leading-relaxed flex items-start gap-2">
              <CashbackCoinIcon className="w-4 h-4 shrink-0 mt-0.5" />
              <span><strong>How Student Cashback works:</strong> Every time your meal is delivered to your hostel gate, ₹3 is automatically added to your wallet. You can redeem it 100% on any food order once your wallet reaches ₹50!</span>
            </div>
          </div>

          {/* Wallet Ledger Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-black uppercase tracking-wider text-neutral-400">
                Wallet Activity & Passbook
              </h2>

              {/* Filter Pills */}
              <div className="flex items-center gap-1">
                {[
                  { id: 'ALL', label: 'All' },
                  { id: 'CREDIT', label: 'Credits (+)' },
                  { id: 'DEBIT', label: 'Spends (-)' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setWalletFilter(f.id)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                      walletFilter === f.id
                        ? 'bg-neutral-200 text-neutral-900'
                        : 'bg-[#181818] text-neutral-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12 bg-[#121212] rounded-3xl border border-neutral-800/80 text-neutral-500">
                <WalletIcon className="w-10 h-10 mx-auto mb-2 opacity-30 stroke-1" />
                <p className="text-xs font-bold text-neutral-300">No transactions found in this ledger.</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">Order now to receive ₹3 cashback per delivery!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map((tx) => {
                  const isCredit = tx.type === 'CREDIT' || tx.type === 'cashback_credit' || tx.type === 'order_refund_credit';
                  return (
                    <div
                      key={tx.id}
                      className="bg-[#121212] border border-neutral-800/90 rounded-2xl p-3.5 flex items-center justify-between shadow-sm hover:border-neutral-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl shrink-0 ${isCredit ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'}`}>
                          {isCredit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="text-xs font-black text-white">
                            {tx.note || tx.description || (isCredit ? 'Order Delivery Cashback' : 'Redeemed on Food Order')}
                          </div>
                          <span className="text-[10px] text-neutral-500 font-medium">
                            {new Date(tx.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-xs sm:text-sm font-black ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isCredit ? '+' : '-'}₹{parseFloat(tx.amount).toFixed(2)}
                        </div>
                        {tx.balance_after !== undefined && (
                          <span className="text-[9px] text-neutral-500 font-medium">
                            Bal: ₹{parseFloat(tx.balance_after).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* 5. TAB 3: CAMPUS DELIVERY & ADDRESSES */}
      {activeTab === 'ADDRESS' && (
        <div className="space-y-4">
          <div className="bg-[#121212] border border-neutral-800/90 rounded-3xl p-5 shadow-lg space-y-4">
            <div>
              <h2 className="text-sm font-black text-white">Your Campus Delivery Destination</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Our runners deliver directly to your selected campus drop gate.
              </p>
            </div>

            {/* Current Active Location Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FF5722]/15 to-[#FF7043]/5 border border-[#FF5722]/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF5722] flex items-center justify-center text-white shadow-md">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-white">{userCampusName} Campus</div>
                  <div className="text-[11px] text-[#FF7043] font-bold">Primary Delivery Drop Point</div>
                </div>
              </div>

              <button
                onClick={() => {
                  setEditName(user?.name || '');
                  setEditEmail(user?.email || '');
                  setEditLocationId(user?.default_location_id || (locations[0]?.id || ''));
                  setIsEditModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#1F1F1F] hover:bg-neutral-700 text-xs font-bold text-white border border-neutral-600 transition-colors"
              >
                Change
              </button>
            </div>

            {/* Campus Selection Grid */}
            <div>
              <label className="text-xs font-bold text-neutral-300 mb-2 block">
                Quick Switch Campus Location:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {locations.map((loc) => {
                  const isCurrent = user?.default_location_id === loc.id;
                  return (
                    <button
                      key={loc.id}
                      onClick={async () => {
                        try {
                          await updateProfile({
                            name: user?.name || 'Student',
                            email: user?.email,
                            location_id: loc.id
                          });
                          if (onSelectLocation) onSelectLocation(loc);
                          showToast(`Campus switched to ${loc.name}!`, 'success');
                          refreshUser();
                        } catch (e) {
                          showToast('Failed to switch campus location', 'error');
                        }
                      }}
                      className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all ${
                        isCurrent
                          ? 'bg-[#FF5722]/20 border-[#FF5722] text-white shadow-[0_4px_16px_rgba(255,87,34,0.25)]'
                          : 'bg-[#181818] border-neutral-800 hover:border-neutral-600 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black">{loc.name}</span>
                        {isCurrent && <CheckCircle2 className="w-4 h-4 text-[#FF5722]" />}
                      </div>
                      <span className="text-[10px] text-neutral-400">
                        {loc.name === 'Jhungiya' ? 'Dine-in / Pickup Counter' : 'Hostel Gate Delivery'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Delivery Tips Info */}
            <div className="p-3.5 rounded-2xl bg-[#181818] border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
              <strong className="text-neutral-200 block">📦 Delivery Protocol:</strong>
              <p>• For Buddha, KIPM & ITM campuses, runners deliver right to the main hostel gate entrance.</p>
              <p>• Keep your phone active so our delivery runner can call you upon arrival.</p>
              <p>• Orders above ₹100 qualify for 100% Free Campus Delivery.</p>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 4: HELP & CAMPUS FAQS */}
      {activeTab === 'HELP' && (
        <div className="space-y-4">
          
          {/* Support Channels Card */}
          <div className="bg-[#121212] border border-neutral-800/90 rounded-3xl p-5 shadow-lg space-y-4">
            <div>
              <h2 className="text-sm font-black text-white">Need Help with your Meal or Account?</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Our campus coordinator team is ready to assist you live.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* WhatsApp Helpline */}
              <a
                href="https://wa.me/919999999999?text=Hi%202%20Roti%20Support%2C%20I%20need%20assistance"
                target="_blank"
                rel="noreferrer"
                className="p-4 rounded-2xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/80 flex items-center justify-between text-emerald-300 transition-all group active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">WhatsApp Live Chat</div>
                    <div className="text-[10px] text-emerald-400 font-bold">Fastest Response (2-5 min)</div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
              </a>

              {/* Call Support */}
              <a
                href="tel:919999999999"
                className="p-4 rounded-2xl bg-[#1A1A1A] hover:bg-neutral-800 border border-neutral-700 flex items-center justify-between text-neutral-300 transition-all group active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF5722] flex items-center justify-center text-white shadow-md">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">Call Campus Coordinator</div>
                    <div className="text-[10px] text-neutral-400 font-bold">11:00 AM - 11:30 PM</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>
          </div>

          {/* Interactive FAQs Accordion */}
          <div className="bg-[#121212] border border-neutral-800/90 rounded-3xl p-5 shadow-lg space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400">
              Frequently Asked Questions (FAQs)
            </h3>

            <div className="space-y-2">
              {[
                {
                  q: "How does the ₹3 cashback per order work?",
                  a: "Every time you order with online payment (Razorpay / UPI), ₹3 is automatically credited to your 2 Roti Loyalty Wallet as soon as the order is marked Delivered. Once your wallet reaches ₹50, you can use 100% of it to get completely free meals!"
                },
                {
                  q: "When do I get Free Campus Delivery?",
                  a: "All campus orders of ₹100 and above get 100% Free Campus Delivery to Buddha, KIPM, and ITM gates. For orders below ₹100, a small ₹15 campus runner delivery charge applies."
                },
                {
                  q: "How does Outlet Pickup work at Jhungiya?",
                  a: "You can place an outlet pickup order in advance. Outlet items (like Outlet Special Pizzas and Biryanis) have zero delivery fees and can be collected hot and fresh at our Jhungiya counter."
                },
                {
                  q: "What if my delivery is delayed?",
                  a: "You can track the live status on this profile page. If your runner is on the way, their phone number is displayed on your active order card so you can call them directly, or chat with us on WhatsApp."
                },
                {
                  q: "Are Veg and Non-Veg items prepared separately?",
                  a: "Yes! 2 Roti maintains strict separate kitchen workstations and utensils for all pure vegetarian dishes and non-veg curries/biryanis."
                }
              ].map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="border border-neutral-800 rounded-2xl overflow-hidden bg-[#161616] transition-colors"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full p-3.5 text-left text-xs font-bold text-white flex items-center justify-between gap-2 hover:bg-neutral-800/50 transition-colors"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-[#FF7043] shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-500 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="p-3.5 pt-0 text-[11px] text-neutral-400 leading-relaxed border-t border-neutral-800/60 animate-in fade-in duration-150">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* 7. EDIT PROFILE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161616] border border-neutral-700/90 rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-[#FF5722]/20 border border-[#FF5722]/40 text-[#FF5722] flex items-center justify-center mx-auto mb-2.5">
                <Edit3 className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-black text-white">Update Profile Details</h2>
              <p className="text-xs text-neutral-400 mt-0.5">Edit your name, email and preferred campus drop.</p>
            </div>

            {editError && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#FF5722]" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-[#1F1F1F] border border-neutral-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF5722] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#FF5722]" />
                  <span>Email Address (Optional)</span>
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="e.g. rahul@student.ac.in"
                  className="w-full bg-[#1F1F1F] border border-neutral-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF5722] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#FF5722]" />
                  <span>Default Delivery Campus</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {locations.map((loc) => {
                    const isSelected = parseInt(editLocationId) === loc.id;
                    return (
                      <button
                        type="button"
                        key={loc.id}
                        onClick={() => setEditLocationId(loc.id)}
                        className={`p-2.5 rounded-2xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-[#FF5722] text-white border-[#FF5722] shadow-[0_4px_12px_rgba(255,87,34,0.35)]'
                            : 'bg-[#1F1F1F] text-neutral-300 border-neutral-700 hover:border-neutral-500'
                        }`}
                      >
                        <span>{loc.name}</span>
                        <span className="text-[9px] opacity-80 font-normal">Campus Drop</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full mt-4 py-3 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white font-black text-xs uppercase tracking-wider shadow-[0_8px_24px_rgba(255,87,34,0.4)] active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isSavingProfile ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 8. LOGOUT CONFIRMATION MODAL */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161616] border border-neutral-700/90 rounded-3xl max-w-xs w-full p-5 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-400 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-white">Log out of 2 Roti?</h3>
              <p className="text-xs text-neutral-400 mt-1">
                You can log back in anytime with your mobile number.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="py-2.5 rounded-2xl bg-[#222] hover:bg-neutral-800 text-neutral-300 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  logout();
                }}
                className="py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider transition-colors shadow-md"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
