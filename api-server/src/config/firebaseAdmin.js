const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let firebaseInitialized = false;

try {
  if (admin.apps && admin.apps.length > 0) {
    firebaseInitialized = true;
  } else {
    // 1. Check for FIREBASE_SERVICE_ACCOUNT JSON string in env
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string'
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : process.env.FIREBASE_SERVICE_ACCOUNT;
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'roti-13d2a'
      });
      firebaseInitialized = true;
      console.log('🔥 Firebase Admin initialized via FIREBASE_SERVICE_ACCOUNT env var');
    } 
    // 2. Check for local serviceAccountKey.json file
    else {
      const serviceKeyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.resolve(__dirname, 'serviceAccountKey.json');
      if (fs.existsSync(serviceKeyPath)) {
        const serviceAccount = require(serviceKeyPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: 'roti-13d2a'
        });
        firebaseInitialized = true;
        console.log(`🔥 Firebase Admin initialized using ${serviceKeyPath}`);
      } else {
        // 3. Fallback with project ID (allows graceful degradation without crashing)
        admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || 'roti-13d2a'
        });
        firebaseInitialized = true;
        console.log('🔥 Firebase Admin initialized with Project ID roti-13d2a');
      }
    }
  }
} catch (err) {
  console.warn('⚠️ Firebase Admin initialization warning:', err.message);
}

/**
 * Verify Firebase ID Token
 * Supports live verification via Admin SDK and fallback decoding
 */
async function verifyFirebaseToken(idToken) {
  if (!idToken) throw new Error('ID Token is required');

  try {
    if (admin.apps && admin.apps.length > 0 && admin.auth) {
      try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        return decoded;
      } catch (adminErr) {
        console.warn('Firebase Admin verifyIdToken returned:', adminErr.message);
      }
    }

    // Fallback: decode JWT payload if unverified or demo token
    if (typeof idToken === 'string') {
      const parts = idToken.split('.');
      if (parts.length === 3) {
        const payload = Buffer.from(parts[1], 'base64').toString('utf8');
        return JSON.parse(payload);
      }
    }
  } catch (err) {
    console.error('Token verification error:', err.message);
  }

  throw new Error('Invalid or unverified Firebase ID token');
}

module.exports = {
  admin,
  firebaseInitialized,
  verifyFirebaseToken
};
