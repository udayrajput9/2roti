import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import LiveOrders from './pages/LiveOrders';
import VendorSettlements from './pages/VendorSettlements';
import MenuManagement from './pages/MenuManagement';
import CampusLocations from './pages/CampusLocations';
import CustomerDirectory from './pages/CustomerDirectory';
import PaymentsWebhooks from './pages/PaymentsWebhooks';
import Refunds from './pages/Refunds';
import StaffRBAC from './pages/StaffRBAC';
import SecurityAudit from './pages/SecurityAudit';
import SystemSettings from './pages/SystemSettings';
import Login from './pages/Login';

import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { LiveOrderProvider } from './context/LiveOrderContext';

function ERPContent() {
  const { isAuthenticated, loading, staff, isVendor } = useAdminAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (isVendor) {
      setActiveTab('live_orders_active');
    } else if (staff?.role === 'ORDER_MANAGER') {
      setActiveTab('live_orders_active');
    } else {
      setActiveTab('dashboard');
    }
  }, [isVendor, staff]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center text-slate-400 text-xs">
        Connecting to 2 Roti ERP Engine...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <LiveOrderProvider>
      <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col lg:flex-row font-sans">
        
        {/* Left ERP Navigation Sidebar */}
        <Sidebar activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab)} />

        {/* Main Content Area */}
        <main className="flex-1 lg:pl-64 overflow-y-auto min-h-screen">
          {activeTab === 'dashboard' && <Dashboard />}
          {(activeTab === 'live_orders' || activeTab?.startsWith('live_orders_')) && (
            <LiveOrders activeTab={activeTab} onSelectTab={setActiveTab} />
          )}
          {(activeTab === 'menu_management' || activeTab === 'menu_upload') && <MenuManagement />}
          {activeTab === 'locations' && <CampusLocations />}
          {activeTab === 'customers' && <CustomerDirectory />}
          {activeTab === 'vendor_portal' && <VendorSettlements />}
          {activeTab === 'payments' && <PaymentsWebhooks />}
          {activeTab === 'refunds' && <Refunds />}
          {activeTab === 'rbac' && <StaffRBAC />}
          {activeTab === 'security' && <SecurityAudit />}
          {activeTab === 'settings' && <SystemSettings />}
        </main>

      </div>
    </LiveOrderProvider>
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <ERPContent />
    </AdminAuthProvider>
  );
}
