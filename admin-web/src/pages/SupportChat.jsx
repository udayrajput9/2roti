import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Phone,
  Clock,
  MapPin,
  CheckCircle2,
  RefreshCw,
  Search,
  User,
  ShoppingBag,
  AlertCircle,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function SupportChat() {
  const { staff } = useAdminAuth();
  const [threads, setThreads] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch threads on load and poll every 3 seconds
  useEffect(() => {
    fetchThreads();
    const interval = setInterval(fetchThreads, 3000);
    return () => clearInterval(interval);
  }, []);

  // Poll messages for active order
  useEffect(() => {
    if (selectedOrderId) {
      fetchOrderMessages(selectedOrderId);
      const interval = setInterval(() => fetchOrderMessages(selectedOrderId, true), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedOrderId]);

  const fetchThreads = async () => {
    try {
      const res = await fetch('/api/chat/admin/threads');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setThreads(data.threads || []);
          // Auto-select first thread if none selected
          if (!selectedOrderId && data.threads && data.threads.length > 0) {
            setSelectedOrderId(data.threads[0].id);
          }
        }
      }
    } catch (e) {
      console.error('Fetch threads error:', e);
    } finally {
      setLoadingThreads(false);
    }
  };

  const fetchOrderMessages = async (orderId, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await fetch(`/api/chat/admin/order/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setActiveOrder(data.order);
          setMessages(data.messages || []);
        }
      }
    } catch (e) {
      console.error('Fetch messages error:', e);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedOrderId || sending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const res = await fetch(`/api/chat/admin/order/${selectedOrderId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.message) {
          setMessages(prev => [...prev, data.message]);
          fetchThreads();
        }
      }
    } catch (e) {
      console.error('Send message error:', e);
    } finally {
      setSending(false);
    }
  };

  const sendQuickReply = (text) => {
    setInputText(text);
  };

  const filteredThreads = threads.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (t.order_token && t.order_token.toLowerCase().includes(q)) ||
      (t.customer_name && t.customer_name.toLowerCase().includes(q)) ||
      (t.customer_phone && t.customer_phone.includes(q)) ||
      (t.location_name && t.location_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 sm:p-6 h-[calc(100vh-64px)] flex flex-col space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#111827] border border-slate-800 p-4 rounded-3xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-white flex items-center gap-2">
              Customer Support Live Chat
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                Active Desk
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Order-based customer query resolution. Data retained strictly for 4 days.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-2xl">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Agent: <strong className="text-white">{staff?.name}</strong> ({staff?.role})</span>
        </div>
      </div>

      {/* Main Dual-Pane Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-0">
        
        {/* Left Pane: Threads List */}
        <div className="md:col-span-5 lg:col-span-4 bg-[#111827] border border-slate-800 rounded-3xl flex flex-col min-h-0 overflow-hidden">
          {/* Search Bar */}
          <div className="p-3 border-b border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by order #, student or phone..."
                className="w-full bg-[#1F2937] border border-slate-700 rounded-2xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
              />
            </div>
          </div>

          {/* Threads Scrollable Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {loadingThreads && threads.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Loading active chat threads...
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-400">No Chat Inquiries</p>
                <p className="text-[11px] text-slate-500">
                  {searchQuery ? 'No conversations match search query.' : 'Students will appear here once they send a message regarding their order.'}
                </p>
              </div>
            ) : (
              filteredThreads.map(thread => {
                const isSelected = selectedOrderId === thread.id;
                return (
                  <div
                    key={thread.id}
                    onClick={() => setSelectedOrderId(thread.id)}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#1F2937] border-l-4 border-l-[#FF5722]'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white truncate">{thread.customer_name}</span>
                          <span className="text-[10px] font-bold text-[#FF7043] bg-[#FF5722]/10 px-1.5 py-0.5 rounded-md">
                            {thread.order_token}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {thread.location_name}
                          </span>
                          <span>•</span>
                          <span className="font-bold text-slate-300">₹{parseFloat(thread.total_customer_price || 0).toFixed(0)}</span>
                        </div>
                      </div>

                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase ${
                        thread.order_status === 'DELIVERED'
                          ? 'bg-slate-800 text-slate-400'
                          : thread.order_status === 'READY'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}>
                        {thread.order_status}
                      </span>
                    </div>

                    {thread.last_message && (
                      <p className="text-[11px] text-slate-400 mt-2 truncate font-medium">
                        <span className={thread.last_message_sender === 'CUSTOMER' ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                          {thread.last_message_sender === 'CUSTOMER' ? 'Student: ' : 'You: '}
                        </span>
                        {thread.last_message}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Chat Conversation */}
        <div className="md:col-span-7 lg:col-span-8 bg-[#111827] border border-slate-800 rounded-3xl flex flex-col min-h-0 overflow-hidden">
          {selectedOrderId && activeOrder ? (
            <>
              {/* Active Order Details Bar */}
              <div className="p-3.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#FF5722]/15 text-[#FF5722] flex items-center justify-center font-black text-xs">
                    {activeOrder.customer_name ? activeOrder.customer_name.slice(0, 2).toUpperCase() : '2R'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">{activeOrder.customer_name}</span>
                      <span className="text-[11px] font-bold text-amber-400">({activeOrder.order_token})</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>{activeOrder.location_name}</span>
                      <span>•</span>
                      <span>₹{parseFloat(activeOrder.total_customer_price || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeOrder.customer_phone && (
                    <a
                      href={`tel:${activeOrder.customer_phone}`}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-950 border border-emerald-800 hover:bg-emerald-900/80 text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3 h-3" />
                      <span>+91 {activeOrder.customer_phone}</span>
                    </a>
                  )}
                  <span className="px-2 py-1 rounded-xl bg-slate-800 text-[10px] font-black uppercase text-slate-300">
                    {activeOrder.order_status}
                  </span>
                </div>
              </div>

              {/* Order Items Snapshot Strip */}
              {activeOrder.items && activeOrder.items.length > 0 && (
                <div className="bg-slate-950/50 px-3.5 py-1.5 border-b border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400 overflow-x-auto scrollbar-none">
                  <ShoppingBag className="w-3 h-3 text-[#FF5722] shrink-0" />
                  <span className="font-bold text-slate-300 shrink-0">Items:</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {activeOrder.items.map(item => (
                      <span key={item.id} className="bg-slate-800/80 px-2 py-0.5 rounded-lg text-slate-300 text-[10px]">
                        {item.quantity}x {item.item_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages Stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                <div className="text-center my-2">
                  <span className="text-[10px] text-slate-500 bg-slate-900/80 border border-slate-800 px-3 py-1 rounded-full">
                    Conversation history is preserved for 4 days
                  </span>
                </div>

                {loadingMessages && messages.length === 0 ? (
                  <div className="text-center text-xs text-slate-500 py-8">
                    Loading conversation...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-400">No Messages Yet</p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      Send a message to update the student about their order or address any inquiry.
                    </p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isFromAdmin = msg.sender_type === 'ADMIN';
                    return (
                      <div
                        key={msg.id || msg.created_at}
                        className={`flex flex-col ${isFromAdmin ? 'items-end' : 'items-start'}`}
                      >
                        <div className="text-[10px] text-slate-500 mb-0.5 px-1 font-semibold">
                          {isFromAdmin ? `Support (${msg.sender_name})` : msg.sender_name}
                        </div>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                            isFromAdmin
                              ? 'bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white rounded-br-none'
                              : 'bg-slate-800 border border-slate-700 text-slate-100 rounded-bl-none'
                          }`}
                        >
                          {msg.message}
                        </div>
                        <span className="text-[9px] text-slate-500 mt-1 px-1">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Canned Resolution Chips */}
              <div className="px-3 py-2 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <span className="text-[10px] font-black uppercase text-slate-500 shrink-0">Quick:</span>
                {[
                  'Your order is being freshly cooked!',
                  'Runner has arrived at campus gate!',
                  'Checking with kitchen manager right now.',
                  'Your hot meal is dispatched!'
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendQuickReply(chip)}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-semibold whitespace-nowrap transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a response to the student..."
                  className="flex-1 bg-[#1F2937] border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#F4511E] text-white font-black text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-2">
              <MessageSquare className="w-10 h-10 text-slate-700" />
              <p className="text-xs font-bold text-slate-400">Select a conversation from the left pane</p>
              <p className="text-[11px] text-slate-600 max-w-sm">
                Each inquiry is tied to a specific order so you can verify order status, delivery campus, and items in real time.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
