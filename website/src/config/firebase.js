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
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForBuildReplaceIfProvided",
  authDomain: "roti-13d2a.firebaseapp.com",
  projectId: "roti-13d2a",
  storageBucket: "roti-13d2a.appspot.com",
  messagingSenderId: "71313998646",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:71313998646:web:2rotiweb"
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
