import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut
} from 'firebase/auth';

// 2 Roti Firebase Web Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDNaijXUWYm9mo51PdDZcgDL5RESEwJJkM",
  authDomain: "roti-13d2a.firebaseapp.com",
  projectId: "roti-13d2a",
  storageBucket: "roti-13d2a.firebasestorage.app",
  messagingSenderId: "71313998646",
  appId: "1:71313998646:web:3fc2410b57a13f04d1a997",
  measurementId: "G-PLDET76EM8"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export {
  app,
  auth,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut
};
