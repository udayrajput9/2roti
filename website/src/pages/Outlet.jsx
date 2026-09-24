import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Minus, Store, CheckCircle2, Clock, AlertTriangle, Sparkles } from 'lucide-react';
import OutletProximityModal from '../components/OutletProximityModal';
import { FoodClassBadge, StorefrontIcon } from '../components/FoodIcons';
import { getDishImage } from '../utils/dishImages';
import { useCart } from '../context/CartContext';

export default function OutletPage({ outletItems = [], onGoHome }) {
  const [hasConfirmedProximity, setHasConfirmedProximity] = useState(false);
  const [showModal, setShowModal] = useState(true);
  const { cartItems, addToCart, updateQuantity, getItemQty, sysSettings } = useCart();

  useEffect(() => {
    if (!hasConfirmedProximity) {
      setShowModal(true);
    }
  }, [hasConfirmedProximity]);

  const handleConfirm = () => {
    setHasConfirmedProximity(true);
    setShowModal(false);
  };

  const handleCancel = () => {
    setShowModal(false);
    if (onGoHome) onGoHome();
  };

  return (
    <div className="pb-28 md:pb-12 pt-3 px-3 sm:px-4 max-w-4xl mx-auto space-y-5">
      
      {/* Strict Proximity Modal */}
      <OutletProximityModal
        isOpen={showModal}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      {/* Prominent Warning Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#1C120D] via-[#141210] to-[#18100C] border border-[#FF5722]/60 shadow-[0_12px_36px_rgba(255,87,34,0.2)] relative overflow-hidden">
        <div className="flex items-start gap-3.5 relative z-10">
          <div className="p-2.5 rounded-2xl bg-[#FF5722]/20 border border-[#FF5722]/40 text-[#FF5722] shrink-0 mt-0.5 shadow-inner">
            <StorefrontIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-black text-white tracking-tight uppercase">
                Jhungiya Physical Outlet Counter
              </h1>
              <span className="text-[10px] bg-emerald-950/90 border border-emerald-700/60 text-emerald-400 font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <CheckCircle2 className="w-3 h-3" />
                <span>Counter Open</span>
              </span>
            </div>
            
            <p className="text-xs text-neutral-200 mt-1.5 leading-relaxed font-medium">{
              sysSettings?.outlet_info?.subtitle || "Aap tabhi order karein jab aap humare outlet pe ho. Agar outlet ke paas nahi hai jo ki Jhungiya me hai toh aap delivery section me order karein."}
            </p>

            <div className="mt-2.5 text-[11px] text-[#FFB74D] flex items-center gap-1.5 font-bold">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-[#FF5722]" />
              <span>Direct Self-Pickup at Counter • ₹0 Delivery Fee Guaranteed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Items Grid */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#FF5722]" />
            <span>Outlet Specials & Combos ({outletItems.length} Dishes)</span>
          </h2>
          <span className="text-[11px] text-emerald-400 font-bold">⚡ 5-10 Min Quick Counter</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {outletItems.map((item) => {
            const qty = getItemQty(item.id);
            const imageUrl = getDishImage(item);
            const isVeg = item.is_veg === 1 || item.is_veg === true;

            return (
              <div
                key={item.id}
                className="bg-[#121212] border border-neutral-800/90 hover:border-neutral-700/90 rounded-3xl p-3.5 flex justify-between gap-3 shadow-md transition-all group relative"
              >
                {/* Left: Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <FoodClassBadge isVeg={isVeg} size="sm" />
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                        {item.category}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-black text-white group-hover:text-[#FF7043] transition-colors leading-snug truncate">
                      {item.name}
                    </h4>

                    <div className="text-xs sm:text-sm font-black text-[#FF7043] mt-1">
                      ₹{item.customer_price}
                    </div>

                    <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2 leading-relaxed font-medium">
                      {item.description || 'Hot & fresh quick bite prepared live at the Jhungiya counter.'}
                    </p>
                  </div>

                  <div className="mt-2 text-[10px] font-semibold text-neutral-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Instant Counter Pickup</span>
                  </div>
                </div>

                {/* Right: Food Image with Floating Stepper */}
                <div className="relative shrink-0 flex flex-col items-center">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 shadow-md">
                    <img
                      src={imageUrl}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = '/images/food/veg_thali.webp';
                      }}
                    />
                  </div>

                  {/* Add Button / Stepper */}
                  <div className="absolute -bottom-2 w-[88%]">
                    {qty === 0 ? (
                      <button
                        onClick={() => addToCart(item)}
                        className="w-full py-1.5 rounded-xl bg-[#1A1A1A] hover:bg-[#FF5722] text-[#FF5722] hover:text-white border border-[#FF5722]/50 hover:border-[#FF5722] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>ADD</span>
                      </button>
                    ) : (
                      <div className="w-full flex items-center justify-between bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white rounded-xl px-2 py-1 shadow-[0_4px_12px_rgba(255,87,34,0.35)]">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="hover:opacity-80 p-0.5 transition-opacity active:scale-90"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-black px-1 min-w-[1rem] text-center">{qty}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="hover:opacity-80 p-0.5 transition-opacity active:scale-90"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}



