import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user on mount
  useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch('/api/auth/customer/me');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setUser(data.user);
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
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Login failed');
    }
    setUser(data.user);
    return data.user;
  }

  async function updateProfile({ name, location_id, email }) {
    const res = await fetch('/api/auth/complete-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, location_id, email })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to update profile');
    }
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
        const data = await res.json();
        if (data.success) setUser(data.user);
      }
    } catch (e) {}
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isProfileComplete: user ? !!user.is_profile_complete : false,
        loginCustomer,
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
