import React, { useState, useEffect } from 'react';
import { Lock, UserPlus, Shield, Store, CheckCircle, AlertTriangle, Key } from 'lucide-react';

export default function StaffRBAC() {
  const [staffList, setStaffList] = useState([]);
  const [locations, setLocations] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ORDER_MANAGER'); // ORDER_MANAGER | VENDOR | SUPER_ADMIN
  const [outletId, setOutletId] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const res = await fetch('/api/admin/staff-users');
      if (res.ok) {
        const data = await res.json();
        if (data.success) setStaffList(data.staff || []);
      }

      const locRes = await fetch('/api/menu/locations');
      if (locRes.ok) {
        const locData = await locRes.json();
        if (locData.success) {
          setLocations(locData.locations || []);
          if (locData.locations.length > 0) setOutletId(locData.locations[0].id);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setMsg('');

      const res = await fetch('/api/admin/staff-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          role,
          outlet_location_id: role === 'VENDOR' ? parseInt(outletId) : null
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create staff credentials.');
      }

      setMsg(data.message);
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      await loadData();
    } catch (err) {
      setError(err.message || 'Creation error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      
      {/* Title */}
      <div>
        <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <span>Role-Based Access Control (RBAC) & Credentials</span>
          <span className="text-xs bg-purple-950 text-purple-400 border border-purple-800 px-2.5 py-0.5 rounded-full font-bold">
            Multi-Tier Scoped
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Separate access credentials for Order Dispatch Managers and Independent Outlet Vendors.
        </p>
      </div>

      {msg && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-800 text-xs text-red-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: Create Form + Existing Staff */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Create Credential Form */}
        <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-lg">
          <h3 className="text-sm font-black text-white mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#FF5722]" />
            <span>Provision New Staff Login</span>
          </h3>

          <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full bg-[#1F2937] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#FF5722]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Login Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager.buddha@2roti.com"
                className="w-full bg-[#1F2937] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#FF5722]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Phone (Optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full bg-[#1F2937] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#FF5722]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Access Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-[#1F2937] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#FF5722]"
              >
                <option value="ORDER_MANAGER">Order Dispatch Manager (All Live Orders)</option>
                <option value="VENDOR">Vendor (Scoped to Outlet Orders & Wallet)</option>
                <option value="SUPER_ADMIN">Super Admin (Full Platform Access)</option>
              </select>
            </div>

            {role === 'VENDOR' && (
              <div>
                <label className="block font-bold text-slate-300 mb-1">Assigned Outlet</label>
                <select
                  value={outletId}
                  onChange={(e) => setOutletId(e.target.value)}
                  className="w-full bg-[#1F2937] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#FF5722]"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} Physical Outlet
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full bg-[#1F2937] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#FF5722]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#F4511E] text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 disabled:opacity-50 transition-all"
            >
              {loading ? 'Creating Credentials...' : 'Create Account'}
            </button>
          </form>
        </div>

        {/* Existing Staff Table */}
        <div className="lg:col-span-2 bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-lg">
          <h3 className="text-sm font-black text-white mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Active Staff Logins</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 pb-2">
                  <th className="pb-2 font-bold">Staff Member</th>
                  <th className="pb-2 font-bold">Role</th>
                  <th className="pb-2 font-bold">Scope / Outlet</th>
                  <th className="pb-2 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {staffList.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/30">
                    <td className="py-3">
                      <div className="font-bold text-white">{s.name}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{s.email}</span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border ${
                          s.role === 'SUPER_ADMIN'
                            ? 'bg-purple-950 text-purple-300 border-purple-800'
                            : s.role === 'ORDER_MANAGER'
                            ? 'bg-blue-950 text-blue-300 border-blue-800'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        }`}
                      >
                        {s.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 text-slate-300 font-medium">
                      {s.role === 'VENDOR' ? `📍 ${s.outlet_name || 'Jhungiya'}` : 'Global (All Campuses)'}
                    </td>
                    <td className="py-3">
                      <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Active</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
