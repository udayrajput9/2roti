import React, { useState, useEffect } from 'react';
import { MapPin, User, Phone, CheckCircle, ShieldAlert, Building, Mail, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function OnboardingGuard({ locations = [], isOpen, onClose }) {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [locationId, setLocationId] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [hpTrap, setHpTrap] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sync user state when user or modal becomes active
  useEffect(() => {
    if (user) {
      if (user.name) setName(user.name);
      if (user.phone && !user.phone.startsWith('PENDING_')) {
        setPhone(user.phone);
      }
      if (user.default_location_id) {
        setLocationId(user.default_location_id);
      } else if (locations.length > 0) {
        setLocationId(locations[0].id);
      }
    }
  }, [user, locations]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number for order delivery.');
      return;
    }

    if (!locationId) {
      setError('Please select your campus delivery location.');
      return;
    }

    try {
      setLoading(true);
      await updateProfile({
        name: name.trim(),
        phone: cleanPhone,
        location_id: parseInt(locationId),
        delivery_address_note: deliveryNote.trim() || null,
        email: user?.email || null,
        _hp_trap: hpTrap
      });

      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#161616] border border-neutral-700/80 rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF7043] to-[#BF360C] flex items-center justify-center font-black text-white text-xl mx-auto mb-3 shadow-[0_8px_20px_rgba(255,87,34,0.3)]">
            2R
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF5722]/10 border border-[#FF5722]/30 text-[#FF5722] text-[11px] font-bold mb-1">
            <Sparkles className="w-3 h-3" />
            <span>Step 2: Compulsory Delivery Details</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Complete Your Profile</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Ek bar ye details save kar lijiye, taaki campus runner aap tak garam khana deliver kar sake.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-950/60 border border-red-800/80 text-xs text-red-200 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Verified Google Account Badge */}
        {user?.email && (
          <div className="mb-4 p-2.5 rounded-2xl bg-[#1F1F1F] border border-neutral-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-neutral-300">
              <Mail className="w-4 h-4 text-[#4285F4]" />
              <span className="truncate max-w-[200px] text-neutral-300">{user.email}</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-800/50">
              ✓ Verified Google
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#FF5722]" />
              <span>Full Name <span className="text-red-400">*</span></span>
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

          {/* Mandatory Mobile Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#FF5722]" />
                <span>Mobile Number (Mandatory) <span className="text-red-400">*</span></span>
              </span>
              <span className="text-[10px] text-[#FF5722] font-semibold">For Delivery Calls</span>
            </label>
            <div className="flex items-center bg-[#1F1F1F] border border-neutral-700 rounded-2xl px-3 py-2.5 focus-within:border-[#FF5722] transition-colors">
              <span className="text-xs font-bold text-neutral-400 mr-2 border-r border-neutral-700 pr-2">+91</span>
              <input
                type="tel"
                required
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="9876543210"
                className="bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none w-full font-medium"
              />
            </div>
            <p className="text-[10px] text-neutral-500 mt-1 pl-1">
              Campus runner delivery ke waqt is number par call karke food hand over karega.
            </p>
          </div>

          {/* Campus Location Selection: Jhungiya, Buddha, KIPM, ITM */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#FF5722]" />
                <span>Select Delivery Campus <span className="text-red-400">*</span></span>
              </span>
              <span className="text-[10px] text-neutral-400">Gorakhpur</span>
            </label>
            
            <div className="grid grid-cols-2 gap-2">
              {locations.map((loc) => {
                const isSelected = parseInt(locationId) === loc.id;
                return (
                  <button
                    type="button"
                    key={loc.id}
                    onClick={() => setLocationId(loc.id)}
                    className={`py-3 px-3 rounded-2xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? 'bg-[#FF5722] text-white border-[#FF5722] shadow-[0_4px_16px_rgba(255,87,34,0.4)]'
                        : 'bg-[#1F1F1F] text-neutral-300 border-neutral-700 hover:border-neutral-500'
                    }`}
                  >
                    <span className="text-xs font-bold">{loc.name}</span>
                    <span className="text-[10px] opacity-80 font-normal">Campus Drop</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Room / Hostel / Delivery Note */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-[#FF5722]" />
              <span>Hostel / Room / Gate Details (Optional)</span>
            </label>
            <input
              type="text"
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
              placeholder="e.g. Boys Hostel 2, Room 304 / Main Gate"
              className="w-full bg-[#1F1F1F] border border-neutral-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF5722] transition-colors"
            />
          </div>

          {/* Honeypot field */}
          <input
            type="text"
            name="_hp_trap"
            value={hpTrap}
            onChange={(e) => setHpTrap(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
          />

          {/* Compulsory Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-5 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#F4511E] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(255,87,34,0.4)] active:scale-95 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <span>Saving Details...</span>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Save & Continue to Order</span>
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
