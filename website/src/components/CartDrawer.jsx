import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, MapPin, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { FoodClassBadge, RotiBreadIcon, CashbackCoinIcon } from './FoodIcons';

const RECOMMENDED_ADDONS = [
  {
    id: 16,
    name: 'Tandoori roti',
    displayName: 'Tandoori Roti',
    customer_price: 8,
    vendor_cost: 7,
    category: 'Breads',
    is_veg: 1,
    is_outlet_only: 1,
    image_url: '/images/food/tandoori_roti.jpg',
    description: 'Crisp hot whole wheat roti baked in traditional clay tandoor.'
  },
  {
    id: 21,
    name: 'Lacchha Paratha',
    displayName: 'Lacchha Paratha',
    customer_price: 25,
    vendor_cost: 20,
    category: 'Breads',
    is_veg: 1,
    is_outlet_only: 1,
    image_url: '/images/food/lacchha_paratha.jpg',
    description: 'Multi-layered flaky crispy tandoor paratha.'
  },
  {
    id: 15,
    name: 'Chawal+roti(pack)',
    displayName: 'Chawal + Roti (Combo)',
    customer_price: 30,
    vendor_cost: 25,
    category: 'Outlet Special',
    is_veg: 1,
    is_outlet_only: 1,
    image_url: '/images/food/chawal_roti_pack.jpg',
    description: 'Quick student combo pack: 4 hot rotis + bowl of steamed white rice.'
  }
];

