import React, { useState, useEffect } from 'react';
import { Users, Search, MapPin, Phone, ShieldCheck, ShieldAlert, Wallet, CheckCircle } from 'lucide-react';

export default function CustomerDirectory() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [campusFilter, setCampusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [walletAmount, setWalletAmount] = useState('');
  const [walletDesc, setWalletDesc] = useState('');

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/customers?campus=${campusFilter}&search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCustomers(data.customers || []);
        }
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [campusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadCustomers();
  };

  const handleToggleStatus = async (customerId) => {
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/toggle-status`, {
        method: 'PATCH'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCustomers(prev =>
          prev.map(c => c.id === customerId ? { ...c, status: data.status } : c)
        );
      }
    } catch (e) {
      alert('Failed to update customer status');
    }
  };

  const handleWalletAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!walletAmount || isNaN(walletAmount)) return;
    
    try {
      const res = await fetch(`/api/admin/customers/${selectedCustomer.id}/wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: walletAmount, description: walletDesc })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, wallet_balance: data.newBalance } : c));
        setWalletModalOpen(false);
        setSelectedCustomer(null);
        setWalletAmount('');
        setWalletDesc('');
      } else {
        alert(data.message || 'Wallet update failed');
      }
    } catch (e) {
      alert('Error updating wallet');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Customer Directory & Campus Profiles</span>
            <span className="text-xs bg-blue-950 text-blue-400 border border-blue-800 px-2.5 py-0.5 rounded-full font-bold">
              {customers.length} registered
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified student accounts across Jhungiya, Buddha, KIPM, and ITM campuses.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student or phone..."
              className="bg-[#1F2937] border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
            />
          </form>

          <select
            value={campusFilter}
            onChange={(e) => setCampusFilter(e.target.value)}
            className="bg-[#1F2937] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF5722]"
          >
            <option value="ALL">All Campuses</option>
            <option value="Jhungiya">Jhungiya</option>
            <option value="Buddha">Buddha</option>
            <option value="KIPM">KIPM</option>
            <option value="ITM">ITM</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 pb-2">
                <th className="pb-2 font-bold">Customer</th>
                <th className="pb-2 font-bold">Verified Phone</th>
                <th className="pb-2 font-bold">Campus Drop</th>
                <th className="pb-2 font-bold">Wallet Balance</th>
                <th className="pb-2 font-bold">Account Status</th>
                <th className="pb-2 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    No customers found matching criteria.
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const isActive = c.status === 'ACTIVE';
                  return (
                    <tr key={c.id} className="hover:bg-slate-800/30">
                      <td className="py-3">
                        <div className="font-bold text-white">{c.name || 'Anonymous Student'}</div>
                        <span className="text-[10px] text-slate-500">ID: #{c.id}</span>
                      </td>
                      <td className="py-3 font-mono text-slate-300">
                        +91 {c.phone_number}
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 font-semibold text-orange-400">
                          <MapPin className="w-3 h-3" />
                          <span>{c.campus_name || 'Not Selected'}</span>
                        </span>
                      </td>
                      <td className="py-3 font-bold text-emerald-400 font-mono flex items-center gap-2">
                        ₹{c.wallet_balance.toFixed(2)}
                        <button
                          onClick={() => { setSelectedCustomer(c); setWalletModalOpen(true); }}
                          className="bg-slate-700 hover:bg-slate-600 text-white rounded p-1"
                          title="Adjust Wallet"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                        </button>
                      </td>
                      <td className="py-3">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                            isActive
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-red-950 text-red-400 border border-red-800'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleToggleStatus(c.id)}
                          className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-colors ${
                            isActive
                              ? 'bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-300'
                              : 'bg-emerald-900 hover:bg-emerald-800 text-emerald-200'
                          }`}
                        >
                          {isActive ? 'Block Account' : 'Unblock Account'}
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
      
      {/* Wallet Adjustment Modal */}
      {walletModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1F2937] border border-slate-700 rounded-3xl p-6 max-w-sm w-full">
            <h3 className="text-white font-bold mb-4">Adjust Wallet: {selectedCustomer.name || selectedCustomer.phone_number}</h3>
            <form onSubmit={handleWalletAdjustSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400">Amount (+/-)</label>
                <input
                  type="number"
                  required
                  value={walletAmount}
                  onChange={e => setWalletAmount(e.target.value)}
                  placeholder="e.g. 50 or -50"
                  className="w-full bg-[#111827] border border-slate-700 rounded-xl px-3 py-2 text-white mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Reason / Description</label>
                <input
                  type="text"
                  required
                  value={walletDesc}
                  onChange={e => setWalletDesc(e.target.value)}
                  placeholder="e.g. Refund for missing item"
                  className="w-full bg-[#111827] border border-slate-700 rounded-xl px-3 py-2 text-white mt-1"
                />
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <button type="button" onClick={() => setWalletModalOpen(false)} className="px-4 py-2 rounded-xl text-slate-400">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold">Update Wallet</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
