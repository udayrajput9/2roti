import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Ban,
  Activity,
  CheckCircle,
  AlertTriangle,
  Server,
  Zap
} from 'lucide-react';

export default function SecurityAudit() {
  const [securityData, setSecurityData] = useState(null);
  const [ipToBlock, setIpToBlock] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [loading, setLoading] = useState(true);

  const loadSecurity = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/security/overview');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSecurityData(data.security);
        }
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSecurity();
  }, []);

  const handleBlockIp = async (e) => {
    e.preventDefault();
    if (!ipToBlock.trim()) return;

    try {
      const res = await fetch('/api/security/block-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: ipToBlock.trim(), reason: blockReason.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIpToBlock('');
        setBlockReason('');
        await loadSecurity();
        alert(data.message);
      }
    } catch (err) {
      alert('Failed to block IP');
    }
  };

  const handleUnblock = async (ip) => {
    try {
      const res = await fetch('/api/security/unblock-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await loadSecurity();
        alert(data.message);
      }
    } catch (err) {
      alert('Failed to unblock IP');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      
      {/* Title */}
      <div>
        <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <span>Security Audit & Anti-Bot Infrastructure</span>
          <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
            Audit-Grade Posture
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Proactive bot detection, Honeypot traps, IP reputation scoring, and DDoS rate limiters.
        </p>
      </div>

      {/* Security Health Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Honeypot Bot Traps</span>
            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white mt-2">
            {securityData?.honeypot_triggers_count || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Automated crawler traps neutralised</p>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Blocked Malicious IPs</span>
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
              <Ban className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-red-400 mt-2">
            {securityData?.total_blocked_ips || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Permanent access blacklisted</p>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Defense Subsystems</span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-emerald-400 mt-2 space-y-1">
            <div className="flex items-center gap-1.5 text-xs">
              <CheckCircle className="w-3.5 h-3.5" /> <span>httpOnly Cookie JWT</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <CheckCircle className="w-3.5 h-3.5" /> <span>Rate Velocity Guard</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <CheckCircle className="w-3.5 h-3.5" /> <span>Idempotent Webhooks</span>
            </div>
          </div>
        </div>

      </div>

      {/* Manual IP Block Tool */}
      <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-lg">
        <h3 className="text-sm font-black text-white mb-2 flex items-center gap-2">
          <Ban className="w-4 h-4 text-red-400" />
          <span>Manual IP Blocking Control</span>
        </h3>
        
        <form onSubmit={handleBlockIp} className="flex flex-col sm:flex-row gap-3 mt-3">
          <input
            type="text"
            required
            value={ipToBlock}
            onChange={(e) => setIpToBlock(e.target.value)}
            placeholder="IP Address (e.g. 192.168.1.100)"
            className="flex-1 bg-[#1F2937] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
          />
          <input
            type="text"
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            placeholder="Reason for block"
            className="flex-1 bg-[#1F2937] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
          />
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider shadow-md shrink-0 transition-colors"
          >
            Block IP Immediately
          </button>
        </form>
      </div>

      {/* Threat Logs Stream */}
      <div className="bg-[#111827] border border-slate-800 rounded-3xl p-5 shadow-lg">
        <h3 className="text-sm font-black text-white mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-orange-400" />
          <span>Security Audit Trail & Threat Log</span>
        </h3>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 pb-2">
                <th className="pb-2 font-bold">IP Address</th>
                <th className="pb-2 font-bold">Action / Trigger</th>
                <th className="pb-2 font-bold">Endpoint</th>
                <th className="pb-2 font-bold">Threat Score</th>
                <th className="pb-2 font-bold">Status</th>
                <th className="pb-2 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(!securityData?.recent_logs || securityData.recent_logs.length === 0) ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-slate-500">
                    No threat incidents recorded. System clean.
                  </td>
                </tr>
              ) : (
                securityData.recent_logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 font-mono text-slate-300 font-bold">{log.ip_address}</td>
                    <td className="py-2.5 font-semibold text-orange-400">{log.action}</td>
                    <td className="py-2.5 font-mono text-[11px] text-slate-400">{log.endpoint}</td>
                    <td className="py-2.5">
                      <span className="font-bold text-red-400">{log.threat_score} / 100</span>
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                          log.is_blocked
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }`}
                      >
                        {log.is_blocked ? 'BLOCKED' : 'MONITORED'}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      {log.is_blocked && (
                        <button
                          onClick={() => handleUnblock(log.ip_address)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300"
                        >
                          Unblock
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