export default function CartDrawer({ isOpen, onClose, onProceedToCheckout }) {
  const { cartItems, totalCount, itemsTotal, deliveryFee, grandTotal, hasOutletItems, addToCart, updateQuantity, removeFromCart } = useCart();

  if (!isOpen) return null;

  // Check if cart has chicken curry or any other curry dish
  const hasCurry = cartItems.some(item => {
    const name = (item.name || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();
    return name.includes('curry') || name.includes('kari') || cat === 'curry';
  });

  const freeDeliveryThreshold = 100;
  const remainingForFreeDelivery = Math.max(0, freeDeliveryThreshold - itemsTotal);
  const freeDeliveryProgress = Math.min(100, (itemsTotal / freeDeliveryThreshold) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-end animate-in fade-in duration-200">
      <div className="bg-[#111111] border-l border-neutral-800 w-full max-w-md h-full flex flex-col justify-between shadow-[0_0_50px_rgba(0,0,0,0.9)] p-4 sm:p-5">
        
        {/* 1. Drawer Header */}
        <div>
          <div className="flex items-center justify-between pb-3.5 border-b border-neutral-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FF5722]/20 border border-[#FF5722]/40 flex items-center justify-center text-[#FF5722]">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-white tracking-tight leading-none">
                  Your Food Basket
                </h2>
                <p className="text-[11px] text-neutral-400 font-medium mt-0.5">
                  {totalCount} {totalCount === 1 ? 'item' : 'items'} selected
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Delivery Progress Meter */}
          {!hasOutletItems && cartItems.length > 0 && (
            <div className="mt-3 p-3 rounded-2xl bg-[#181818] border border-neutral-800/80">
              <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
                {remainingForFreeDelivery > 0 ? (
                  <span className="text-neutral-300">
                    Add <strong className="text-amber-400">₹{remainingForFreeDelivery.toFixed(0)}</strong> more for FREE delivery
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>FREE Campus Delivery Unlocked!</span>
                  </span>
                )}
                <span className="text-neutral-400 text-[10px]">₹{itemsTotal.toFixed(0)}/₹100</span>
              </div>
              <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FF5722] to-emerald-400 transition-all duration-300 rounded-full"
                  style={{ width: `${freeDeliveryProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Outlet items disclaimer banner */}
          {hasOutletItems && (
            <div className="mt-3 p-3 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-[11px] text-amber-200 flex items-start gap-2">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Outlet Order:</strong> Your basket contains counter dishes for direct pickup at the Jhungiya Outlet.
              </span>
            </div>
          )}
        </div>

        {/* 2. Cart Items List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-0.5">
          {cartItems.length === 0 ? (
            <div className="text-center py-20 text-neutral-500">
              <div className="w-16 h-16 rounded-3xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-center mx-auto mb-3 text-neutral-600">
                <ShoppingBag className="w-8 h-8 opacity-40 stroke-1" />
              </div>
              <p className="text-sm font-bold text-neutral-300">Your basket is empty</p>
              <p className="text-xs mt-1 text-neutral-500">Add delicious curries, thalis, or pizzas to get started!</p>
            </div>
          ) : (
            <>
              {cartItems.map((item) => {
                const isVeg = item.is_veg === 1 || item.is_veg === true;
                return (
                  <div
                    key={item.id}
                    className="bg-[#161616] border border-neutral-800/90 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-sm hover:border-neutral-700/80 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <FoodClassBadge isVeg={isVeg} size="sm" />
                        <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                      </div>
                      <div className="text-xs text-[#FF7043] font-black">
                        ₹{item.customer_price} <span className="text-[10px] text-neutral-500 font-medium">× {item.quantity}</span>
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 bg-[#202020] border border-neutral-700/70 rounded-xl px-2 py-1 shadow-inner">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="text-neutral-400 hover:text-white p-0.5 active:scale-90 transition-transform"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-black text-white px-1 min-w-[1rem] text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="text-neutral-400 hover:text-white p-0.5 active:scale-90 transition-transform"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Subtotal & Delete */}
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-white">
                        ₹{(parseFloat(item.customer_price) * item.quantity).toFixed(0)}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-neutral-500 hover:text-rose-400 mt-1 p-0.5 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* 3. Bread & Combo Suggestions when Curry is in basket */}
              {hasCurry && (
                <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-br from-[#221510] via-[#161210] to-[#1E120B] border border-[#FF5722]/40 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <RotiBreadIcon className="w-5 h-5 shrink-0 drop-shadow-[0_2px_6px_rgba(255,160,0,0.3)]" />
                      <h3 className="text-xs font-black text-white tracking-tight">
                        Pair with your Curry
                      </h3>
                    </div>
                    <span className="text-[9px] font-black text-[#FF7043] bg-[#FF5722]/15 px-2 py-0.5 rounded-full border border-[#FF5722]/30 uppercase">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mb-2.5 font-medium">
                    Add freshly baked tandoori breads & combo to complete your meal:
                  </p>

                  <div className="space-y-2">
                    {RECOMMENDED_ADDONS.map(addon => {
                      const inCart = cartItems.find(i => i.id === addon.id || (i.name && i.name.toLowerCase() === addon.name.toLowerCase()));
                      const qty = inCart ? inCart.quantity : 0;

                      return (
                        <div
                          key={addon.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-[#121212] border border-neutral-800/80 hover:border-neutral-700 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-neutral-800 bg-neutral-900">
                              <img
                                src={addon.image_url}
                                alt={addon.displayName}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.src = '/images/food/tandoori_roti.jpg'; }}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <FoodClassBadge isVeg={addon.is_veg} size="sm" />
                                <h4 className="text-xs font-bold text-white truncate">
                                  {addon.displayName}
                                </h4>
                              </div>
                              <div className="text-xs font-black text-[#FF7043] mt-0.5">
                                ₹{addon.customer_price}
                              </div>
                            </div>
                          </div>

                          {/* Stepper / Add button */}
                          <div className="shrink-0 ml-2">
                            {qty === 0 ? (
                              <button
                                onClick={() => addToCart(addon)}
                                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-[#FF5722] hover:text-white border border-neutral-700 hover:border-[#FF5722] text-xs font-black text-white flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5 bg-[#FF5722] text-white rounded-xl px-2 py-1 shadow-sm">
                                <button
                                  onClick={() => updateQuantity(inCart.id, -1)}
                                  className="p-0.5 hover:opacity-80 transition-opacity active:scale-90"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-xs font-black px-1 min-w-[1rem] text-center">{qty}</span>
                                <button
                                  onClick={() => updateQuantity(inCart.id, 1)}
                                  className="p-0.5 hover:opacity-80 transition-opacity active:scale-90"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 4. Footer & Bill Summary */}
        {cartItems.length > 0 && (
          <div className="border-t border-neutral-800/80 pt-3.5 space-y-3">
            
            {/* Bill Details */}
            <div className="p-3.5 rounded-2xl bg-[#161616] border border-neutral-800/80 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Items Subtotal</span>
                <span className="font-bold text-white">₹{itemsTotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-neutral-400 items-center">
                <span>Campus Delivery Fee</span>
                {deliveryFee === 0 ? (
                  <span className="text-emerald-400 font-bold text-[11px] bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                    FREE {hasOutletItems ? '(Outlet)' : '(Promo)'}
                  </span>
                ) : (
                  <span className="font-bold text-white">₹{deliveryFee.toFixed(2)}</span>
                )}
              </div>

              {/* Wallet Cashback Notice */}
              <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-amber-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <CashbackCoinIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Student Cashback Earned:</span>
                </span>
                <span>+ ₹3.00 into Wallet</span>
              </div>

              <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-neutral-800">
                <span>To Pay</span>
                <span className="text-[#FF7043] text-base font-black">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout CTA */}
            <button
              onClick={() => {
                onClose();
                onProceedToCheckout();
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#E64A19] hover:from-[#F4511E] hover:to-[#D84315] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(255,87,34,0.4)] active:scale-95 transition-all group"
            >
              <span>Proceed to Campus Checkout</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
