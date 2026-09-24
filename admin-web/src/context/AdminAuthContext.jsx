import React, { createContext, useContext, useState, useEffect } from 'react';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkStaff() {
      try {
        const res = await fetch('/api/auth/staff/me');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.staff) {
            setStaff(data.staff);
          }
        }
      } catch (e) {
      } finally {
        setLoading(false);
      }
    }
    checkStaff();
  }, []);

  async function loginStaff(email, password) {
    const res = await fetch('/api/auth/staff/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Staff login failed');
    }
    setStaff(data.staff);
    return data.staff;
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    setStaff(null);
  }

  return (
    <AdminAuthContext.Provider
      value={{
        staff,
        loading,
        isAuthenticated: !!staff,
        role: staff?.role || null,
        isSuperAdmin: staff?.role === 'SUPER_ADMIN',
        isOrderManager: staff?.role === 'ORDER_MANAGER',
        isVendor: staff?.role === 'VENDOR',
        loginStaff,
        logout
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
