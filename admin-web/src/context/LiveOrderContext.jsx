import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAdminAuth } from './AdminAuthContext';

const LiveOrderContext = createContext(null);

export function LiveOrderProvider({ children }) {
  const { staff, isAuthenticated } = useAdminAuth();
  const [orders, setOrders] = useState([]);
  const [lastAlert, setLastAlert] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  // Audio Chime synthesizer using Web Audio API
  const playAlertChime = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      // Two-tone bell chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2); // A5

      osc2.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc2.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.2); // E5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 1.2);
      osc2.stop(ctx.currentTime + 1.2);
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  };

  // Fetch initial orders
  const fetchOrders = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/orders/staff');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.orders) {
          setOrders(data.orders);
        }
      }
    } catch (e) {
      console.error('Failed to load initial orders:', e);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchOrders();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      // Identify with backend
      ws.send(JSON.stringify({
        type: 'IDENTIFY',
        role: staff?.role,
        staffId: staff?.id,
        outletLocationId: staff?.outlet_location_id
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'NEW_ORDER') {
          playAlertChime();
          setLastAlert(msg.data);
          setOrders(prev => [msg.data, ...prev]);
        } else if (msg.type === 'ORDER_STATUS_CHANGED') {
          setOrders(prev => prev.map(o => o.id === msg.data.id ? { ...o, ...msg.data } : o));
        }
      } catch (err) {
        console.error('WebSocket parse error:', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    return () => {
      if (ws) ws.close();
    };
  }, [isAuthenticated, staff]);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_status: newStatus })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Status update failed.');
      }
      setOrders(prev => prev.map(o => o.id === orderId ? data.order : o));
      return data.order;
    } catch (err) {
      throw err;
    }
  };

  const assignRunner = async (orderId, runnerName, runnerPhone) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/assign-runner`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runner_name: runnerName, runner_phone: runnerPhone })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Runner assignment failed.');
      }
      setOrders(prev => prev.map(o => o.id === orderId ? data.order : o));
      return data.order;
    } catch (err) {
      throw err;
    }
  };

  const verifyPayment = async (orderId) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/verify-payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Payment verification failed.');
      }
      setOrders(prev => prev.map(o => o.id === orderId ? data.order : o));
      return data.order;
    } catch (err) {
      throw err;
    }
  };

  return (
    <LiveOrderContext.Provider
      value={{
        orders,
        connected,
        lastAlert,
        dismissAlert: () => setLastAlert(null),
        playAlertChime,
        updateOrderStatus,
        assignRunner,
        verifyPayment,
        refreshOrders: fetchOrders
      }}
    >
      {children}
    </LiveOrderContext.Provider>
  );
}

export function useLiveOrders() {
  const context = useContext(LiveOrderContext);
  if (!context) {
    throw new Error('useLiveOrders must be used within a LiveOrderProvider');
  }
  return context;
}
