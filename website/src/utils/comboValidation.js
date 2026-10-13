/**
 * Helper utility to enforce Curry/Thali combo rules for breads & add-on recommendations.
 */

export function isCurryOrThaliItem(item) {
  if (!item) return false;
  const name = (item.name || '').toLowerCase();
  const cat = (item.category || '').toLowerCase();
  return (
    cat === 'curry' ||
    cat === 'thali' ||
    name.includes('curry') ||
    name.includes('kari') ||
    name.includes('thali') ||
    name.includes('sabji') ||
    name.includes('sabzi') ||
    name.includes('puri') ||
    name.includes('biryani')
  );
}

export function isBreadOrAddonItem(item) {
  if (!item) return false;
  const name = (item.name || '').toLowerCase();
  const cat = (item.category || '').toLowerCase();
  const id = Number(item.id);
  // Complete meals with sabzi (like Roti Sabji, Puri Sabji) are standalone meals, not plain bread add-ons
  if (name.includes('sabji') || name.includes('sabzi')) return false;

  if ([15, 16, 21].includes(id)) return true;
  if (cat === 'breads' || cat === 'roti') return true;
  if (
    name.includes('tandoori roti') ||
    name.includes('paratha') ||
    name.includes('naan') ||
    name.includes('kulcha') ||
    name.includes('chawal+roti')
  ) {
    return true;
  }
  return false;
}

export function hasCurryOrThaliInCart(cartItems = []) {
  return cartItems.some(item => isCurryOrThaliItem(item) && item.quantity > 0);
}

export function hasOrphanBreadsInCart(cartItems = []) {
  const hasBase = hasCurryOrThaliInCart(cartItems);
  if (hasBase) return false;
  return cartItems.some(item => isBreadOrAddonItem(item) && item.quantity > 0);
}
