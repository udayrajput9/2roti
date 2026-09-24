import React, { useState } from 'react';
import { Lock, Mail, Shield, ArrowRight, UserCheck } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function Login() {
  const { loginStaff } = useAdminAuth();
  const [email, setEmail] = useState('admin@2roti.com');
  const [password, setPassword] = useState('Admin@2Roti2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await loginStaff(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Staff login failed.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoRole = (roleEmail, rolePass) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-800 rounded-3xl max-w-md w-full p-8 shadow-2xl relative">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF7043] to-[#BF360C] flex items-center justify-center font-black text-white text-xl mx-auto mb-3 shadow-[0_8px_24px_rgba(255,87,34,0.4)]">
            2R
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">2 ROTI ERP PORTAL</h1>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise Admin & Vendor Operations Login
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-950/80 border border-red-800 text-xs text-red-200">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#FF5722]" />
              <span>Staff Email Address</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@2roti.com"
              className="w-full bg-[#1F2937] border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#FF5722]" />
              <span>Security Password</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full bg-[#1F2937] border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#F4511E] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(255,87,34,0.4)] active:scale-95 disabled:opacity-50 transition-all"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Roles Quick Switcher */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <div className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider text-center">
            Role Preset Quick Logins:
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setDemoRole('admin@2roti.com', 'Admin@2Roti2026')}
              className="p-2 rounded-xl bg-purple-950/60 border border-purple-800 hover:bg-purple-900/60 text-[10px] font-bold text-purple-300 text-center transition-colors"
            >
              Super Admin
            </button>
            <button
              type="button"
              onClick={() => setDemoRole('manager@2roti.com', 'Manager@2Roti2026')}
              className="p-2 rounded-xl bg-blue-950/60 border border-blue-800 hover:bg-blue-900/60 text-[10px] font-bold text-blue-300 text-center transition-colors"
            >
              Order Manager
            </button>
            <button
              type="button"
              onClick={() => setDemoRole('vendor.jhungiya@2roti.com', 'Vendor@2Roti2026')}
              className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-800 hover:bg-emerald-900/60 text-[10px] font-bold text-emerald-300 text-center transition-colors"
            >
              Jhungiya Vendor
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
