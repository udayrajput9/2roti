import React from 'react';
import { AlertTriangle, MapPin, CheckCircle2, XCircle } from 'lucide-react';

export default function OutletProximityModal({ isOpen, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#1A1A1A] border-2 border-[#FF5722] rounded-3xl max-w-sm w-full p-6 shadow-[0_20px_60px_rgba(255,87,34,0.4)] text-center relative">
        
        {/* Warning Icon Badge */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FF5722]/20 to-[#BF360C]/20 border border-[#FF5722]/40 flex items-center justify-center mx-auto mb-4 text-[#FF5722]">
          <AlertTriangle className="w-8 h-8 animate-pulse" />
        </div>

        <h3 className="text-lg font-black text-white tracking-tight uppercase">
          Outlet Proximity Warning
        </h3>

        <div className="mt-2 text-xs font-semibold text-[#FF9800] bg-[#FF9800]/10 border border-[#FF9800]/30 rounded-xl px-3 py-1.5 inline-flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          <span>Location: Jhungiya Outlet Only</span>
        </div>

        {/* Warning Statement as explicitly requested */}
        <p className="mt-4 text-xs leading-relaxed text-neutral-200 bg-neutral-900/80 p-3.5 rounded-2xl border border-neutral-800 font-medium">
          "Aap tabhi order karein jab aap humare outlet pe ho. Agar outlet ke paas nahi hai jo ki <strong className="text-[#FF5722]">Jhungiya</strong> me hai toh aap is section me order na karein."
        </p>

        <p className="text-[11px] text-neutral-400 mt-2">
          Kya aap abhi physical Jhungiya outlet par maujood hain?
        </p>

        {/* Action Buttons: Yes and No */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            onClick={onCancel}
            className="w-full py-3 px-4 rounded-2xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-bold text-neutral-300 flex items-center justify-center gap-1.5 transition-colors active:scale-95"
          >
            <XCircle className="w-4 h-4 text-neutral-400" />
            <span>No, Take Me Back</span>
          </button>

          <button
            onClick={onConfirm}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#F4511E] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(255,87,34,0.4)] hover:brightness-110 transition-all active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Yes, I am Here</span>
          </button>
        </div>

      </div>
    </div>
  );
}
