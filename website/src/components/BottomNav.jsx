import React from 'react';
import { NavHomeIcon, NavSearchIcon, NavOutletIcon, NavProfileIcon } from './FoodIcons';

export default function BottomNav({ activeTab, onChangeTab }) {
  const navItems = [
    { id: 'home', label: 'Home', icon: NavHomeIcon },
    { id: 'search', label: 'Search', icon: NavSearchIcon },
    { id: 'outlet', label: 'Outlet', icon: NavOutletIcon, badge: 'Proximity' },
    { id: 'profile', label: 'Profile', icon: NavProfileIcon }
  ];

  return (
    <nav className="fixed bottom-3 inset-x-0 z-40 px-4 pointer-events-none flex justify-center md:hidden">
      <div className="pointer-events-auto bg-[#121212]/95 backdrop-blur-2xl border border-neutral-700/60 rounded-full px-5 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_20px_rgba(255,87,34,0.18)] flex items-center justify-around gap-6 max-w-md w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 transition-all ${
                isActive
                  ? 'text-[#FF5722] font-black scale-105'
                  : 'text-neutral-400 hover:text-neutral-200 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,87,34,0.5)]' : ''}`} active={isActive} />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-[#FF5722] ring-2 ring-[#121212] animate-pulse" />
                )}
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight transition-colors ${isActive ? 'text-white font-bold' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF5722] mt-0.5 shadow-[0_0_8px_#FF5722]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
