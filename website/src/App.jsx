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

  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    const tab = initialParams.get('tab');
    if (tab && ['home', 'search', 'outlet', 'profile', 'checkout'].includes(tab.toLowerCase())) {
      return tab.toLowerCase();
    }
    if (initialParams.get('q')) return 'search';
    return 'home';
  });

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
  const [menu, setMenu] = useState({});
  const [outletItems, setOutletItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);

  // Sync tab changes with URL
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
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

  // Fetch locations & menu
  useEffect(() => {
    async function initData() {
      try {
        setLoadingMenu(true);

        // Fetch Locations
        const locRes = await fetch('/api/menu/locations');
        if (locRes.ok) {
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

        // Fetch Full Menu
        const menuRes = await fetch('/api/menu');
        if (menuRes.ok) {
          const mData = await menuRes.json();
          if (mData.success && mData.menu) {
            setMenu(mData.menu);
          }
        }

        // Fetch Outlet Items
        const outRes = await fetch('/api/menu/outlet');
        if (outRes.ok) {
          const oData = await outRes.json();
          if (oData.success && oData.items) {
            setOutletItems(oData.items);
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
      </main>

      {/* 4. Sticky Bottom Navigation for Mobile */}
      <BottomNav
        activeTab={activeTab === 'checkout' ? 'home' : activeTab}
        onChangeTab={(tabId) => handleTabChange(tabId)}
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
