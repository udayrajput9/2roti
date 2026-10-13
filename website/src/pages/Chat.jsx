import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  ShoppingBag,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Phone,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  QrCode
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ChatPage({ onOpenAuth, onNavigateToTab }) {
  const { user, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load eligible orders
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    } else {
      setLoadingOrders(false);
    }
  }, [isAuthenticated]);

  // Poll messages for the active order
  useEffect(() => {
    if (selectedOrderId) {
      fetchMessages(selectedOrderId);
      const interval = setInterval(() => fetchMessages(selectedOrderId, true), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedOrderId]);

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const res = await fetch('/api/chat/customer/orders');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const ordList = data.orders || [];
          setOrders(ordList);
          if (ordList.length > 0) {
            setSelectedOrderId(ordList[0].id);
            setSelectedOrder(ordList[0]);
          }
        }
      }
    } catch (e) {
      console.error('Fetch chat orders error:', e);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchMessages = async (orderId, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await fetch(`/api/chat/customer/order/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.order) setSelectedOrder(data.order);
          setMessages(data.messages || []);
        }
      }
    } catch (e) {
      console.error('Fetch order chat error:', e);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedOrderId || sending) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const res = await fetch(`/api/chat/customer/order/${selectedOrderId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.message) {
          setMessages(prev => [...prev, data.message]);
        }
      }
    } catch (e) {
      console.error('Send message error:', e);
    } finally {
      setSending(false);
    }
  };

  const handleShareDeliveryQr = async () => {
    if (!selectedOrderId || !selectedOrder || sending) return;
    const token = selectedOrder.order_token;
    const secret = selectedOrder.delivery_otp || '';
    const customer = selectedOrder.customer_name || user?.name || 'Customer';

    const qrPayload = JSON.stringify({ token, secret, customer });
    const text = `[DELIVERY_QR_CODE]\nOrder: ${token}\nSecret Code: ${secret}\nPayload: ${qrPayload}`;

    setSending(true);
    try {
      const res = await fetch(`/api/chat/customer/order/${selectedOrderId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.message) {
          setMessages(prev => [...prev, data.message]);
        }
      }
    } catch (e) {
      console.error('Share QR error:', e);
    } finally {
      setSending(false);
    }
  };

  const handleSelectOrder = (order) => {
    setSelectedOrderId(order.id);
    setSelectedOrder(order);
  };

  // 1. Not Authenticated State
  if (!isAuthenticated) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="bg-[#141414] border border-neutral-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-[#FF5722]/15 text-[#FF5722] flex items-center justify-center mx-auto">
            <MessageSquare className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Live Order Support</h2>
            <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
              Login to chat directly with our kitchen and delivery team regarding your orders.
            </p>
          </div>
          <button
            onClick={onOpenAuth}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>Login to Chat</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // 2. Loading State
  if (loadingOrders) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-xs text-neutral-500">
        Loading order support desk...
      </div>
    );
  }

  // 3. User has NO Orders -> Explicitly NO CHAT allowed as per strict rule
  if (orders.length === 0) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="bg-[#141414] border border-neutral-800 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-lg font-black text-white">Order-Linked Support Desk</h2>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              Chat support is strictly activated for placed campus orders. You do not have any active or recent orders to chat about right now.
            </p>
          </div>

          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-2xl text-[11px] text-neutral-400 text-left space-y-1">
            <div className="flex items-center gap-1.5 text-white font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>How 2Roti Support Works:</span>
            </div>
            <p>1. Place your meal order during scheduled batch hours.</p>
            <p>2. Select your order here to message kitchen staff or track campus delivery status in real-time.</p>
          </div>

          <button
            onClick={() => onNavigateToTab && onNavigateToTab('home')}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>Explore Campus Menu & Order</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // 4. User has Orders -> Active Order Selector & Chat Screen
  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-3 pb-24 md:pb-12 h-[calc(100vh-80px)] flex flex-col space-y-3">
      
      {/* Order Selector Card */}
      <div className="bg-[#141414] border border-neutral-800 rounded-2xl p-3 shadow-lg shrink-0 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-black text-neutral-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-[#FF5722]" />
            <span>Select Order for Support:</span>
          </span>
          <span className="text-[10px] text-neutral-500 font-bold">
            Data kept for 4 days
          </span>
        </div>

        {/* Order Horizontal Pills */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          {orders.map(ord => {
            const isSelected = selectedOrderId === ord.id;
            return (
              <button
                key={ord.id}
                onClick={() => handleSelectOrder(ord)}
                className={`p-2.5 rounded-xl border text-left shrink-0 transition-all flex items-center gap-2.5 ${
                  isSelected
                    ? 'bg-[#FF5722]/15 border-[#FF5722] text-white shadow-[0_0_15px_rgba(255,87,34,0.2)]'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <div>
                  <div className="text-xs font-black flex items-center gap-1.5">
                    <span>{ord.order_token}</span>
                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase ${
                      ord.order_status === 'DELIVERED'
                        ? 'bg-neutral-800 text-neutral-400'
                        : 'bg-emerald-950 text-emerald-400'
                    }`}>
                      {ord.order_status}
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">
                    ₹{parseFloat(ord.total_customer_price || 0).toFixed(0)} • {ord.location_name}
                  </div>
                  {ord.items && ord.items.length > 0 && (
                    <div className="text-[10px] text-[#FF7043] font-medium truncate max-w-[190px] mt-0.5">
                      {ord.items.map(it => `${it.quantity}x ${it.item_name}`).join(', ')}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Messages Frame */}
      <div className="flex-1 bg-[#121212] border border-neutral-800 rounded-3xl flex flex-col min-h-0 overflow-hidden shadow-xl">
        
        {/* Chat Active Header */}
        <div className="px-4 py-2.5 bg-[#181818] border-b border-neutral-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#FF5722] flex items-center justify-center font-black text-white text-xs">
              2R
            </div>
            <div>
              <div className="text-xs font-black text-white flex items-center gap-1.5">
                <span>Support Team</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="text-[10px] text-neutral-400">
                Helping with {selectedOrder?.order_token}
              </div>
            </div>
          </div>

          <div className="text-right text-[11px] text-neutral-400">
            <span className="font-bold text-white">₹{parseFloat(selectedOrder?.total_customer_price || 0).toFixed(2)}</span>
            <div className="text-[10px] text-[#FF7043] font-semibold">{selectedOrder?.location_name} Drop</div>
          </div>
        </div>

        {/* Order Food Content Summary Bar */}
        {selectedOrder && selectedOrder.items && selectedOrder.items.length > 0 && (
          <div className="px-3.5 py-2 bg-[#161616] border-b border-neutral-800 shrink-0 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-neutral-300 font-bold">
                <ShoppingBag className="w-3.5 h-3.5 text-[#FF5722]" />
                <span>Order Content ({selectedOrder.items.length} items):</span>
              </div>
              {selectedOrder.delivery_otp && selectedOrder.order_status !== 'DELIVERED' && (
                <span className="text-[10px] font-bold text-neutral-400">
                  OTP: <strong className="text-amber-400 font-mono tracking-widest">{selectedOrder.delivery_otp}</strong>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedOrder.items.map(item => (
                <span
                  key={item.id || item.item_name}
                  className="px-2 py-0.5 rounded-lg bg-neutral-900 border border-neutral-700/80 text-[11px] text-neutral-200 font-medium flex items-center gap-1"
                >
                  <span className="font-bold text-[#FF7043]">{item.quantity}x</span>
                  <span>{item.item_name}</span>
                  <span className="text-[10px] text-neutral-400">
                    (₹{(parseFloat(item.customer_price || 0) * (item.quantity || 1)).toFixed(0)})
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Quick Delivery QR One-Click Banner */}
        {selectedOrder && selectedOrder.order_status !== 'DELIVERED' && (
          <div className="px-3 py-2 bg-gradient-to-r from-amber-950/70 via-neutral-900 to-amber-950/70 border-b border-amber-500/25 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                <QrCode className="w-3.5 h-3.5" />
              </div>
              <div className="text-[11px] leading-tight">
                <span className="font-bold text-white">Delivery Agent asking for QR?</span>
                <span className="text-amber-300/80 block text-[10px]">Tap to send your gate delivery verification QR</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleShareDeliveryQr}
              disabled={sending}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-[11px] shadow-sm flex items-center gap-1 active:scale-95 transition-all shrink-0"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Send QR Code</span>
            </button>
          </div>
        )}

        {/* Messages Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0">
          <div className="text-center my-1">
            <span className="text-[10px] text-neutral-500 bg-neutral-900 border border-neutral-800 px-3 py-1 rounded-full">
              Messages expire after 4 days automatically
            </span>
          </div>

          {/* Pinned Order Food Items Card in Stream */}
          {selectedOrder && (
            <div className="bg-[#181818] border border-neutral-800 rounded-2xl p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-black text-white text-xs flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-[#FF5722]" />
                  <span>Order: {selectedOrder.order_token}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-950/80 text-orange-400 border border-orange-800/60">
                  {selectedOrder.order_status}
                </span>
              </div>
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="divide-y divide-neutral-800/80 bg-neutral-900/60 rounded-xl p-2 space-y-1">
                  {selectedOrder.items.map(it => (
                    <div key={it.id || it.item_name} className="flex items-center justify-between text-[11px] pt-1 first:pt-0">
                      <span className="text-neutral-200">
                        <strong className="text-white">{it.quantity}x</strong> {it.item_name}
                      </span>
                      <span className="font-bold text-neutral-300">
                        ₹{(parseFloat(it.customer_price || 0) * (it.quantity || 1)).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-800/60">
                <span>📍 Drop: <strong className="text-white">{selectedOrder.location_name}</strong></span>
                <span>Total: <strong className="text-emerald-400">₹{parseFloat(selectedOrder.total_customer_price || 0).toFixed(2)}</strong></span>
              </div>
            </div>
          )}

          {loadingMessages && messages.length === 0 ? (
            <div className="text-center text-xs text-neutral-500 py-8">
              Connecting to order conversation...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <MessageSquare className="w-8 h-8 text-neutral-600 mx-auto" />
              <p className="text-xs font-bold text-neutral-300">No Messages on this Order</p>
              <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">
                Need extra spoons, directions to your hostel gate, or preparation updates? Send a message below!
              </p>
            </div>
          ) : (
            messages.map(msg => {
              const isMine = msg.sender_type === 'CUSTOMER';
              return (
                <div
                  key={msg.id || msg.created_at}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div className="text-[10px] text-neutral-500 mb-0.5 px-1 font-semibold">
                    {isMine ? 'You' : `2Roti Support (${msg.sender_name})`}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl p-2.5 text-xs leading-relaxed shadow-sm ${
                      isMine
                        ? 'bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white rounded-br-none'
                        : 'bg-[#1E1E1E] border border-neutral-700/80 text-neutral-100 rounded-bl-none'
                    }`}
                  >
                    {msg.message.includes('[DELIVERY_QR_CODE]') ? (
                      <div className="bg-[#141414] border border-amber-500/40 rounded-2xl p-3 text-center space-y-2 text-white">
                        <div className="flex items-center justify-center gap-1.5 text-amber-400 text-[11px] font-black uppercase tracking-wider">
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Delivery QR & Secret Code</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl inline-block mx-auto shadow-md">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                              msg.message.includes('Payload: ')
                                ? msg.message.split('Payload: ')[1]
                                : selectedOrder?.order_token || ''
                            )}`}
                            alt="Delivery QR"
                            className="w-28 h-28 mx-auto"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-xs font-black text-white">
                            {selectedOrder?.customer_name || 'Campus Student'}
                          </div>
                          <div className="text-[11px] font-bold text-amber-400">
                            {msg.message.match(/Order: (.*?)(?:\n|$)/)?.[1] || selectedOrder?.order_token}
                          </div>
                          {msg.message.match(/Secret Code: (.*?)(?:\n|$)/)?.[1] && (
                            <div className="bg-amber-950/80 border border-amber-700/60 rounded-lg py-0.5 px-2 text-xs font-black tracking-widest text-amber-200 mt-1">
                              OTP: {msg.message.match(/Secret Code: (.*?)(?:\n|$)/)?.[1]}
                            </div>
                          )}
                          <div className="text-[9px] text-neutral-400 pt-1">
                            Show this to campus delivery runner during batch delivery dispatch
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="px-1.5 py-0.5">{msg.message}</div>
                    )}
                  </div>
                  {!isMine && (msg.message.toLowerCase().includes('qr') || msg.message.toLowerCase().includes('otp') || msg.message.toLowerCase().includes('agent')) && selectedOrder?.order_status !== 'DELIVERED' && (
                    <div className="mt-1.5 p-2 bg-gradient-to-r from-amber-950/80 to-orange-950/80 border border-amber-500/50 rounded-2xl flex items-center justify-between gap-3 max-w-[85%] shadow-md">
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-200 font-bold">
                        <QrCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Agent requested Delivery QR</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleShareDeliveryQr}
                        disabled={sending}
                        className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-black font-black text-[10px] flex items-center gap-1 active:scale-95 transition-all shadow-sm shrink-0"
                      >
                        <QrCode className="w-3 h-3" />
                        <span>Click to Send</span>
                      </button>
                    </div>
                  )}
                  <span className="text-[9px] text-neutral-500 mt-1 px-1">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-1.5 bg-[#161616] border-t border-neutral-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          <button
            type="button"
            onClick={handleShareDeliveryQr}
            className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-600/30 to-orange-600/30 border border-amber-500/50 hover:bg-amber-600/40 text-[10px] text-amber-300 font-bold whitespace-nowrap flex items-center gap-1 transition-all active:scale-95"
          >
            <QrCode className="w-3 h-3 text-amber-400" />
            <span>📲 Share Delivery QR Code</span>
          </button>
          {[
            'Where is my delivery runner?',
            'Please call me once you reach gate.',
            'Can you add extra napkins/spoon?',
            'How much longer for food preparation?'
          ].map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setInputText(chip)}
              className="px-2.5 py-1 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-[10px] text-neutral-300 font-semibold whitespace-nowrap transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Message Input Box */}
        <form onSubmit={handleSendMessage} className="p-3 bg-[#161616] border-t border-neutral-800 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleShareDeliveryQr}
            title="Share Delivery QR Code with Support Agent"
            className="p-2.5 rounded-2xl bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-white transition-all active:scale-95 shrink-0 flex items-center justify-center"
          >
            <QrCode className="w-4 h-4 text-amber-400" />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message regarding ${selectedOrder?.order_token}...`}
            className="flex-1 bg-neutral-900 border border-neutral-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF5722]"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#F4511E] text-white font-black text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50 active:scale-95 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>

      </div>

    </div>
  );
}
