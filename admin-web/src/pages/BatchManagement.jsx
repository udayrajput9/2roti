import React, { useState, useEffect } from 'react';
import {
  Clock,
  Layers,
  Plus,
  Play,
  Pause,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Printer,
  Truck,
  Lock,
  ChevronRight,
  Info,
  X
} from 'lucide-react';

export default function BatchManagement() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [serverTime, setServerTime] = useState('');
  const [serverTime12h, setServerTime12h] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    payment_start_time: '15:00',
    payment_end_time: '18:00',
    kitchen_cutoff_time: '18:01',
    slips_ready_time: '18:10',
    dispatch_time: '19:30',
    is_active: true,
    description: ''
  });

  const loadBatches = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch('/api/admin/batches');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setBatches(data.batches || []);
          setServerTime(data.server_time_ist || '');
          setServerTime12h(data.server_time_12h || '');
        }
      }
    } catch (e) {
      console.error('Failed to load batches:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBatches();
    const timer = setInterval(() => loadBatches(false), 20000);
    return () => clearInterval(timer);
  }, []);

  const showNotification = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 5000);
  };

  // Toggle Batch Active/Paused
  const handleToggle = async (id, currentStatus, name) => {
    try {
      const res = await fetch(`/api/admin/batches/${id}/toggle`, { method: 'PATCH' });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(`✅ Batch "${name}" is now ${data.is_active ? 'ACTIVE' : 'PAUSED'}.`);
        loadBatches();
      } else {
        alert(data.message || 'Failed to toggle batch.');
      }
    } catch (e) {
      alert('Error updating batch status.');
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setFormData({
      name: '',
      payment_start_time: '11:00',
      payment_end_time: '13:00',
      kitchen_cutoff_time: '13:01',
      slips_ready_time: '13:10',
      dispatch_time: '14:30',
      is_active: true,
      description: ''
    });
    setIsCreateOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (batch) => {
    setSelectedBatch(batch);
    setFormData({
      name: batch.name || '',
      payment_start_time: batch.payment_start_time || '15:00',
      payment_end_time: batch.payment_end_time || '18:00',
      kitchen_cutoff_time: batch.kitchen_cutoff_time || '18:01',
      slips_ready_time: batch.slips_ready_time || '18:10',
      dispatch_time: batch.dispatch_time || '19:30',
      is_active: Boolean(batch.is_active),
      description: batch.description || ''
    });
    setIsEditOpen(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert('Please enter batch name.');

    try {
      const res = await fetch('/api/admin/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(data.message || 'Batch created successfully!');
        setIsCreateOpen(false);
        loadBatches();
      } else {
        alert(data.message || 'Failed to create batch.');
      }
    } catch (e) {
      alert('Error creating batch.');
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBatch) return;

    try {
      const res = await fetch(`/api/admin/batches/${selectedBatch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(data.message || 'Batch updated successfully!');
        setIsEditOpen(false);
        setSelectedBatch(null);
        loadBatches();
      } else {
        alert(data.message || 'Failed to update batch.');
      }
    } catch (e) {
      alert('Error updating batch.');
    }
  };

  // Delete Batch
  const handleDelete = async (id, name) => {
    if (!window.confirm(`⚠️ Are you sure you want to delete batch "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/batches/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(`🗑️ Batch "${name}" deleted.`);
        loadBatches();
      } else {
        alert(data.message || 'Failed to delete batch.');
      }
    } catch (e) {
      alert('Error deleting batch.');
    }
  };

  const activeCount = batches.filter(b => b.is_active).length;
  const currentlyOpenBatch = batches.find(b => b.is_open);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Order Batches & Delivery Slots</span>
                <span className="text-[10px] bg-orange-950 text-orange-400 border border-orange-800 px-2 py-0.5 rounded-full font-bold">
                  {batches.length} CONFIGURED
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure payment accepting windows and event triggers (6:01 Cutoff, 6:10 Slips, 7:30 Runner QR).
              </p>
            </div>
          </div>
        </div>

        {/* Live Clock & Action */}
        <div className="flex items-center gap-3">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl px-3.5 py-1.5 flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400">Current IST:</span>
            <span className="font-mono font-bold text-white">{serverTime12h || serverTime || 'Loading...'}</span>
          </div>

          <button
            onClick={() => loadBatches(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-[#1F2937] border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
            title="Refresh Batches"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-orange-400' : ''}`} />
          </button>

          <button
            onClick={openCreateModal}
            className="bg-[#FF5722] hover:bg-[#F4511E] text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-orange-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Batch</span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMsg && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-2xl p-3 text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Currently Open Batch */}
        <div className={`border rounded-3xl p-5 relative overflow-hidden transition-all ${
          currentlyOpenBatch
            ? 'bg-gradient-to-br from-emerald-950/60 to-[#111827] border-emerald-500/40 shadow-lg shadow-emerald-500/10'
            : 'bg-[#111827] border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Current Payment Window</span>
            <div className={`p-1.5 rounded-xl border ${
              currentlyOpenBatch ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white flex items-center gap-2">
              {currentlyOpenBatch ? (
                <>
                  <span className="text-emerald-400">{currentlyOpenBatch.name}</span>
                  <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                    OPEN
                  </span>
                </>
              ) : (
                <span className="text-slate-400 text-lg">No Batch Active Right Now</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {currentlyOpenBatch
                ? `Accepting orders: ${currentlyOpenBatch.payment_start_12h} – ${currentlyOpenBatch.payment_end_12h} IST`
                : 'Customers are shown the scheduled opening time for the next batch.'}
            </p>
          </div>
        </div>

        {/* Card 2: Active Batches */}
        <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Active Scheduled Batches</span>
            <div className="p-1.5 rounded-xl bg-blue-950 text-blue-400 border border-blue-800/60">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-white">
              {activeCount} <span className="text-sm font-normal text-slate-400">/ {batches.length} total</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Active batches automatically accept payments during their configured windows.
            </p>
          </div>
        </div>

        {/* Card 3: Milestone Triggers Overview */}
        <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Trigger Milestones per Batch</span>
            <div className="p-1.5 rounded-xl bg-purple-950 text-purple-400 border border-purple-800/60">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 space-y-1 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-red-400" />
                <span>1. Kitchen Cutoff (Lock)</span>
              </span>
              <span className="font-mono text-slate-400">e.g. 6:01 PM</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <Printer className="w-3 h-3 text-blue-400" />
                <span>2. Zone Slips & Bulk Accept</span>
              </span>
              <span className="font-mono text-slate-400">e.g. 6:10 PM</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <Truck className="w-3 h-3 text-emerald-400" />
                <span>3. Runner Dispatch & QR Active</span>
              </span>
              <span className="font-mono text-slate-400">e.g. 7:30 PM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Batches Grid / List */}
      <div className="space-y-4">
        <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-orange-400" />
          <span>Configured Order Batches</span>
        </h2>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            Loading configured batches...
          </div>
        ) : batches.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs bg-[#111827] rounded-3xl border border-slate-800">
            No order batches found. Click "Create New Batch" to add one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {batches.map((batch) => {
              const isActive = batch.is_active;
              const isOpen = batch.is_open;

              return (
                <div
                  key={batch.id}
                  className={`bg-[#111827] border rounded-3xl p-5 space-y-4 transition-all relative overflow-hidden ${
                    isOpen
                      ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                      : isActive
                      ? 'border-slate-800 hover:border-slate-700'
                      : 'border-slate-800/40 opacity-75'
                  }`}
                >
                  {/* Top Bar: Name + Status Badges + Controls */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-white">{batch.name}</h3>
                        {isOpen && (
                          <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse"></span>
                            Live Now
                          </span>
                        )}
                        {!isActive && (
                          <span className="text-[10px] bg-slate-800 text-slate-400 font-bold px-2 py-0.5 rounded-full uppercase">
                            Paused
                          </span>
                        )}
                      </div>
                      {batch.description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{batch.description}</p>
                      )}
                    </div>

                    {/* Actions: Toggle Active, Edit, Delete */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleToggle(batch.id, batch.is_active, batch.name)}
                        className={`p-1.5 rounded-xl text-xs font-bold transition-all border ${
                          isActive
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                        }`}
                        title={isActive ? 'Pause Batch' : 'Activate Batch'}
                      >
                        {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => openEditModal(batch)}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all"
                        title="Edit Batch & Timers"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDelete(batch.id, batch.name)}
                        className="p-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 transition-all"
                        title="Delete Batch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Payment Acceptance Window */}
                  <div className="p-3.5 bg-[#1F2937]/50 border border-slate-800/80 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        💳 Customer Payment Window
                      </span>
                      <span className="text-sm font-black text-white font-mono mt-0.5 block">
                        {batch.payment_start_12h} – {batch.payment_end_12h}
                      </span>
                    </div>
                    <div className="text-right font-mono text-xs text-slate-400">
                      <span>24h: {batch.payment_start_time} - {batch.payment_end_time}</span>
                    </div>
                  </div>

                  {/* 3 Configurable Trigger Events */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block px-1">
                      ⚡ Automated Trigger Events
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {/* Trigger 1: Kitchen Cutoff */}
                      <div className="p-2.5 bg-[#18202F]/60 border border-slate-800 rounded-xl space-y-1">
                        <div className="flex items-center gap-1.5 text-red-400 text-[11px] font-bold">
                          <Lock className="w-3 h-3" />
                          <span>1. Cutoff Lock</span>
                        </div>
                        <div className="text-xs font-mono font-black text-white">
                          {batch.kitchen_cutoff_12h}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Payments closed & orders consolidated
                        </div>
                      </div>

                      {/* Trigger 2: Slips & Bulk Accept */}
                      <div className="p-2.5 bg-[#18202F]/60 border border-slate-800 rounded-xl space-y-1">
                        <div className="flex items-center gap-1.5 text-blue-400 text-[11px] font-bold">
                          <Printer className="w-3 h-3" />
                          <span>2. Slips Ready</span>
                        </div>
                        <div className="text-xs font-mono font-black text-white">
                          {batch.slips_ready_12h}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Bulk accept & zone slips PDF ready
                        </div>
                      </div>

                      {/* Trigger 3: Dispatch & QR */}
                      <div className="p-2.5 bg-[#18202F]/60 border border-slate-800 rounded-xl space-y-1">
                        <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-bold">
                          <Truck className="w-3 h-3" />
                          <span>3. Runner QR</span>
                        </div>
                        <div className="text-xs font-mono font-black text-white">
                          {batch.dispatch_12h}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Dispatch starts & student QR active
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE BATCH MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-black">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-white">Create New Order Batch</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Batch Name */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Batch Name <span className="text-orange-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lunch Delivery Batch, Dinner Batch"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#1F2937] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Payment Start & End Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Payment Start (24h) <span className="text-orange-400">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.payment_start_time}
                    onChange={(e) => setFormData({ ...formData, payment_start_time: e.target.value })}
                    className="w-full bg-[#1F2937] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-[10px] text-slate-400">e.g. 15:00 (3 PM)</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Payment End (24h) <span className="text-orange-400">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.payment_end_time}
                    onChange={(e) => setFormData({ ...formData, payment_end_time: e.target.value })}
                    className="w-full bg-[#1F2937] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-[10px] text-slate-400">e.g. 18:00 (6 PM)</span>
                </div>
              </div>

              {/* 3 Trigger Events */}
              <div className="pt-2 border-t border-slate-800/80 space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-orange-400 block">
                  ⚙️ Trigger Event Timings
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-red-400" />
                      <span>Cutoff Lock</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.kitchen_cutoff_time}
                      onChange={(e) => setFormData({ ...formData, kitchen_cutoff_time: e.target.value })}
                      className="w-full bg-[#1F2937] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                    />
                    <span className="text-[9px] text-slate-400">e.g. 18:01</span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1 flex items-center gap-1">
                      <Printer className="w-3 h-3 text-blue-400" />
                      <span>Slips Ready</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.slips_ready_time}
                      onChange={(e) => setFormData({ ...formData, slips_ready_time: e.target.value })}
                      className="w-full bg-[#1F2937] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                    />
                    <span className="text-[9px] text-slate-400">e.g. 18:10</span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1 flex items-center gap-1">
                      <Truck className="w-3 h-3 text-emerald-400" />
                      <span>Dispatch QR</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.dispatch_time}
                      onChange={(e) => setFormData({ ...formData, dispatch_time: e.target.value })}
                      className="w-full bg-[#1F2937] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                    />
                    <span className="text-[9px] text-slate-400">e.g. 19:30</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Description / Kitchen Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hostels lunch delivery cycle"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#1F2937] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="create_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-orange-500 focus:ring-0 bg-[#1F2937] border-slate-700"
                />
                <label htmlFor="create_is_active" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  Activate this batch immediately upon creation
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#FF5722] hover:bg-[#F4511E] text-white text-xs font-bold shadow-lg shadow-orange-500/20 transition-all"
                >
                  Save & Launch Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BATCH MODAL */}
      {isEditOpen && selectedBatch && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-white">Edit Batch: {selectedBatch.name}</h3>
              </div>
              <button
                onClick={() => { setIsEditOpen(false); setSelectedBatch(null); }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Batch Name */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Batch Name <span className="text-orange-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#1F2937] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Payment Start & End Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Payment Start (24h) <span className="text-orange-400">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.payment_start_time}
                    onChange={(e) => setFormData({ ...formData, payment_start_time: e.target.value })}
                    className="w-full bg-[#1F2937] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Payment End (24h) <span className="text-orange-400">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.payment_end_time}
                    onChange={(e) => setFormData({ ...formData, payment_end_time: e.target.value })}
                    className="w-full bg-[#1F2937] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* 3 Trigger Events */}
              <div className="pt-2 border-t border-slate-800/80 space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-orange-400 block">
                  ⚙️ Trigger Event Timings
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-red-400" />
                      <span>Cutoff Lock</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.kitchen_cutoff_time}
                      onChange={(e) => setFormData({ ...formData, kitchen_cutoff_time: e.target.value })}
                      className="w-full bg-[#1F2937] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1 flex items-center gap-1">
                      <Printer className="w-3 h-3 text-blue-400" />
                      <span>Slips Ready</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.slips_ready_time}
                      onChange={(e) => setFormData({ ...formData, slips_ready_time: e.target.value })}
                      className="w-full bg-[#1F2937] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1 flex items-center gap-1">
                      <Truck className="w-3 h-3 text-emerald-400" />
                      <span>Dispatch QR</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.dispatch_time}
                      onChange={(e) => setFormData({ ...formData, dispatch_time: e.target.value })}
                      className="w-full bg-[#1F2937] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Description / Kitchen Note
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#1F2937] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-orange-500 focus:ring-0 bg-[#1F2937] border-slate-700"
                />
                <label htmlFor="edit_is_active" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  Batch is Active & Accepting Orders
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setIsEditOpen(false); setSelectedBatch(null); }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
