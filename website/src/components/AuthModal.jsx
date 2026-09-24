import React, { useState } from 'react';
import { Phone, Lock, User, ArrowRight, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const { loginCustomer } = useAuth();
  const [step, setStep] = useState('PHONE'); // PHONE | OTP_VERIFY
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSendOtp = (e) => {
    e.preventDefault();
    const clean = phone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setError('');
    if (usePassword) {
      handleFinalLogin(clean);
    } else {
      // Simulate Firebase Phone OTP dispatch
      setStep('OTP_VERIFY');
      setOtp('2468'); // Demo OTP for instant smooth testing
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length < 4) {
      setError('Please enter the 4-digit verification code.');
      return;
    }
    const clean = phone.replace(/\D/g, '').slice(-10);
    handleFinalLogin(clean);
  };

  const handleFinalLogin = async (cleanPhone) => {
    try {
      setLoading(true);
      setError('');
      await loginCustomer({
        phone: cleanPhone,
        password: usePassword ? password : null,
        name: name ? name.trim() : null
      });
      if (onAuthSuccess) onAuthSuccess();
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161616] border border-neutral-700/80 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF7043] to-[#BF360C] flex items-center justify-center font-black text-white text-lg mx-auto mb-2 shadow-[0_4px_16px_rgba(255,87,34,0.4)]">
            2R
          </div>
          <h3 className="text-lg font-black text-white tracking-tight">Login to 2 Roti</h3>
          <p className="text-xs text-neutral-400 mt-1">
            {step === 'PHONE' ? 'Enter phone number for OTP verification' : `Enter OTP sent to +91 ${phone}`}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-200">
            {error}
          </div>
        )}

        {step === 'PHONE' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#FF5722]" />
                <span>Mobile Number</span>
              </label>
              <div className="flex items-center bg-[#1F1F1F] border border-neutral-700 rounded-2xl px-3 py-2.5 focus-within:border-[#FF5722]">
                <span className="text-xs font-bold text-neutral-400 mr-2 border-r border-neutral-700 pr-2">+91</span>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none w-full"
                />
              </div>
            </div>

            {usePassword && (
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#FF5722]" />
                  <span>Password</span>
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-[#1F1F1F] border border-neutral-700 rounded-2xl px-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF5722]"
                />
              </div>
            )}

            {/* Honeypot field */}
            <input type="text" name="_hp_trap" tabIndex={-1} autoComplete="off" className="hidden" />

            <div className="flex justify-between items-center text-[11px] pt-1">
              <button
                type="button"
                onClick={() => setUsePassword(!usePassword)}
                className="text-[#FF5722] hover:underline font-semibold"
              >
                {usePassword ? 'Use Phone OTP instead' : 'Login with Password instead'}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#F4511E] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(255,87,34,0.4)] active:scale-95 disabled:opacity-50 transition-all mt-4"
            >
              <span>{usePassword ? 'Login' : 'Send Verification OTP'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#FF5722]" />
                <span>4-Digit Verification Code</span>
              </label>
              <input
                type="text"
                maxLength={4}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="2468"
                className="w-full bg-[#1F1F1F] border border-neutral-700 rounded-2xl px-4 py-3 text-center tracking-[0.5em] text-lg font-black text-white placeholder-neutral-600 focus:outline-none focus:border-[#FF5722]"
              />
              <p className="text-[10px] text-neutral-400 text-center mt-1.5">
                Demo code: <span className="text-[#FF5722] font-bold">2468</span> (or Firebase SMS)
              </p>
            </div>

            <div className="flex justify-between items-center text-[11px]">
              <button
                type="button"
                onClick={() => setStep('PHONE')}
                className="text-neutral-400 hover:text-white"
              >
                Change Phone
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FF5722] to-[#F4511E] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(255,87,34,0.4)] active:scale-95 disabled:opacity-50 transition-all"
            >
              <span>Verify & Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
