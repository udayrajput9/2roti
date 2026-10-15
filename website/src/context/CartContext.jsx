import React, { createContext, useContext, useState, useEffect } from 'react';
import { isCurryOrThaliItem, isBreadOrAddonItem } from '../utils/comboValidation';
import { trackCartAdd, trackCartRemove } from '../utils/activityTracker';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('2roti_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('2roti_cart', JSON.stringify(cartItems));
    } catch (e) {}
  }, [cartItems]);

  // Auto-prune orphan bread/roti items if no Curry or Thali dish exists in the cart
  useEffect(() => {
    const hasCurryOrThali = cartItems.some(i => isCurryOrThaliItem(i) && i.quantity > 0);
    if (!hasCurryOrThali) {
      const hasOrphanBreads = cartItems.some(i => isBreadOrAddonItem(i));
      if (hasOrphanBreads) {
        setCartItems(prev => prev.filter(i => !isBreadOrAddonItem(i)));
      }
    }
  }, [cartItems]);

  const [sysSettings, setSysSettings] = useState({ delivery_fee: 10, free_delivery_threshold: 100 });

  const fetchSettings = () => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.settings) {
          setSysSettings({
            ...d.settings,
            delivery_fee: parseFloat(d.settings.delivery_fee) === 15 ? 10 : (parseFloat(d.settings.delivery_fee) || 10),
            free_delivery_threshold: parseFloat(d.settings.free_delivery_threshold) || 100,
          });
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchSettings();
    const interval = setInterval(fetchSettings, 20000);
    window.addEventListener('focus', fetchSettings);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', fetchSettings);
    };
  }, []);

  const isPaymentsStopped = Boolean(
    sysSettings.emergency_stop_payments === 'true' ||
    sysSettings.kitchen_status === 'STOPPED'
  );
  const paymentsClosedMessage = 'Please continue order tomorrow from 8:00 AM to 7:00 PM.';

  const addToCart = (item) => {
    if (isPaymentsStopped) {
      alert(paymentsClosedMessage);
      return false;
    }
    if (isBreadOrAddonItem(item)) {
      const hasCurryOrThali = cartItems.some(i => isCurryOrThaliItem(i) && i.quantity > 0);
      if (!hasCurryOrThali) {
        alert('⚠️ Roti & Breads can only be ordered in a combo with Curry or Thali. Please add a Curry or Thali dish first!');
        return false;
      }
    }
    setCartItems(prev => {
      const existing = prev.find(i => String(i.id) === String(item.id));
      if (existing) {
        return prev.map(i => String(i.id) === String(item.id) ? { ...i, quantity: Math.min(i.quantity + 1, 50) } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    // Trigger lightweight activity tracking
    trackCartAdd(item, 1);
    return true;
  };

  const removeFromCart = (itemId) => {
    trackCartRemove(itemId);
    setCartItems(prev => prev.filter(i => String(i.id) !== String(itemId)));
  };

  const updateQuantity = (itemId, delta) => {
    if (isPaymentsStopped && delta > 0) {
      alert(paymentsClosedMessage);
      return;
    }
    setCartItems(prev => {
      return prev
        .map(i => {
          if (String(i.id) === String(itemId)) {
            const newQty = Math.min(Math.max(0, i.quantity + delta), 50);
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean);
    });
  };

  const clearCart = () => {
    setCartItems([]);
  };

  // Algorithm Optimization: useMemo + Single-Pass Accumulator O(N)
  // Replaces 3 separate array passes (reduce, reduce, some) and caches value across non-cart re-renders
  const { totalCount, itemsTotal, hasOutletItems } = React.useMemo(() => {
    let count = 0;
    let total = 0;
    let hasDelivery = false;

    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      count += item.quantity;
      total += (parseFloat(item.customer_price) || 0) * item.quantity;
      if (!(item.is_outlet_only === 1 || item.is_outlet_only === true)) {
        hasDelivery = true;
      }
    }

    return {
      totalCount: count,
      itemsTotal: total,
      hasOutletItems: cartItems.length > 0 && !hasDelivery
    };
  }, [cartItems]);
  
  // Delivery Fee calculation
  // Outlet order: 0 delivery fee; Campus order: 0 if itemsTotal >= threshold, else fee
  const activeDeliveryFee = sysSettings.delivery_fee === 15 ? 10 : (sysSettings.delivery_fee || 10);
  const deliveryFee = hasOutletItems ? 0 : (itemsTotal >= sysSettings.free_delivery_threshold || itemsTotal === 0 ? 0 : activeDeliveryFee);
  const grandTotal = itemsTotal + deliveryFee;

  // Data Structure Optimization: O(1) Map hash index for instant item quantity queries
  const cartQtyMap = React.useMemo(() => {
    const map = new Map();
    for (let i = 0; i < cartItems.length; i++) {
      map.set(cartItems[i].id, cartItems[i].quantity);
      map.set(String(cartItems[i].id), cartItems[i].quantity);
    }
    return map;
  }, [cartItems]);

  const getItemQty = React.useCallback((id) => {
    return cartQtyMap.get(id) || 0;
  }, [cartQtyMap]);

  return (
    <CartContext.Provider
      value={{
        sysSettings,
        isPaymentsStopped,
        paymentsClosedMessage,
        refreshSettings: fetchSettings,
        cartItems,
        totalCount,
        itemsTotal,
        deliveryFee,
        grandTotal,
        hasOutletItems,
        getItemQty,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
