import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search as SearchIcon, Plus, Minus, X, RotateCcw,
  Utensils, Tag, Check, ArrowRight, Sparkles, Zap,
  SlidersHorizontal, History, Flame, Clock, Star,
  TrendingUp, Award, CheckCircle2, ChevronDown, Filter
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import {
  FoodClassBadge,
  AllDishesIcon,
  CurryIcon,
  ThaliIcon,
  BiryaniIcon,
  PizzaIcon,
  RotiBreadIcon,
  RollIcon,
  RiceBowlIcon,
  PureVegTabIcon,
  NonVegTabIcon,
  CashbackCoinIcon,
  ExpressDeliveryIcon,
  MasterChefIcon
} from '../components/FoodIcons';
import { getDishImage } from '../utils/dishImages';
import {
  computeDeepSearch,
  computeSearchFacets,
  highlightMatch,
  levenshteinSimilarity
} from '../utils/deepSearchEngine';

// Default Category tabs with bespoke SVG icons
const BASE_CATEGORY_TABS = [
  { id: 'ALL',      label: 'All Dishes', Icon: AllDishesIcon },
  { id: 'Curry',    label: 'Curries',    Icon: CurryIcon },
  { id: 'Thali',    label: 'Thalis',     Icon: ThaliIcon },
  { id: 'Biryani',  label: 'Biryani',    Icon: BiryaniIcon },
  { id: 'Pizza',    label: 'Pizzas',     Icon: PizzaIcon },
  { id: 'Breads',   label: 'Breads',     Icon: RotiBreadIcon },
  { id: 'Rolls',    label: 'Rolls',      Icon: RollIcon },
  { id: 'Rice',     label: 'Rice Combos',Icon: RiceBowlIcon }
];

// Campus trending search queries with SVG icons
const TRENDING_QUERIES = [
  { text: 'Paneer Thali', Icon: ThaliIcon, desc: 'Hostel Favorite' },
  { text: 'Chicken Biryani', Icon: BiryaniIcon, desc: 'Dum Cooked' },
  { text: 'Aalu Paratha', Icon: RotiBreadIcon, desc: 'Desi Butter' },
  { text: 'Pure Veg under 100', Icon: PureVegTabIcon, desc: 'Budget Deal' },
  { text: 'Spicy Curry', Icon: CurryIcon, desc: 'Desi Gravy' },
  { text: 'Paneer Pizza', Icon: PizzaIcon, desc: 'Crisp Crust' }
];

const LOCAL_STORAGE_KEY = '2roti_recent_searches_v2';

