import React, { useState } from 'react';
import { MapPin, User, Phone, CheckCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function OnboardingGuard({ locations = [], isOpen, onClose }) {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [locationId, setLocationId] = useState(user?.default_location_id || (locations[0]?.id || ''));
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!locationId) {
      setError('Please select your campus delivery location.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await updateProfile({
        name: name.trim(),
        location_id: parseInt(locationId),
        email: email ? email.trim() : null
      });
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Failed to save profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#161616] border border-neutral-700/80 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF7043] to-[#BF360C] flex items-center justify-center font-black text-white text-xl mx-auto mb-3 shadow-[0_8px_20px_rgba(255,87,34,0.3)]">
            2R
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Complete Your Profile</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Choose your campus for instant food delivery right to your hostel/gate!
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-950/60 border border-red-800/80 text-xs text-red-200 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#FF5722]" />
              <span>Full Name</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full bg-[#1F1F1F] border border-neutral-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF5722] transition-colors"
            />
          </div>

          {/* Phone Display (Readonly or verified) */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#FF5722]" />
              <span>Verified Mobile Number</span>
            </label>
            <input
              type="text"
              disabled
              value={user?.phone || 'Verified via OTP'}
              className="w-full bg-[#1F1F1F]/60 border border-neutral-800 rounded-2xl px-4 py-2.5 text-xs text-neutral-400 cursor-not-allowed"
            />
          </div>

          {/* Campus Location Selection with the 4 options: Jhungiya, Buddha, KIPM, ITM */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#FF5722]" />
              <span>Delivery Campus / Area</span>
            </label>
            
            <div className="grid grid-cols-2 gap-2 mt-1">
              {locations.map((loc) => {
                const isSelected = parseInt(locationId) === loc.id;
                return (
                  <button
                    type="button"
                    key={loc.id}
                    onClick={() => setLocationId(loc.id)}
                    className={`py-3 px-3 rounded-2xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-[#FF5722] text-white border-[#FF5722] shadow-[0_4px_16px_rgba(255,87,34,0.4)]'
                        : 'bg-[#1F1F1F] text-neutral-300 border-neutral-700 hover:border-neutral-500'
                    }`}
                  >
                    <span>{loc.name}</span>
                    <span className="text-[10px] opacity-80 font-normal">Campus Drop</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Honeypot field (invisible to users, catches bots) */}
          <input
            type="text"
            name="_hp_trap"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
          />

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-3 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#F4511E] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(255,87,34,0.4)] active:scale-95 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <span>Saving Profile...</span>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Confirm & Proceed to Menu</span>
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
