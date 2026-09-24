import React, { useState, useMemo } from 'react';
import {
  Plus,
  Minus,
  Sparkles,
  ChefHat,
  Clock,
  Star,
  Flame,
  ShieldCheck,
  Zap,
  ShoppingBag,
  ArrowRight,
  TrendingUp,
  Award,
  Check,
  Tag,
  Store,
  Info
} from 'lucide-react';
import {
  CurryIcon,
  ThaliIcon,
  BiryaniIcon,
  PizzaIcon,
  FoodClassBadge,
  RotiBreadIcon,
  RollIcon,
  RiceBowlIcon,
  AllDishesIcon,
  PureVegTabIcon,
  NonVegTabIcon,
  CashbackCoinIcon,
  ExpressDeliveryIcon,
  MasterChefIcon
} from '../components/FoodIcons';
import { getDishImage } from '../utils/dishImages';
import { useCart } from '../context/CartContext';

export default function Home({ menu = {}, loading = false, onOpenCart, onChangeTab }) {
  const [activeCategory, setActiveCategory] = useState('Curry');
  const [dietaryFilter, setDietaryFilter] = useState('ALL'); // 'ALL' | 'VEG' | 'NON_VEG' | 'UNDER_100'
  const { cartItems, totalCount, itemsTotal, addToCart, updateQuantity } = useCart();

  // Dynamic time-based greeting
  const mealContext = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return {
        greeting: 'Morning Breakfast & Early Lunch',
        tagline: 'Fresh hot meals cooked to power your morning lectures!',
        tag: 'Morning Special'
      };
    } else if (hour >= 12 && hour < 16) {
      return {
        greeting: 'Campus Lunch Rush • Steaming Hot Meals',
        tagline: 'Authentic royal thalis and rich curries ready for instant gate dispatch.',
        tag: 'Lunch Rush'
      };
    } else if (hour >= 16 && hour < 19) {
      return {
        greeting: 'Evening Snack & Study Break Combos',
        tagline: 'Fuel your evening study sessions with piping hot rolls, pizzas & curries.',
        tag: 'Evening Break'
      };
    } else if (hour >= 19 && hour < 23) {
      return {
        greeting: 'Tonight\'s Campus Dinner Menu',
        tagline: 'End your day with aromatic dum biryani, deluxe thali & tandoor curries.',
        tag: 'Dinner Special'
      };
    } else {
      return {
        greeting: 'Late-Night Campus Cravings',
        tagline: 'Hostel gate night delivery ready to satisfy your late-night hunger!',
        tag: 'Late Night'
      };
    }
  }, []);

  // Filter delivery items for categories
  const curryItems = useMemo(() => (menu.Curry || []).filter(i => !i.is_outlet_only), [menu]);
  const thaliItems = useMemo(() => (menu.Thali || []).filter(i => !i.is_outlet_only), [menu]);
  const biryaniItems = useMemo(() => (menu.Biryani || []).filter(i => !i.is_outlet_only), [menu]);
  const pizzaItems = useMemo(() => (menu.Pizza || []).filter(i => !i.is_outlet_only), [menu]);
  const breadItems = useMemo(() => (menu.Breads || []).filter(i => !i.is_outlet_only), [menu]);
  const rollItems = useMemo(() => (menu.Rolls || []).filter(i => !i.is_outlet_only), [menu]);
  const riceItems = useMemo(() => (menu.Rice || []).filter(i => !i.is_outlet_only), [menu]);

  const categories = useMemo(() => {
    const list = [
      {
        id: 'Curry',
        label: 'Curry',
        subtitle: 'Slow Simmered',
        IconComponent: CurryIcon,
        count: curryItems.length || 4,
        items: curryItems
      },
      {
        id: 'Thali',
        label: 'Thali',
        subtitle: 'Royal Platter',
        IconComponent: ThaliIcon,
        count: thaliItems.length || 4,
        items: thaliItems
      },
      {
        id: 'Biryani',
        label: 'Biryani',
        subtitle: 'Dum Cooked',
        IconComponent: BiryaniIcon,
        count: biryaniItems.length || 3,
        items: biryaniItems
      },
      {
        id: 'Pizza',
        label: 'Pizza',
        subtitle: 'Artisan Crust',
        IconComponent: PizzaIcon,
        count: pizzaItems.length || 2,
        items: pizzaItems
      }
    ];

    if (breadItems.length > 0) {
      list.push({
        id: 'Breads',
        label: 'Breads',
        subtitle: 'Tandoor Fresh',
        IconComponent: RotiBreadIcon,
        count: breadItems.length,
        items: breadItems
      });
    }

    if (rollItems.length > 0) {
      list.push({
        id: 'Rolls',
        label: 'Rolls',
        subtitle: 'Crispy Wraps',
        IconComponent: RollIcon,
        count: rollItems.length,
        items: rollItems
      });
    }

    if (riceItems.length > 0) {
      list.push({
        id: 'Rice',
        label: 'Rice',
        subtitle: 'Fragrant Basmati',
        IconComponent: RiceBowlIcon,
        count: riceItems.length,
        items: riceItems
      });
    }

    return list;
  }, [curryItems, thaliItems, biryaniItems, pizzaItems, breadItems, rollItems, riceItems]);

  const currentCategoryObj = categories.find(c => c.id === activeCategory);
  const rawItems = currentCategoryObj?.items || [];

  // Filter items by sub-dietary filter
  const displayedItems = useMemo(() => {
    return rawItems.filter(item => {
      const isVeg = item.is_veg === 1 || item.is_veg === true;
      if (dietaryFilter === 'VEG') return isVeg;
      if (dietaryFilter === 'NON_VEG') return !isVeg;
      if (dietaryFilter === 'UNDER_100') return Number(item.customer_price) <= 100;
      return true;
    });
  }, [rawItems, dietaryFilter]);

  // Top 4 Campus Bestsellers for Spotlight Carousel
  const topBestsellers = useMemo(() => {
    const all = [...curryItems, ...thaliItems, ...biryaniItems, ...pizzaItems];
    const picks = [
      all.find(i => (i.name || '').toLowerCase().includes('chicken curry')),
      all.find(i => (i.name || '').toLowerCase().includes('veg thali')),
      all.find(i => (i.name || '').toLowerCase().includes('chicken biryani')),
      all.find(i => (i.name || '').toLowerCase().includes('paneer pizza'))
    ].filter(Boolean);

    return picks.length >= 2 ? picks : all.slice(0, 4);
  }, [curryItems, thaliItems, biryaniItems, pizzaItems]);

  return (
    <div className="pb-32 md:pb-16 pt-3 px-3 sm:px-4 max-w-4xl mx-auto space-y-7 animate-in fade-in duration-300">
      
      {/* 1. Live Campus Time Status Bar */}
      <div className="flex items-center justify-between text-[11px] font-bold px-1">
        <div className="flex items-center gap-1.5 text-neutral-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10B981]" />
          <span>{mealContext.greeting}</span>
        </div>
        <span className="text-[#FF7043] bg-[#FF5722]/10 border border-[#FF5722]/30 px-2 py-0.5 rounded-full uppercase tracking-wider text-[10px] font-black">
          {mealContext.tag}
        </span>
      </div>

      {/* 2. Hero Campus Offer Showcase Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#20140E] via-[#141210] to-[#1A100B] border border-[#FF5722]/40 p-5 sm:p-6 text-white shadow-[0_16px_40px_rgba(0,0,0,0.7)] animate-shimmer">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF5722]/20 border border-[#FF5722]/50 text-[11px] font-black uppercase tracking-wider mb-2 text-[#FF7043] shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#FFB74D]" />
            <span>Campus Express Food Delivery • Gorakhpur</span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight text-white">
            Piping Hot Food <br />
            <span className="bg-gradient-to-r from-[#FF5722] via-[#FF7043] to-[#FFA726] bg-clip-text text-transparent">
              Delivered To Your Hostel Gate!
            </span>
          </h1>

          <p className="text-xs text-neutral-300 mt-2 font-medium leading-relaxed max-w-md">
            {mealContext.tagline}
          </p>

          {/* 3 Quick Perks Bar */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-neutral-800/80 text-[11px]">
            <div className="flex items-center gap-1.5 font-bold text-neutral-200">
              <ExpressDeliveryIcon className="w-4 h-4 shrink-0" />
              <span>15-20 Min Delivery</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-neutral-200">
              <CashbackCoinIcon className="w-4 h-4 shrink-0" />
              <span>₹3 Wallet Cashback</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-neutral-200">
              <Flame className="w-3.5 h-3.5 text-[#FF7043] shrink-0" />
              <span>100% Fresh & Hot</span>
            </div>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient from-[#FF5722]/20 to-transparent blur-3xl pointer-events-none" />
      </div>

      {/* 3. "Campus Top Bestsellers" Spotlight Horizontal Carousel */}
      {topBestsellers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                  Campus Top Bestsellers
                </h2>
                <p className="text-[10px] text-neutral-400 font-medium">Most ordered dishes by students</p>
              </div>
            </div>
            <span className="text-[11px] text-[#FF7043] font-bold">Chef's Recommendations</span>
          </div>

          <div className="flex items-center gap-3.5 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
            {topBestsellers.map((item) => {
              const inCart = cartItems.find(i => i.id === item.id);
              const qty = inCart?.quantity || 0;
              const dishImg = getDishImage(item);
              const isVeg = item.is_veg === 1 || item.is_veg === true;

              return (
                <div
                  key={item.id}
                  className="w-56 sm:w-64 shrink-0 bg-[#121212] border border-neutral-800/90 hover:border-neutral-700 rounded-3xl p-3 shadow-lg flex flex-col justify-between group relative overflow-hidden transition-all hover:-translate-y-0.5"
                >
                  {/* Bestseller Top Ribbon */}
                  <div className="relative w-full h-28 sm:h-32 rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 mb-2.5">
                    <img
                      src={dishImg}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { e.target.src = '/images/food/veg_thali.jpg'; }}
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-amber-500/40 text-[9px] font-black text-amber-300 uppercase flex items-center gap-1">
                      <Flame className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                      <span>Bestseller</span>
                    </span>
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-black text-white flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                      <span>4.9</span>
                    </span>
                  </div>

                  {/* Info Row */}
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <FoodClassBadge isVeg={isVeg} size="sm" />
                      <h3 className="text-xs sm:text-sm font-black text-white truncate group-hover:text-[#FF7043] transition-colors leading-tight">
                        {item.name}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-neutral-800/80">
                      <div>
                        <span className="text-xs sm:text-sm font-black text-[#FF7043]">
                          ₹{item.customer_price}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-semibold block -mt-0.5">
                          {item.category}
                        </span>
                      </div>

                      {/* Add Button / Stepper */}
                      <div>
                        {qty === 0 ? (
                          <button
                            onClick={() => addToCart(item)}
                            className="px-3 py-1.5 rounded-xl bg-[#1C1C1C] hover:bg-[#FF5722] text-[#FF5722] hover:text-white border border-[#FF5722]/50 hover:border-[#FF5722] text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>ADD</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white rounded-xl px-2 py-1 shadow-[0_4px_12px_rgba(255,87,34,0.35)]">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="p-0.5 hover:opacity-80 transition-opacity active:scale-90"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-black px-1 min-w-[1rem] text-center">{qty}</span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="p-0.5 hover:opacity-80 transition-opacity active:scale-90"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Luxury Category Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
            <ChefHat className="w-4 h-4 text-[#FF5722]" />
            <span>Explore Menu Categories</span>
          </h2>
          <span className="text-[11px] text-[#FF7043] font-bold">
            {categories.reduce((sum, c) => sum + c.count, 0)} Dishes Live
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            const Icon = cat.IconComponent;

            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setDietaryFilter('ALL');
                }}
                className={`p-3.5 rounded-2xl flex items-center gap-3 transition-all border text-left relative overflow-hidden group active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-br from-[#241712] to-[#18120F] border-[#FF5722] shadow-[0_8px_24px_rgba(255,87,34,0.3)] ring-1 ring-[#FF5722]'
                    : 'bg-[#121212] text-neutral-300 border-neutral-800 hover:border-neutral-700 hover:bg-[#181818]'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
                    isActive
                      ? 'bg-gradient-to-br from-[#FF5722]/30 to-[#BF360C]/20 border-[#FF5722]/50 shadow-inner'
                      : 'bg-[#1A1A1A] border-neutral-800'
                  }`}
                >
                  <Icon className="w-8 h-8" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-black text-white tracking-tight flex items-center gap-1">
                    <span>{cat.label}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#FF5722]" />}
                  </div>
                  <div className="text-[10px] text-neutral-400 font-medium truncate mt-0.5">
                    {cat.subtitle}
                  </div>
                  <div className={`text-[10px] font-bold mt-1 ${isActive ? 'text-[#FF7043]' : 'text-neutral-500'}`}>
                    {cat.count} items
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Sub-Dietary Filter Chips inside Selected Category */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none px-0.5">
        <button
          onClick={() => setDietaryFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all shrink-0 active:scale-95 ${
            dietaryFilter === 'ALL'
              ? 'bg-[#FF5722] text-white border-[#FF5722] shadow-sm'
              : 'bg-[#141414] text-neutral-400 border-neutral-800 hover:border-neutral-700'
          }`}
        >
          All {activeCategory}
        </button>

        <button
          onClick={() => setDietaryFilter('VEG')}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all shrink-0 flex items-center gap-1.5 active:scale-95 ${
            dietaryFilter === 'VEG'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
              : 'bg-[#141414] text-emerald-400 border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <PureVegTabIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Pure Veg</span>
          {dietaryFilter === 'VEG' && <Check className="w-3 h-3 stroke-[3]" />}
        </button>

        <button
          onClick={() => setDietaryFilter('NON_VEG')}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all shrink-0 flex items-center gap-1.5 active:scale-95 ${
            dietaryFilter === 'NON_VEG'
              ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
              : 'bg-[#141414] text-rose-400 border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <NonVegTabIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Non-Veg</span>
          {dietaryFilter === 'NON_VEG' && <Check className="w-3 h-3 stroke-[3]" />}
        </button>

        <button
          onClick={() => setDietaryFilter('UNDER_100')}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all shrink-0 flex items-center gap-1 active:scale-95 ${
            dietaryFilter === 'UNDER_100'
              ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
              : 'bg-[#141414] text-amber-400 border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <Tag className="w-3 h-3" />
          <span>Under ₹100</span>
          {dietaryFilter === 'UNDER_100' && <Check className="w-3 h-3 stroke-[3]" />}
        </button>
      </div>

      {/* 6. Curry Bread Pairing Callout Banner (Appears when viewing Curry) */}
      {activeCategory === 'Curry' && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#221510] via-[#161210] to-[#1E120B] border border-[#FF5722]/40 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <RotiBreadIcon className="w-8 h-8 shrink-0 drop-shadow-[0_2px_8px_rgba(255,160,0,0.3)]" />
            <div>
              <h3 className="text-xs font-black text-white">Ordering Curry? Pair with Tandoori Roti & Parathas!</h3>
              <p className="text-[11px] text-neutral-400 font-medium">Add Tandoori Roti (₹8), Lacchha Paratha (₹25) or Chawal Combo (₹30) in your basket.</p>
            </div>
          </div>
        </div>
      )}

      {/* 7. Category Dishes Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#FF5722]" />
            <h3 className="text-sm sm:text-base font-black text-white">
              {activeCategory} Specials
            </h3>
            <span className="text-xs text-neutral-400 font-normal">
              • {currentCategoryObj?.subtitle}
            </span>
          </div>
          <span className="text-xs text-neutral-400 font-semibold">
            {displayedItems.length} options ready
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-44 bg-[#141414] rounded-3xl border border-neutral-800/80" />
            ))}
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl bg-[#121212] border border-neutral-800 text-neutral-400 space-y-2">
            <p className="text-sm font-bold text-white">No dishes matching this filter.</p>
            <p className="text-xs text-neutral-500">Try selecting "All {activeCategory}" to see all available options.</p>
            <button
              onClick={() => setDietaryFilter('ALL')}
              className="mt-2 px-3.5 py-1.5 rounded-xl bg-[#FF5722] text-white text-xs font-bold"
            >
              Reset Category Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {displayedItems.map((item) => {
              const inCart = cartItems.find(i => i.id === item.id);
              const qty = inCart?.quantity || 0;
              const dishImage = getDishImage(item);
              const isVeg = item.is_veg === 1 || item.is_veg === true;

              return (
                <div
                  key={item.id}
                  className="bg-[#121212] border border-neutral-800/90 hover:border-neutral-700/90 rounded-3xl p-4 flex gap-3.5 justify-between shadow-lg hover:shadow-[0_10px_30px_rgba(0,0,0,0.6)] transition-all group relative"
                >
                  {/* Left Column: Dish details */}
                  <div className="flex-1 flex flex-col justify-between min-w-0 pr-1">
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <FoodClassBadge isVeg={isVeg} />
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                          {isVeg ? 'Pure Veg' : 'Non-Veg'}
                        </span>
                        <span className="text-[10px] text-amber-400 font-bold bg-amber-950/40 border border-amber-800/30 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-amber-400" />
                          <span>4.8</span>
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-sm sm:text-base font-black text-white group-hover:text-[#FF7043] transition-colors leading-tight line-clamp-1">
                        {item.name}
                      </h4>

                      {/* Price */}
                      <div className="text-base font-black text-white mt-1 flex items-baseline gap-1">
                        <span className="text-[#FF7043]">₹{item.customer_price}</span>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-neutral-400 mt-2 line-clamp-2 leading-relaxed font-medium">
                        {item.description || 'Authentic homestyle preparation with freshly ground spices.'}
                      </p>
                    </div>

                    {/* Bottom Metadata */}
                    <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold text-neutral-500">
                      <Clock className="w-3 h-3 text-neutral-400" />
                      <span>15-20 mins prep</span>
                    </div>
                  </div>

                  {/* Right Column: High-Res Food Photo with Floating Stepper */}
                  <div className="relative shrink-0 flex flex-col items-center">
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border border-neutral-800/90 bg-neutral-900 shadow-md">
                      <img
                        src={dishImage}
                        alt={item.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.src = '/images/food/veg_thali.jpg';
                        }}
                      />
                    </div>

                    {/* Floating Add to Cart Button / Stepper */}
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
                        <div className="w-full flex items-center justify-between bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white rounded-xl px-2.5 py-1 shadow-[0_4px_16px_rgba(255,87,34,0.4)]">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="hover:opacity-80 p-0.5 transition-opacity active:scale-90"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-black px-1">{qty}</span>
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
        )}
      </div>

      {/* 8. "Why 2 Roti Campus Express?" Trust Grid */}
      <div className="pt-2 border-t border-neutral-800/80 space-y-3">
        <h2 className="text-xs font-black uppercase tracking-wider text-neutral-400 px-1">
          Why Students Choose 2 Roti
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-[#121212] border border-neutral-800/90 shadow-sm space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF5722]/20 border border-[#FF5722]/40 text-[#FF5722] flex items-center justify-center">
              <ExpressDeliveryIcon className="w-5 h-5 text-[#FF5722]" />
            </div>
            <h4 className="text-xs font-black text-white">15-20 Min Gate Delivery</h4>
            <p className="text-[11px] text-neutral-400 leading-relaxed font-medium">
              Runners stationed at MMMUT / Gorakhpur campus gates for immediate student handoff.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#121212] border border-neutral-800/90 shadow-sm space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <MasterChefIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <h4 className="text-xs font-black text-white">100% Homestyle Quality</h4>
            <p className="text-[11px] text-neutral-400 leading-relaxed font-medium">
              Freshly cooked everyday in spotless kitchens with authentic whole spices and clay tandoor.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#121212] border border-neutral-800/90 shadow-sm space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <CashbackCoinIcon className="w-5 h-5 text-amber-400" />
            </div>
            <h4 className="text-xs font-black text-white">₹3 Guaranteed Cashback</h4>
            <p className="text-[11px] text-neutral-400 leading-relaxed font-medium">
              Every completed order credits ₹3 into your 2 Roti Wallet for instant future savings.
            </p>
          </div>
        </div>
      </div>

      {/* 9. Sticky Floating Quick Cart Bar (When Items in Basket) */}
      {totalCount > 0 && onOpenCart && (
        <div className="fixed bottom-16 md:bottom-6 inset-x-0 z-40 px-4 flex justify-center pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div
            onClick={onOpenCart}
            className="pointer-events-auto bg-gradient-to-r from-[#FF5722] via-[#F4511E] to-[#E64A19] text-white rounded-full px-5 py-3 shadow-[0_12px_36px_rgba(255,87,34,0.5)] flex items-center justify-between gap-4 max-w-md w-full cursor-pointer active:scale-95 transition-all group border border-white/20"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-white text-[#BF360C] flex items-center justify-center font-black text-xs shadow-sm">
                {totalCount}
              </div>
              <div>
                <span className="text-xs font-black block leading-none">
                  {totalCount} {totalCount === 1 ? 'Dish' : 'Dishes'} in Basket
                </span>
                <span className="text-[10px] text-white/90 font-bold block mt-0.5">
                  ₹{itemsTotal.toFixed(0)} Subtotal
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
              <span>View Basket</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
