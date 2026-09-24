/**
 * Dynamic CSV parser and validator for 2 Roti Menu items
 */

function parseMenuCsv(csvText) {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) {
    throw new Error('CSV file is empty or does not contain header and data.');
  }

  const headerLine = lines[0];
  const headers = headerLine.split(',').map(h => h.trim().toLowerCase());
  
  // Find column indices
  let itemIdx = headers.findIndex(h => h.includes('item'));
  let vendorCostIdx = headers.findIndex(h => h.includes('vendor') || h.includes('deal'));
  let customerPriceIdx = headers.findIndex(h => h.includes('customer') || h.includes('price') || h.includes('selling'));
  let categoryIdx = headers.findIndex(h => h.includes('category') || h.includes('type'));
  let vegIdx = headers.findIndex(h => h.includes('veg'));

  if (itemIdx === -1 || vendorCostIdx === -1 || customerPriceIdx === -1) {
    // Fallback standard positions: Col 0: Item, Col 1: Vendor, Col 2: Customer Price
    itemIdx = 0;
    vendorCostIdx = 1;
    customerPriceIdx = 2;
  }

  const parsedItems = [];
  const errors = [];
  const seenNames = new Set();

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const cols = rawLine.split(',').map(c => c.trim());
    
    const name = cols[itemIdx];
    const rawVendor = cols[vendorCostIdx];
    const rawCustomer = cols[customerPriceIdx];
    const rawCategory = categoryIdx !== -1 && cols[categoryIdx] ? cols[categoryIdx] : 'Outlet Special';
    const rawVeg = vegIdx !== -1 && cols[vegIdx] ? cols[vegIdx].toLowerCase() : null;

    // Check category header line (e.g. "Biryani,,")
    if (name && (!rawVendor || rawVendor === '') && (!rawCustomer || rawCustomer === '')) {
      // It's a category separator header row in the CSV, safely skip or record
      continue;
    }

    if (!name) {
      errors.push({ line: i + 1, error: 'Empty item name' });
      continue;
    }

    const lowerName = name.toLowerCase();
    if (seenNames.has(lowerName)) {
      errors.push({ line: i + 1, item: name, error: 'Duplicate item name in file' });
      continue;
    }
    seenNames.add(lowerName);

    const vendorCost = parseFloat(rawVendor);
    const customerPrice = parseFloat(rawCustomer);

    if (isNaN(vendorCost) || vendorCost <= 0) {
      errors.push({ line: i + 1, item: name, error: `Invalid vendor deal price: "${rawVendor}"` });
      continue;
    }

    if (isNaN(customerPrice) || customerPrice <= 0) {
      errors.push({ line: i + 1, item: name, error: `Invalid customer price: "${rawCustomer}"` });
      continue;
    }

    if (customerPrice < vendorCost) {
      errors.push({ line: i + 1, item: name, error: `Customer price (₹${customerPrice}) cannot be less than vendor cost (₹${vendorCost})` });
      continue;
    }

    // Determine veg status heuristically if not explicit
    let isVeg = true;
    if (rawVeg !== null) {
      isVeg = rawVeg === 'yes' || rawVeg === 'true' || rawVeg === 'veg';
    } else {
      const nonVegKeywords = ['chicken', 'mutton', 'egg', 'fish', 'meat'];
      if (nonVegKeywords.some(k => lowerName.includes(k))) {
        isVeg = false;
      }
    }

    parsedItems.push({
      name,
      category: rawCategory || 'Outlet Special',
      vendor_cost: vendorCost,
      customer_price: customerPrice,
      is_veg: isVeg,
      is_outlet_only: true
    });
  }

  return {
    items: parsedItems,
    errors,
    totalParsed: parsedItems.length
  };
}

module.exports = {
  parseMenuCsv
};
