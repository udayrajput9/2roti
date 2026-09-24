import React, { useState, useEffect } from 'react';
import {
  MapPin,
  ShoppingBag,
  ChevronDown,
  User as UserIcon,
  Home,
  Search,
  Store,
  Sparkles,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Header({
  onOpenCart,
  onOpenAuth,
  onSelectLocation,
  locations = [],
  activeLocation,
  activeTab,
  onChangeTab
}) {
  const { user, isAuthenticated } = useAuth();
  const { totalCount, itemsTotal } = useCart();
  const [showLocPicker, setShowLocPicker] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('#campus-location-picker')) {
        setShowLocPicker(false);
      }
    };
    if (showLocPicker) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showLocPicker]);

  const displayName = user?.name ? user.name.split(' ')[0] : (isAuthenticated ? 'Student' : 'Sign In');
  const displayLocation = activeLocation?.name || user?.location_name || 'Select Campus';

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'outlet', label: 'Outlet', icon: Store, badge: 'Pickup' },
    { id: 'profile', label: 'Profile', icon: UserIcon }
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-neutral-800/80 px-3 sm:px-6 py-3 transition-all">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        
        {/* Left: Official Brand Logo & Location Selector */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => onChangeTab && onChangeTab('home')}
            className="cursor-pointer flex items-center gap-2.5 group"
          >
            <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(255,87,34,0.35)] border border-[#FF5722]/40 group-hover:scale-105 transition-transform duration-300">
              <img
                src="/logos/app_icon_light.jpg"
                alt="2 Roti Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden w-full h-full bg-gradient-to-br from-[#FF5722] to-[#BF360C] items-center justify-center font-black text-white text-sm">
                2R
              </div>
            </div>

            <div className="hidden sm:block">
              <div className="text-base font-black tracking-tight text-white flex items-center gap-1 leading-none">
                <span className="text-[#FF5722]">2</span> ROTI
              </div>
              <p className="text-[10px] text-neutral-400 font-semibold tracking-wider uppercase mt-0.5">
                Fresh & Hot
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-neutral-800 hidden sm:block" />

          {/* Campus Location Dropdown */}
          <div id="campus-location-picker" className="relative">
            <div className="text-[10px] text-neutral-400 font-medium truncate max-w-[120px] sm:max-w-[150px] leading-tight flex items-center gap-1">
              <span>Deliver to</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowLocPicker(!showLocPicker);
              }}
              className="flex items-center gap-1 text-xs font-black text-[#FF7043] hover:text-[#FF5722] transition-colors focus:outline-none group mt-0.5"
            >
              <MapPin className="w-3.5 h-3.5 shrink-0 text-[#FF5722] group-hover:scale-110 transition-transform" />
              <span className="truncate max-w-[105px] sm:max-w-[140px] font-bold text-white group-hover:text-[#FF7043] transition-colors">
                {displayLocation}
              </span>
              <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform duration-200 ${showLocPicker ? 'rotate-180 text-[#FF5722]' : ''}`} />
            </button>

            {/* Campus Picker Dropdown Menu */}
            {showLocPicker && (
              <div className="absolute left-0 top-full mt-2.5 w-64 bg-[#141414] border border-neutral-700/80 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.8)] p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-800/80 mb-1.5">
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">
                    Select Campus Drop Point
                  </span>
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/40">
                    Active
                  </span>
                </div>
                <div className="space-y-1">
                  {locations.map((loc) => {
                    const isSelected = activeLocation?.id === loc.id;
                    return (
                      <button
                        key={loc.id}
                        onClick={() => {
                          onSelectLocation(loc);
                          setShowLocPicker(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white shadow-[0_4px_12px_rgba(255,87,34,0.35)]'
                            : 'text-neutral-300 hover:bg-neutral-800/80 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-neutral-500'}`} />
                          <span>{loc.name}</span>
                        </div>
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                        ) : (
                          <span className="text-[10px] font-normal text-neutral-500">Hostel Gate</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Desktop Navigation Bar Pills */}
        {onChangeTab && (
          <nav className="hidden md:flex items-center bg-[#141414] border border-neutral-800/90 rounded-full p-1 shadow-inner">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onChangeTab(item.id)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all relative ${
                    isActive
                      ? 'bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white shadow-[0_4px_16px_rgba(255,87,34,0.35)] ring-1 ring-[#FF5722]'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded-full font-bold ml-0.5">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* Right: Auth Button + Cart Button */}
        <div className="flex items-center gap-2">
          {!isAuthenticated ? (
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-1.5 rounded-full bg-[#181818] hover:bg-neutral-800 border border-neutral-700/80 text-xs font-bold text-neutral-200 hover:text-white flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <UserIcon className="w-3.5 h-3.5 text-[#FF5722]" />
              <span>Login</span>
            </button>
          ) : (
            <button
              onClick={() => onChangeTab && onChangeTab('profile')}
              className="px-3 py-1.5 rounded-full bg-[#161616] hover:bg-neutral-800 border border-neutral-700/70 text-xs font-bold text-neutral-200 hover:text-white flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <div className="w-5 h-5 rounded-full bg-[#FF5722] text-white text-[10px] font-black flex items-center justify-center">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
              <span className="hidden sm:inline font-semibold">{displayName}</span>
            </button>
          )}

          {/* Cart Icon & Live Counter */}
          <button
            onClick={onOpenCart}
            className="relative px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#FF5722] to-[#E64A19] hover:from-[#F4511E] hover:to-[#D84315] text-white font-black text-xs flex items-center gap-2 shadow-[0_4px_18px_rgba(255,87,34,0.35)] active:scale-95 transition-all group"
          >
            <ShoppingBag className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            <span className="tracking-tight">Cart</span>
            {totalCount > 0 ? (
              <span className="bg-white text-[#BF360C] font-black text-[10px] px-1.5 min-w-[1.2rem] h-4 rounded-full flex items-center justify-center shadow-sm">
                {totalCount}
              </span>
            ) : null}
          </button>
        </div>

      </div>
    </header>
  );
}
