import React, { useState, useEffect } from 'react';
import SplashScreen from './components/SplashScreen';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import CartDrawer from './components/CartDrawer';
import AuthModal from './components/AuthModal';
import OnboardingGuard from './components/OnboardingGuard';

import Home from './pages/Home';
import SearchPage from './pages/Search';
import OutletPage from './pages/Outlet';
import ProfilePage from './pages/Profile';
import CheckoutPage from './pages/Checkout';
import LegalPolicyPage from './pages/LegalPolicyPage';

import Footer from './components/Footer';
import PolicyModal from './components/PolicyModal';

import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

function WebsiteContent() {
  const { user, isAuthenticated, isProfileComplete } = useAuth();
  
  // Parse incoming URL search parameters (Google Sitelinks, Searchbox, Category links)
  const initialParams = React.useMemo(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams();
  }, []);

  const LEGAL_TABS = ['terms', 'privacy', 'refund', 'shipping', 'contact', 'about', 'policy'];

  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    const tab = initialParams.get('tab');
    if (tab) {
      const lower = tab.toLowerCase();
      if (['home', 'search', 'outlet', 'profile', 'checkout'].includes(lower)) {
        return lower;
      }
      if (LEGAL_TABS.includes(lower)) {
        return 'legal';
      }
    }
    if (initialParams.get('q')) return 'search';
    return 'home';
  });

  const [activeLegalSection, setActiveLegalSection] = useState(() => {
    const tab = initialParams.get('tab');
    if (tab && LEGAL_TABS.includes(tab.toLowerCase())) {
      return tab.toLowerCase() === 'policy' ? 'terms' : tab.toLowerCase();
    }
    return 'terms';
  });

  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [modalPolicyTab, setModalPolicyTab] = useState('terms');

  const handleOpenPolicyModal = (policyKey) => {
    setModalPolicyTab(policyKey);
    setIsPolicyModalOpen(true);
  };

  const [initialSearchQuery] = useState(() => initialParams.get('q') || '');
  const [initialCategory] = useState(() => {
    const cat = initialParams.get('category');
    if (cat) {
      return cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
    }
    return 'Curry';
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const [locations, setLocations] = useState([]);
  const [activeLocation, setActiveLocation] = useState(null);
  const [menu, setMenu] = useState(() => {
    try {
      const cached = sessionStorage.getItem('2roti_cached_menu');
      return cached ? JSON.parse(cached) : {};
    } catch (e) {
      return {};
    }
  });
  const [outletItems, setOutletItems] = useState(() => {
    try {
      const cached = sessionStorage.getItem('2roti_cached_outlet');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [loadingMenu, setLoadingMenu] = useState(() => {
    try {
      const cached = sessionStorage.getItem('2roti_cached_menu');
      return !cached || Object.keys(JSON.parse(cached)).length === 0;
    } catch (e) {
      return true;
    }
  });

  // Sync tab changes with URL
  const handleTabChange = (newTab) => {
    if (LEGAL_TABS.includes(newTab.toLowerCase())) {
      setActiveLegalSection(newTab.toLowerCase() === 'policy' ? 'terms' : newTab.toLowerCase());
      setActiveTab('legal');
    } else {
      setActiveTab(newTab);
    }
    try {
      if (typeof window !== 'undefined' && window.history) {
        const url = new URL(window.location.href);
        if (newTab === 'home') {
          url.searchParams.delete('tab');
        } else {
          url.searchParams.set('tab', newTab);
        }
        window.history.replaceState({}, '', url.toString());
      }
    } catch (e) {
      // ignore
    }
  };

  // High-Performance Parallel Data Initializer (Locations + Menu + Outlet in single round-trip)
  useEffect(() => {
    async function initData() {
      try {
        const [locRes, menuRes, outRes] = await Promise.all([
          fetch('/api/menu/locations').catch(() => null),
          fetch('/api/menu').catch(() => null),
          fetch('/api/menu/outlet').catch(() => null)
        ]);

        // Process Locations
        if (locRes && locRes.ok) {
          const locData = await locRes.json();
          if (locData.success && locData.locations) {
            setLocations(locData.locations);
            const locParam = initialParams.get('location');
            if (locParam) {
              const matchedLoc = locData.locations.find(l => 
                l.name?.toLowerCase().includes(locParam.toLowerCase()) || 
                l.code?.toLowerCase() === locParam.toLowerCase()
              );
              setActiveLocation(matchedLoc || locData.locations[0]);
            } else {
              setActiveLocation(locData.locations[0]);
            }
          }
        }

        // Process Full Menu
        if (menuRes && menuRes.ok) {
          const mData = await menuRes.json();
          if (mData.success && mData.menu) {
            setMenu(mData.menu);
            try {
              sessionStorage.setItem('2roti_cached_menu', JSON.stringify(mData.menu));
            } catch (err) {
              // ignore storage quotas
            }
          }
        }

        // Process Outlet Items
        if (outRes && outRes.ok) {
          const oData = await outRes.json();
          if (oData.success && oData.items) {
            setOutletItems(oData.items);
            try {
              sessionStorage.setItem('2roti_cached_outlet', JSON.stringify(oData.items));
            } catch (err) {
              // ignore storage quotas
            }
          }
        }
      } catch (e) {
        console.error('Initialization error:', e);
      } finally {
        setLoadingMenu(false);
      }
    }
    initData();
  }, [initialParams]);

  // Update activeLocation when user logs in with saved default location
  useEffect(() => {
    if (user?.default_location_id && locations.length > 0) {
      const match = locations.find(l => l.id === user.default_location_id);
      if (match) setActiveLocation(match);
    }
  }, [user, locations]);

  // Search items — only delivery menu items (no outlet-only items at all)
  const allSearchItems = React.useMemo(() => {
    const allDbItems = menu.All || [];
    // Strictly exclude every outlet-only item
    return allDbItems.filter(
      item => !(item.is_outlet_only === 1 || item.is_outlet_only === true)
    );
  }, [menu]);

  const [pendingCheckout, setPendingCheckout] = useState(false);

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-white flex flex-col font-sans selection:bg-[#FF5722] selection:text-white">
      
      {/* 1. Animated Splash Screen */}
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      )}

      {/* 2. Top Header with User Name & Location Display Underneath */}
      <Header
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSelectLocation={(loc) => setActiveLocation(loc)}
        locations={locations}
        activeLocation={activeLocation}
        activeTab={activeTab}
        onChangeTab={(tabId) => handleTabChange(tabId)}
      />

      {/* 3. Main Views */}
      <main className="flex-1 w-full max-w-4xl mx-auto">
        {activeTab === 'home' && (
          <Home
            menu={menu}
            loading={loadingMenu}
            onOpenCart={() => setIsCartOpen(true)}
            onChangeTab={(t) => handleTabChange(t)}
            initialCategory={initialCategory}
          />
        )}

        {activeTab === 'search' && (
          <SearchPage
            allItems={allSearchItems}
            initialQuery={initialSearchQuery}
            initialCategory={initialCategory}
          />
        )}

        {activeTab === 'outlet' && (
          <OutletPage
            outletItems={outletItems}
            onGoHome={() => handleTabChange('home')}
          />
        )}

        {activeTab === 'profile' && (
          <ProfilePage
            locations={locations}
            activeLocation={activeLocation}
            onSelectLocation={(loc) => setActiveLocation(loc)}
            onOpenAuth={() => setIsAuthOpen(true)}
            onNavigateToTab={(t) => handleTabChange(t)}
            onOpenCart={() => setIsCartOpen(true)}
          />
        )}

        {activeTab === 'checkout' && (
          <CheckoutPage
            locations={locations}
            activeLocation={activeLocation}
            onBack={() => handleTabChange('home')}
            onOrderSuccess={(createdOrder) => {
              handleTabChange('profile');
            }}
          />
        )}

        {activeTab === 'legal' && (
          <LegalPolicyPage
            initialTab={activeLegalSection}
            onBackToHome={() => handleTabChange('home')}
          />
        )}
      </main>

      {/* 4. Desktop-Only Legal & Compliance Footer (Hidden on Mobile) */}
      <Footer
        onOpenPolicy={handleOpenPolicyModal}
        onChangeTab={handleTabChange}
      />

      {/* 5. Sticky Bottom Navigation for Mobile */}
      <BottomNav
        activeTab={activeTab === 'checkout' || activeTab === 'legal' ? 'home' : activeTab}
        onChangeTab={(tabId) => handleTabChange(tabId)}
      />

      {/* 6. Legal & Compliance Modal (Razorpay & Cashfree) */}
      <PolicyModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        activePolicy={modalPolicyTab}
        onSelectPolicy={(policyKey) => setModalPolicyTab(policyKey)}
      />

      {/* 5. Slide-out Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          if (!isAuthenticated) {
            setPendingCheckout(true);
            setIsAuthOpen(true);
            return;
          }
          if (!isProfileComplete) {
            setPendingCheckout(true);
            return;
          }
          handleTabChange('checkout');
        }}
      />

      {/* 6. Google Gmail / Phone Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          setPendingCheckout(false);
        }}
        onAuthSuccess={() => {
          setIsAuthOpen(false);
          if (pendingCheckout && isProfileComplete) {
            setActiveTab('checkout');
            setPendingCheckout(false);
          }
        }}
      />

      {/* 7. Mandatory Compulsory Profile Onboarding Guard */}
      <OnboardingGuard
        isOpen={isAuthenticated && !isProfileComplete}
        locations={locations}
        onClose={() => {
          if (pendingCheckout) {
            setActiveTab('checkout');
            setPendingCheckout(false);
          }
        }}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WebsiteContent />
      </CartProvider>
    </AuthProvider>
  );
}
