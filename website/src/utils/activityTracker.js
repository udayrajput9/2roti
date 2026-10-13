// Lightweight visitor session and user activity tracker
const SESSION_STORAGE_KEY = '2roti_visitor_session_id';

export function getVisitorSessionId() {
  if (typeof window === 'undefined') return 'server_session';
  try {
    let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
    return sessionId;
  } catch (e) {
    return `sess_${Date.now()}`;
  }
}

export function trackEvent(eventType, page = null, metadata = null, user = null) {
  if (typeof window === 'undefined') return;
  try {
    const sessionId = getVisitorSessionId();
    const payload = {
      session_id: sessionId,
      event_type: eventType,
      page: page || (window.location.pathname || 'home'),
      metadata: metadata || null,
      user_id: user?.id || null,
      user_email: user?.email || null,
      user_name: user?.name || null
    };

    fetch('/api/activity/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {
      // Fail silently to never interrupt user experience
    });
  } catch (err) {
    // Fail silently
  }
}

export function trackPageView(page, user = null) {
  trackEvent('PAGE_VIEW', page, { url: window.location.href }, user);
}

export function trackCartAdd(item, quantity = 1, user = null) {
  trackEvent('CART_ADD', 'cart', {
    itemId: item.id,
    itemName: item.name,
    price: item.price,
    quantity: quantity
  }, user);
}

export function trackCartRemove(itemId, user = null) {
  trackEvent('CART_REMOVE', 'cart', { itemId }, user);
}

export function trackOnboardingView(user = null) {
  trackEvent('ONBOARDING_VIEW', 'onboarding_modal', { status: 'modal_displayed' }, user);
}
