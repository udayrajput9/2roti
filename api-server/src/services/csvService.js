/**
 * Dynamic CSV parser and validator for 2 Roti Menu items
 * Implements RFC-4180 compliant quotation parsing, sanitization, and security guardrails
 */

function parseCsvRow(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      // Check for escaped double quotes ("")
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseMenuCsv(csvText) {
  if (!csvText || typeof csvText !== 'string') {
    throw new Error('CSV content must be a valid text string.');
  }

  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) {
    throw new Error('CSV file is empty or does not contain header and data.');
  }

  const headerLine = lines[0];
  const headers = parseCsvRow(headerLine).map(h => h.toLowerCase());
  
  // Find column indices
  let itemIdx = headers.findIndex(h => h.includes('item') || h.includes('dish') || h.includes('name'));
  let vendorCostIdx = headers.findIndex(h => h.includes('vendor') || h.includes('deal') || h.includes('cost'));
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
    const cols = parseCsvRow(rawLine);
    
    let rawName = cols[itemIdx] || '';
    const rawVendor = cols[vendorCostIdx] || '';
    const rawCustomer = cols[customerPriceIdx] || '';
    const rawCategory = categoryIdx !== -1 && cols[categoryIdx] ? cols[categoryIdx] : 'Outlet Special';
    const rawVeg = vegIdx !== -1 && cols[vegIdx] ? cols[vegIdx].toLowerCase() : null;

    // Check category header line (e.g. "Biryani,,")
    if (rawName && (!rawVendor || rawVendor === '') && (!rawCustomer || rawCustomer === '')) {
      continue;
    }

    if (!rawName) {
      errors.push({ line: i + 1, error: 'Empty item name' });
      continue;
    }

    // Security Sanitization: Strip dangerous HTML/scripts & formula injection chars (=, +, -, @)
    const sanitizedName = rawName.replace(/[<>]/g, '').trim().substring(0, 100);
    const safeName = sanitizedName.replace(/^[=+\-@\t\r]+/, '').trim();

    if (!safeName) {
      errors.push({ line: i + 1, error: 'Invalid item name after security sanitization' });
      continue;
    }

    const lowerName = safeName.toLowerCase();
    if (seenNames.has(lowerName)) {
      errors.push({ line: i + 1, item: safeName, error: 'Duplicate item name in file' });
      continue;
    }
    seenNames.add(lowerName);

    const vendorCost = parseFloat(rawVendor.replace(/[^\d.]/g, ''));
    const customerPrice = parseFloat(rawCustomer.replace(/[^\d.]/g, ''));

    if (isNaN(vendorCost) || vendorCost <= 0) {
      errors.push({ line: i + 1, item: safeName, error: `Invalid vendor deal price: "${rawVendor}"` });
      continue;
    }

    if (isNaN(customerPrice) || customerPrice <= 0) {
      errors.push({ line: i + 1, item: safeName, error: `Invalid customer price: "${rawCustomer}"` });
      continue;
    }

    if (customerPrice < vendorCost) {
      errors.push({ line: i + 1, item: safeName, error: `Customer price (₹${customerPrice}) cannot be less than vendor cost (₹${vendorCost})` });
      continue;
    }

    // Determine veg status heuristically if not explicit
    let isVeg = true;
    if (rawVeg !== null) {
      isVeg = rawVeg === 'yes' || rawVeg === 'true' || rawVeg === 'veg';
    } else {
      const nonVegKeywords = ['chicken', 'mutton', 'egg', 'fish', 'meat', 'prawn', 'keema'];
      if (nonVegKeywords.some(k => lowerName.includes(k))) {
        isVeg = false;
      }
    }

    parsedItems.push({
      name: safeName,
      category: rawCategory.replace(/[<>]/g, '').trim() || 'Outlet Special',
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
