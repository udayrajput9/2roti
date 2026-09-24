import React, { useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth, googleProvider, signInWithPopup } from '../config/firebase';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  // Google Gmail Sign In
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
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please try again.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Domain not authorized in Firebase Console. Please add this domain to authorized domains.');
      } else {
        setError(err.message || 'Failed to sign in with Google.');
      }
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

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-500 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Encrypted & secure student login</span>
          </div>
        </div>
      </div>
    </div>
  );
}
