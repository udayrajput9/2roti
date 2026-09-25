import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

async function parseJsonResponse(res, fallbackMessage = 'Server request failed') {
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}. Please check your connection or retry.`);
    }
    throw new Error(fallbackMessage);
  }
  if (!res.ok || !data.success) {
    throw new Error(data.message || fallbackMessage);
  }
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user on mount
  useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch('/api/auth/customer/me');
        if (res.ok) {
          const text = await res.text();
          try {
            const data = JSON.parse(text);
            if (data.success && data.user) {
              setUser(data.user);
            }
          } catch (e) {
            // Not valid JSON
          }
        }
      } catch (e) {
        // Not logged in or offline
      } finally {
        setLoading(false);
      }
    }
    loadMe();
  }, []);

  async function loginCustomer({ phone, password, name, email }) {
    const res = await fetch('/api/auth/customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password, name, email })
    });
    const data = await parseJsonResponse(res, 'Login failed');
    setUser(data.user);
    return data.user;
  }

  async function loginWithGoogle({ idToken, email, name, firebaseUid }) {
    const res = await fetch('/api/auth/customer/firebase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, email, name, firebaseUid })
    });
    const data = await parseJsonResponse(res, 'Google sign-in failed');
    setUser(data.user);
    return data.user;
  }

  async function updateProfile({ name, phone, location_id, email, delivery_address_note }) {
    const res = await fetch('/api/auth/complete-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, location_id, email, delivery_address_note })
    });
    const data = await parseJsonResponse(res, 'Failed to update profile');
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    setUser(null);
  }

  async function refreshUser() {
    try {
      const res = await fetch('/api/auth/customer/me');
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          if (data.success) setUser(data.user);
        } catch (e) {}
      }
    } catch (e) {}
  }

  const isProfileComplete = Boolean(
    user &&
    user.is_profile_complete &&
    user.phone &&
    !user.phone.startsWith('PENDING_') &&
    user.default_location_id
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isProfileComplete,
        loginCustomer,
        loginWithGoogle,
        updateProfile,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
