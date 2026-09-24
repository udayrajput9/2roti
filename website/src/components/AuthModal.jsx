import React, { useState } from 'react';
import { Phone, Lock, ArrowRight, ShieldCheck, X, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth, googleProvider, signInWithPopup } from '../config/firebase';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const { loginCustomer, loginWithGoogle } = useAuth();
  const [authMode, setAuthMode] = useState('GOOGLE'); // GOOGLE | PHONE
  const [step, setStep] = useState('PHONE'); // PHONE | OTP_VERIFY
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  // 1. Google Gmail Sign In
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken();

      await loginWithGoogle({
        idToken,
        email: user.email,
        name: user.displayName || user.email.split('@')[0],
        firebaseUid: user.uid
      });

      if (onAuthSuccess) onAuthSuccess();
      if (onClose) onClose();
    } catch (err) {
      console.error('Google sign-in error:', err);
      // Helpful error message if domain not authorized or popup closed
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please try again.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Domain not authorized in Firebase Console. You can use Demo Google Sign-In below.');
      } else {
        setError(err.message || 'Failed to sign in with Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Demo Google Sign-in for immediate 1-click testing
  const handleDemoGoogleSignIn = async (demoEmail = 'rahul.student@gmail.com', demoName = 'Rahul Student') => {
    try {
      setLoading(true);
      setError('');
      await loginWithGoogle({
        idToken: null,
        email: demoEmail,
        name: demoName,
        firebaseUid: `google_demo_${Date.now()}`
      });
      if (onAuthSuccess) onAuthSuccess();
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  // 2. Phone OTP / Password Fallback
  const handleSendOtp = (e) => {
    e.preventDefault();
    const clean = phone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setError('');
    if (usePassword) {
      handleFinalPhoneLogin(clean);
    } else {
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
    handleFinalPhoneLogin(clean);
  };

  const handleFinalPhoneLogin = async (cleanPhone) => {
    try {
      setLoading(true);
      setError('');
      await loginCustomer({
        phone: cleanPhone,
        password: usePassword ? password : null
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

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF7043] to-[#BF360C] flex items-center justify-center font-black text-white text-lg mx-auto mb-2 shadow-[0_4px_16px_rgba(255,87,34,0.4)]">
            2R
          </div>
          <h3 className="text-lg font-black text-white tracking-tight">Login to 2 Roti</h3>
          <p className="text-xs text-neutral-400 mt-1">
            Sign in with your Google account for instant food delivery & loyalty cashback
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-200">
            {error}
          </div>
        )}

        {authMode === 'GOOGLE' ? (
          <div className="space-y-4">
            {/* Primary Google Login Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-xs flex items-center justify-center gap-3 shadow-[0_4px_16px_rgba(255,255,255,0.15)] active:scale-95 transition-all disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{loading ? 'Signing in with Google...' : 'Continue with Google / Gmail'}</span>
            </button>

            {/* Quick 1-Click Demo Google Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleDemoGoogleSignIn('rahul.student@gmail.com', 'Rahul Student')}
                disabled={loading}
                className="w-full py-2.5 px-3 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FF5722]" />
                <span>Quick Test: Login with Rahul's Gmail</span>
              </button>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-[#161616] px-2 text-neutral-500 font-semibold">Or Alternative</span>
              </div>
            </div>

            {/* Phone/OTP Toggle Button */}
            <button
              type="button"
              onClick={() => setAuthMode('PHONE')}
              className="w-full py-2.5 rounded-2xl bg-[#1F1F1F] hover:bg-[#252525] border border-neutral-700 text-neutral-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <Phone className="w-3.5 h-3.5 text-[#FF5722]" />
              <span>Login with Phone & OTP</span>
            </button>
          </div>
        ) : (
          <div>
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

                <div className="flex justify-between items-center text-[11px] pt-1">
                  <button
                    type="button"
                    onClick={() => setUsePassword(!usePassword)}
                    className="text-[#FF5722] hover:underline font-semibold"
                  >
                    {usePassword ? 'Use Phone OTP' : 'Login with Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('GOOGLE')}
                    className="text-neutral-400 hover:text-white"
                  >
                    Back to Google
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
                    Demo code: <span className="text-[#FF5722] font-bold">2468</span>
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
                  <button
                    type="button"
                    onClick={() => setAuthMode('GOOGLE')}
                    className="text-neutral-400 hover:text-white"
                  >
                    Back to Google
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
        )}

      </div>
    </div>
  );
}
