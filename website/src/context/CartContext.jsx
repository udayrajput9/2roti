import React, { createContext, useContext, useState, useEffect } from 'react';

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

  const addToCart = (item) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId) => {
    setCartItems(prev => prev.filter(i => i.id !== itemId));
  };

  const updateQuantity = (itemId, delta) => {
    setCartItems(prev => {
      return prev
        .map(i => {
          if (i.id === itemId) {
            const newQty = i.quantity + delta;
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

  const [sysSettings, setSysSettings] = useState({ delivery_fee: 15, free_delivery_threshold: 100 });

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.settings) {
          setSysSettings({
            ...d.settings,
            delivery_fee: parseFloat(d.settings.delivery_fee) || 15,
            free_delivery_threshold: parseFloat(d.settings.free_delivery_threshold) || 100,
          });
        }
      })
      .catch(console.error);
  }, []);

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
  const deliveryFee = hasOutletItems ? 0 : (itemsTotal >= sysSettings.free_delivery_threshold || itemsTotal === 0 ? 0 : sysSettings.delivery_fee);
  const grandTotal = itemsTotal + deliveryFee;

  // Data Structure Optimization: O(1) Map hash index for instant item quantity queries
  const cartQtyMap = React.useMemo(() => {
    const map = new Map();
    for (let i = 0; i < cartItems.length; i++) {
      map.set(cartItems[i].id, cartItems[i].quantity);
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