export default function SearchPage({ allItems = [] }) {
  const [query, setQuery]                 = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [dietaryFilter, setDietaryFilter] = useState('ALL'); // 'ALL' | 'VEG' | 'NON_VEG'
  const [under100Only, setUnder100]       = useState(false);
  const [sortBy, setSortBy]               = useState('RELEVANCE'); // 'RELEVANCE' | 'PRICE_LOW' | 'PRICE_HIGH' | 'RATING' | 'FASTEST'
  const [recentSearches, setRecentSearches] = useState([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  const searchRef = useRef(null);
  const { cartItems, addToCart, updateQuantity } = useCart();

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to parse recent searches', e);
    }
  }, []);

  // Save query to recent searches
  const recordRecentSearch = (text) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 2) return;
    try {
      const updated = [trimmed, ...recentSearches.filter(s => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
      setRecentSearches(updated);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save search', e);
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  const removeRecentSearch = (e, itemToRemove) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== itemToRemove);
    setRecentSearches(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  };

  // ── Compute Deep Search Pipeline ──────────────────────────────────────────
  const searchOutput = useMemo(() => {
    return computeDeepSearch(allItems, query, {
      activeCategory,
      activeDietary: dietaryFilter,
      priceRange: under100Only ? [0, 100] : null,
      sortBy
    });
  }, [allItems, query, activeCategory, dietaryFilter, under100Only, sortBy]);

  const { results, parsedIntent, didYouMean, fallbackRecommendations, telemetry } = searchOutput;

  // ── Dynamic category tabs with real item counts ───────────────────────────
  const dynamicCategories = useMemo(() => {
    return BASE_CATEGORY_TABS.map(tab => {
      const count = tab.id === 'ALL'
        ? allItems.length
        : allItems.filter(i => (i.category || '').toLowerCase() === tab.id.toLowerCase()).length;
      return { ...tab, count };
    }).filter(tab => tab.count > 0 || tab.id === 'ALL');
  }, [allItems]);

  // Overall catalog facets
  const facets = useMemo(() => computeSearchFacets(allItems), [allItems]);

  // Handle hitting enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      recordRecentSearch(query);
      if (searchRef.current) searchRef.current.blur();
      setIsInputFocused(false);
    }
  };

  const handleSelectQuery = (text) => {
    setQuery(text);
    recordRecentSearch(text);
    setIsInputFocused(false);
  };

  const handleReset = () => {
    setActiveCategory('ALL');
    setDietaryFilter('ALL');
    setQuery('');
    setUnder100(false);
    setSortBy('RELEVANCE');
  };

  const isFiltered = activeCategory !== 'ALL' || dietaryFilter !== 'ALL' || under100Only || query.trim() !== '' || sortBy !== 'RELEVANCE';

  // Helper for rendering highlighted query spans
  const renderHighlightedName = (name) => {
    if (!query.trim() || !parsedIntent.tokens || parsedIntent.tokens.length === 0) {
      return name;
    }
    const parts = highlightMatch(name, parsedIntent.tokens);
    if (typeof parts === 'string') return parts;

    return parts.map((part, idx) => {
      const isMatch = parsedIntent.tokens.some(
        tok => tok.toLowerCase() === part.toLowerCase() || (part.length >= 3 && tok.toLowerCase().includes(part.toLowerCase()))
      );
      return isMatch ? (
        <mark key={idx} className="bg-[#FF5722]/30 text-[#FF7043] px-0.5 rounded font-black">
          {part}
        </mark>
      ) : (
        <span key={idx}>{part}</span>
      );
    });
  };

  return (
    <div className="pb-28 md:pb-12 pt-3 px-3 sm:px-4 max-w-4xl mx-auto space-y-4">

      {/* ── Search Bar & Engine Status ── */}
      <div className="relative">
        <div className="relative flex items-center">
          <SearchIcon className="w-4 h-4 absolute left-4 text-[#FF5722] pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onFocus={() => setIsInputFocused(true)}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search dishes, curries, combos… (e.g. Biryani, Veg under 100)"
            className="w-full bg-[#121212] border border-neutral-800 rounded-2xl pl-11 pr-20 py-3.5
                       text-xs sm:text-sm text-white placeholder-neutral-500
                       focus:outline-none focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722]
                       focus:shadow-[0_0_24px_rgba(255,87,34,0.25)]
                       shadow-inner transition-all font-medium"
          />
          <div className="absolute right-3 flex items-center gap-1.5">
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-neutral-400 hover:text-white p-1 rounded-full hover:bg-neutral-800 transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <div
              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider
                         bg-[#FF5722]/10 text-[#FF7043] border border-[#FF5722]/30 px-2 py-0.5 rounded-lg"
              title="2 Roti Deep Computation Engine Active"
            >
              <Zap className="w-3 h-3 text-[#FF5722] animate-pulse" />
              <span className="hidden sm:inline">Deep AI</span>
            </div>
          </div>
        </div>

        {/* ── Autocomplete / Recent & Trending Overlay Dropdown ── */}
        {isInputFocused && !query && (
          <>
            {/* Click-outside backdrop */}
            <div 
              className="fixed inset-0 z-20" 
              onClick={() => setIsInputFocused(false)} 
            />

            <div className="absolute z-30 left-0 right-0 top-full mt-2 bg-[#141414] border border-neutral-800 rounded-2xl p-4 shadow-2xl backdrop-blur-xl">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 mb-2">
                    <div className="flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-[#FF5722]" />
                      <span>Recent Searches</span>
                    </div>
                    <button
                      onClick={clearRecentSearches}
                      className="text-neutral-500 hover:text-neutral-300 text-[10px] uppercase tracking-wider"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recentSearches.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectQuery(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800
                                   text-xs text-neutral-200 hover:text-white hover:border-neutral-700 transition-all group"
                      >
                        <span>{item}</span>
                        <X
                          className="w-3 h-3 text-neutral-500 hover:text-red-400 transition-colors"
                          onClick={(e) => removeRecentSearch(e, item)}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Campus Trending Suggestions */}
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-400 mb-2">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>Trending on Campus</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TRENDING_QUERIES.map((t, idx) => {
                    const Icon = t.Icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectQuery(t.text)}
                        className="flex items-center gap-2 p-2 rounded-xl bg-neutral-900/90 border border-neutral-800/80
                                   hover:border-[#FF5722]/50 hover:bg-[#1C1410] text-left transition-all group"
                      >
                        {Icon ? <Icon className="w-5 h-5 shrink-0" /> : <span className="text-base">{t.icon}</span>}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white group-hover:text-[#FF7043] transition-colors truncate">
                            {t.text}
                          </div>
                          <div className="text-[10px] text-neutral-500 truncate">{t.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Search Intent & Results Count Indicator ── */}
      {query.trim() && (
        <div className="flex items-center justify-between px-1 text-xs text-neutral-400">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#FF5722]" />
              {results.length} {results.length === 1 ? 'dish' : 'dishes'} found
            </span>

            {/* Detected Intent Badges */}
            {parsedIntent.maxPrice && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Budget: ≤ ₹{parsedIntent.maxPrice}
              </span>
            )}
            {parsedIntent.dietary && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                parsedIntent.dietary === 'VEG'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              }`}>
                {parsedIntent.dietary === 'VEG' ? '🌱 Pure Veg' : '🍗 Non-Veg'}
              </span>
            )}
            {parsedIntent.isSpicy && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                🌶️ Spicy
              </span>
            )}
          </div>

          <span className="text-[10px] text-neutral-500 hidden sm:inline">
            ⚡ {telemetry.latencyMs}ms
          </span>
        </div>
      )}

      {/* ── Did You Mean Spell Correction Banner ── */}
      {didYouMean && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-[#1C1410] to-[#161616] border border-[#FF5722]/50
                        flex items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FF7043] shrink-0 animate-bounce" />
            <span className="text-neutral-300">
              Did you mean{' '}
              <button
                onClick={() => handleSelectQuery(didYouMean.text)}
                className="text-[#FF7043] font-black underline hover:text-[#FFA270] transition-colors"
              >
                "{didYouMean.text}"
              </button>
              ?{' '}
              <span className="text-[10px] text-neutral-500 font-mono">
                ({didYouMean.confidence}% match)
              </span>
            </span>
          </div>
          <button
            onClick={() => handleSelectQuery(didYouMean.text)}
            className="px-3 py-1 rounded-xl bg-[#FF5722] hover:bg-[#F4511E] text-white text-[11px] font-black uppercase tracking-wider shrink-0 transition-colors"
          >
            Search
          </button>
        </div>
      )}

      {/* ── Category Tabs (Multi-Selectable & Scrollable) ── */}
      <div className="-mx-1">
        <div className="flex items-center gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
          {dynamicCategories.map(tab => {
            const active = activeCategory.toLowerCase() === tab.id.toLowerCase();
            const Icon = tab.Icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`
                  flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-black
                  tracking-tight border transition-all shrink-0 active:scale-95
                  ${active
                    ? 'bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white border-[#FF5722] shadow-[0_4px_16px_rgba(255,87,34,0.35)] ring-1 ring-[#FF5722]'
                    : 'bg-[#141414] text-neutral-300 border-neutral-800 hover:border-neutral-700 hover:bg-[#1A1A1A]'
                  }
                `}
              >
                {Icon ? <Icon className="w-4 h-4 shrink-0" /> : <span>{tab.icon}</span>}
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 rounded-full font-bold ml-0.5 leading-5
                    ${active ? 'bg-black/30 text-white' : 'bg-neutral-800 text-neutral-400'}`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Secondary Facet Filters & Sort Row ── */}
      <div className="flex items-center justify-between gap-2 px-0.5 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Dietary toggle buttons */}
          <button
            onClick={() => setDietaryFilter(dietaryFilter === 'VEG' ? 'ALL' : 'VEG')}
            className={`
              flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all shrink-0 active:scale-95
              ${dietaryFilter === 'VEG'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700 shadow-sm'
                : 'bg-[#141414] text-neutral-400 border-neutral-800 hover:border-neutral-700'
              }
            `}
          >
            <PureVegTabIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Pure Veg</span>
            {dietaryFilter === 'VEG' && <Check className="w-3 h-3 stroke-[3]" />}
          </button>

          <button
            onClick={() => setDietaryFilter(dietaryFilter === 'NON_VEG' ? 'ALL' : 'NON_VEG')}
            className={`
              flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all shrink-0 active:scale-95
              ${dietaryFilter === 'NON_VEG'
                ? 'bg-rose-950/80 text-rose-300 border-rose-700 shadow-sm'
                : 'bg-[#141414] text-neutral-400 border-neutral-800 hover:border-neutral-700'
              }
            `}
          >
            <NonVegTabIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Non-Veg</span>
            {dietaryFilter === 'NON_VEG' && <Check className="w-3 h-3 stroke-[3]" />}
          </button>

          {/* Under ₹100 chip */}
          <button
            onClick={() => setUnder100(!under100Only)}
            className={`
              flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all shrink-0 active:scale-95
              ${under100Only
                ? 'bg-amber-500 text-black border-amber-400 shadow-[0_2px_12px_rgba(245,158,11,0.35)]'
                : 'bg-[#141414] text-neutral-400 border-neutral-800 hover:border-neutral-700'
              }
            `}
          >
            <Tag className={`w-3 h-3 ${under100Only ? 'text-black' : 'text-amber-400'}`} />
            <span>Under ₹100</span>
            {under100Only && <Check className="w-3 h-3 ml-0.5 stroke-[3]" />}
          </button>
        </div>

        {/* Sort selector & reset */}
        <div className="flex items-center gap-2">
          {/* Sorter */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-[#141414] border border-neutral-800 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-neutral-300
                         focus:outline-none focus:border-[#FF5722] cursor-pointer hover:bg-neutral-800 transition-colors"
            >
              <option value="RELEVANCE">🧠 Deep Relevance</option>
              <option value="PRICE_LOW">💵 Price: Low to High</option>
              <option value="PRICE_HIGH">💎 Price: High to Low</option>
              <option value="RATING">⭐ Top Rated</option>
              <option value="FASTEST">⚡ Fastest Dispatch</option>
            </select>
          </div>

          {/* Reset button */}
          {isFiltered && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold
                         bg-[#181818] hover:bg-neutral-800 text-neutral-300 hover:text-white
                         border border-neutral-800 hover:border-neutral-700 transition-all active:scale-95"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3 text-[#FF5722]" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Empty State & K-NN Nearest Neighbor Recommendations ── */}
      {results.length === 0 && (
        <div className="space-y-6 my-4">
          <div className="text-center py-12 px-4 rounded-3xl bg-[#121212] border border-neutral-800/80">
            <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto mb-3 text-neutral-500">
              <Utensils className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-white">No Exact Match Found</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto leading-relaxed">
              {query
                ? `Our deep engine could not find an exact dish for "${query}" with your active filters.`
                : 'No dishes available matching this filter combination.'}
            </p>
            <button
              onClick={handleReset}
              className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white
                         text-xs font-black uppercase tracking-wider transition-all shadow-[0_4px_16px_rgba(255,87,34,0.35)]
                         inline-flex items-center gap-1.5 active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          </div>

          {/* K-NN Recommendations */}
          {fallbackRecommendations.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-neutral-200">
                    Recommended Campus Alternatives
                  </h4>
                </div>
                <span className="text-[10px] text-neutral-500">Closest deep match</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fallbackRecommendations.map(item => (
                  <FoodItemCard
                    key={item.id}
                    item={item}
                    relevance={{ confidence: 85, matchedReasons: ['Nearest Alternative'] }}
                    cartItems={cartItems}
                    addToCart={addToCart}
                    updateQuantity={updateQuantity}
                    query={query}
                    renderHighlightedName={renderHighlightedName}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Main Results Grid (High-Definition Food Cards) ── */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {results.map(({ item, score, confidence, matchedReasons }) => (
            <FoodItemCard
              key={item.id}
              item={item}
              relevance={{ confidence, matchedReasons }}
              cartItems={cartItems}
              addToCart={addToCart}
              updateQuantity={updateQuantity}
              query={query}
              renderHighlightedName={renderHighlightedName}
            />
          ))}
        </div>
      )}

    </div>
  );
}

// ── High-Definition Visual Food Card Subcomponent ───────────────────────────
function FoodItemCard({
  item,
  relevance,
  cartItems,
  addToCart,
  updateQuantity,
  query,
  renderHighlightedName
}) {
  const cartItem = cartItems.find(i => i.id === item.id);
  const qty = cartItem?.quantity ?? 0;
  const isVeg = item.is_veg === 1 || item.is_veg === true;
  const dishImg = getDishImage(item);

  return (
    <div className="bg-[#121212] border border-neutral-800/90 rounded-2xl p-3 flex gap-3 shadow-md hover:border-neutral-700 transition-all group relative overflow-hidden">
      
      {/* Dish Image with Food Photography */}
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-neutral-900 border border-neutral-800">
        <img
          src={dishImg}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            // Fallback gracefully to default placeholder
            e.target.src = '/images/food/veg_thali.jpg';
          }}
        />
        <div className="absolute top-1.5 left-1.5">
          <FoodClassBadge isVeg={isVeg} size="sm" />
        </div>

        {/* Prep Time pill */}
        <div className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-bold text-neutral-300 flex items-center gap-0.5">
          <Clock className="w-2.5 h-2.5 text-amber-400" />
          <span>15-20m</span>
        </div>
      </div>

      {/* Dish Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          {/* Deep Match & Intent Badges */}
          {query.trim() && relevance && (
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${
                relevance.confidence >= 90
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60'
                  : 'bg-amber-950/70 text-amber-300 border-amber-700/60'
              }`}>
                ⚡ {relevance.confidence}% Match
              </span>
              {relevance.matchedReasons && relevance.matchedReasons[0] && (
                <span className="text-[9px] text-neutral-400 font-medium truncate max-w-[120px]">
                  • {relevance.matchedReasons[0]}
                </span>
              )}
            </div>
          )}

          {/* Dish Name */}
          <h4 className="text-xs sm:text-sm font-black text-white group-hover:text-[#FF7043] transition-colors leading-tight line-clamp-1">
            {renderHighlightedName(item.name)}
          </h4>

          {/* Description snippet */}
          {item.description && (
            <p className="text-[10px] text-neutral-400 line-clamp-2 mt-0.5 leading-snug">
              {item.description}
            </p>
          )}
        </div>

        {/* Price & Action Row */}
        <div className="flex items-center justify-between mt-2 pt-1 border-t border-neutral-800/60">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm sm:text-base font-black text-white">
              ₹{item.customer_price}
            </span>
            <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">
              {item.category}
            </span>
          </div>

          {/* Cart Stepper */}
          <div>
            {qty === 0 ? (
              <button
                onClick={() => addToCart(item)}
                className="flex items-center gap-1 px-3 py-1 rounded-xl
                           bg-[#1C1410] hover:bg-[#FF5722] hover:text-white
                           border border-[#FF5722]/50 hover:border-[#FF5722]
                           text-xs font-black text-[#FF7043]
                           transition-all active:scale-95 shadow-sm"
              >
                <Plus className="w-3 h-3" />
                <span>ADD</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white rounded-xl px-2 py-0.5 shadow-[0_2px_8px_rgba(255,87,34,0.35)]">
                <button
                  onClick={() => updateQuantity(item.id, -1)}
                  className="p-0.5 hover:opacity-80 transition-opacity active:scale-90"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-xs font-black px-1 min-w-[1rem] text-center">{qty}</span>
                <button
                  onClick={() => updateQuantity(item.id, 1)}
                  className="p-0.5 hover:opacity-80 transition-opacity active:scale-90"
                  aria-label="Increase quantity"
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
}
