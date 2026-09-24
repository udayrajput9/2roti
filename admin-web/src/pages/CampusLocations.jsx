import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  X,
  Truck,
  Building,
  Check,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Package
} from 'lucide-react';

export default function CampusLocations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [addingLocation, setAddingLocation] = useState(false);

  // Notification banners
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const showNotification = (msg, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/menu/admin-locations', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.locations) && data.locations.length > 0) {
          setLocations(data.locations);
          return;
        }
      }
      // Fallback to public locations endpoint
      const pubRes = await fetch('/api/menu/locations');
      if (pubRes.ok) {
        const pubData = await pubRes.json();
        if (pubData.success && Array.isArray(pubData.locations)) {
          setLocations(pubData.locations.map(l => ({ ...l, is_active: l.is_active !== undefined ? !!l.is_active : true })));
        }
      }
    } catch (e) {
      console.error('Fetch locations error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleToggleStatus = async (loc) => {
    const prevStatus = loc.is_active;
    // Optimistic UI update
    setLocations(prev => prev.map(l => l.id === loc.id ? { ...l, is_active: !prevStatus } : l));

    try {
      const res = await fetch(`/api/menu/locations/${loc.id}/toggle-status`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update campus status');
      }
      showNotification(`Campus "${loc.name}" is now ${data.is_active ? 'ACTIVE' : 'INACTIVE'}`);
    } catch (err) {
      // Revert on error
      setLocations(prev => prev.map(l => l.id === loc.id ? { ...l, is_active: prevStatus } : l));
      showNotification(err.message, true);
    }
  };

  const handleAddLocationSubmit = async (e) => {
    e.preventDefault();
    if (!newLocationName.trim()) {
      showNotification('Please enter a campus name.', true);
      return;
    }

    try {
      setAddingLocation(true);
      const res = await fetch('/api/menu/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLocationName.trim() })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to add campus location');
      }

      showNotification(`Campus location "${newLocationName}" added successfully!`);
      setNewLocationName('');
      setIsAddModalOpen(false);
      await fetchLocations();
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setAddingLocation(false);
    }
  };

  const totalCampuses = locations.length;
  const activeCampuses = locations.filter(l => l.is_active).length;
  const totalOrdersSum = locations.reduce((sum, l) => sum + (l.total_orders || 0), 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <MapPin className="w-6 h-6 text-[#FF5722]" />
            <span>Campus Drop Points & Outlets Network</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage student campus hostel gates, delivery zones (Buddha, KIPM, ITM), and Jhungiya central outlet.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLocations}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Refresh Network"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#FF5722]' : ''}`} />
          </button>

          <button
            onClick={() => {
              setNewLocationName('');
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_4px_16px_rgba(255,87,34,0.35)] active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Campus Location</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-200 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')}><X className="w-3.5 h-3.5 opacity-60" /></button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800 text-xs text-rose-200 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-bold">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')}><X className="w-3.5 h-3.5 opacity-60" /></button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#FF5722]/15 text-[#FF7043] flex items-center justify-center">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Network Points</div>
            <div className="text-xl font-black text-white mt-0.5">{totalCampuses}</div>
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-emerald-400">Active Campus Gates</div>
            <div className="text-xl font-black text-white mt-0.5">{activeCampuses}</div>
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-950/80 text-blue-400 border border-blue-800/60 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-blue-400">Total Campus Orders Delivered</div>
            <div className="text-xl font-black text-white mt-0.5">{totalOrdersSum}</div>
          </div>
        </div>
      </div>

      {/* Locations Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-3xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px] font-black">
                <th className="py-3.5 px-4">Campus / Drop Gate</th>
                <th className="py-3.5 px-3">Type</th>
                <th className="py-3.5 px-3">Orders Fulfilled</th>
                <th className="py-3.5 px-3 text-center">Operational Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {locations.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-500">
                    No campus locations configured yet.
                  </td>
                </tr>
              ) : (
                locations.map(loc => {
                  const isOutlet = loc.name.toLowerCase() === 'jhungiya';
                  return (
                    <tr key={loc.id} className="hover:bg-slate-800/30 transition-colors">
                      
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isOutlet 
                              ? 'bg-amber-950 text-amber-400 border border-amber-800' 
                              : 'bg-[#FF5722]/15 text-[#FF7043] border border-[#FF5722]/30'
                          }`}>
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{loc.name}</div>
                            <div className="text-[10px] text-slate-400">
                              {isOutlet ? 'Central Kitchen & Pickup Counter' : 'Hostel Gate Delivery Drop Zone'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          isOutlet
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-blue-950 text-blue-300 border border-blue-800'
                        }`}>
                          {isOutlet ? '🏪 Physical Outlet' : '🛵 Campus Hostel Drop'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-mono font-bold text-white">
                          {loc.total_orders || 0} orders
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                          loc.is_active
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${loc.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                          <span>{loc.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleToggleStatus(loc)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            loc.is_active
                              ? 'bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border-slate-700 hover:border-rose-800'
                              : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border-emerald-800'
                          }`}
                        >
                          {loc.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campus Delivery Protocol Guideline Box */}
      <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-lg space-y-2 text-xs text-slate-400">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Truck className="w-4 h-4 text-[#FF5722]" />
          <span>Campus Runner Dispatch Guidelines:</span>
        </h3>
        <p>• <strong>Buddha, KIPM & ITM:</strong> Runners drop deliveries right at the main hostel gates. When a runner is assigned in Live Orders, their contact details are automatically streamed to the customer.</p>
        <p>• <strong>Jhungiya Outlet:</strong> Orders designated as Jhungiya are strictly for counter collection or dine-in and bypass runner fees.</p>
      </div>

      {/* Modal: Add New Campus Location */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161F30] border border-slate-700/80 rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-lg font-black text-white flex items-center gap-2 mb-1">
              <MapPin className="w-5 h-5 text-[#FF5722]" />
              <span>Add New Campus Drop Point</span>
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              Enter the campus or hostel area name to expand 2 Roti delivery coverage.
            </p>

            <form onSubmit={handleAddLocationSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Campus / Area Name</label>
                <input
                  type="text"
                  required
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  placeholder="e.g. MMMUT Campus Gate 1"
                  className="w-full bg-[#111827] border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
                />
              </div>

              <button
                type="submit"
                disabled={addingLocation}
                className="w-full mt-4 py-3 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#E64A19] text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {addingLocation ? (
                  <span>Adding Location...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm & Activate Campus</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
