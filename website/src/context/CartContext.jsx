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

  const totalCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const itemsTotal = cartItems.reduce((sum, i) => sum + (parseFloat(i.customer_price) * i.quantity), 0);
  
  // Check if cart contains only outlet items (outlet pickup) vs campus delivery
  // If order contains regular delivery items (like Chicken Curry + Tandoori Roti), it's a delivery order
  const hasDeliveryItems = cartItems.some(i => !(i.is_outlet_only === 1 || i.is_outlet_only === true));
  const hasOutletItems = cartItems.length > 0 && !hasDeliveryItems;
  
  // Delivery Fee calculation
  // Outlet order: 0 delivery fee
  // Campus order: 0 if itemsTotal >= 100, else 15
  const deliveryFee = hasOutletItems ? 0 : (itemsTotal >= 100 || itemsTotal === 0 ? 0 : 15);
  const grandTotal = itemsTotal + deliveryFee;

  return (
    <CartContext.Provider
      value={{
        cartItems,
        totalCount,
        itemsTotal,
        deliveryFee,
        grandTotal,
        hasOutletItems,
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
