const db = require('../config/database');
const { parseMenuCsv } = require('../services/csvService');

// High-Performance In-Memory Menu Cache
let cachedMenu = null;
let cacheExpiresAt = 0;
const MENU_CACHE_TTL_MS = 60 * 1000; // 60 seconds

let cachedLocations = null;
let locationsExpiresAt = 0;

function invalidateMenuCache() {
  cachedMenu = null;
  cacheExpiresAt = 0;
}

function invalidateLocationsCache() {
  cachedLocations = null;
  locationsExpiresAt = 0;
}

// 1. Get All Menu Items (Categorized)
async function getMenu(req, res) {
  try {
    const now = Date.now();
    if (cachedMenu && now < cacheExpiresAt) {
      return res.json({
        success: true,
        menu: cachedMenu,
        cached: true
      });
    }

    const items = await db('menu_items')
      .where(function() {
        this.where('is_available', true).orWhere('is_available', 1);
      })
      .orderBy('category', 'asc')
      .orderBy('id', 'asc');

    // Group items by category for easy consumption
    const categorized = {
      Curry: [],
      Thali: [],
      Biryani: [],
      Pizza: [],
      Breads: [],
      Rolls: [],
      Rice: [],
      Outlet: [],
      All: items
    };

    items.forEach((item) => {
      const isOutlet = item.is_outlet_only === true || item.is_outlet_only === 1 || item.is_outlet_only === '1';
      if (isOutlet) {
        categorized.Outlet.push(item);
      } else {
        const cat = item.category || 'Curry';
        if (!categorized[cat]) {
          categorized[cat] = [];
        }
        categorized[cat].push(item);
      }
    });

    cachedMenu = categorized;
    cacheExpiresAt = now + MENU_CACHE_TTL_MS;

    return res.json({
      success: true,
      menu: categorized
    });
  } catch (err) {
    console.error('getMenu error:', err);
    if (cachedMenu) {
      return res.json({ success: true, menu: cachedMenu, fallback: true });
    }
    return res.status(500).json({ success: false, message: 'Failed to fetch menu items.' });
  }
}

// 2. Get Outlet Specific Menu
async function getOutletMenu(req, res) {
  try {
    const items = await db('menu_items')
      .where(function() {
        this.where('is_available', true).orWhere('is_available', 1);
      })
      .andWhere(function() {
        this.where('is_outlet_only', true)
          .orWhere('is_outlet_only', 1)
          .orWhereIn('category', ['Curry', 'Thali', 'Biryani', 'Pizza', 'Outlet Special', 'Breads', 'Rice', 'Rolls']);
      })
      .orderBy('name', 'asc');

    return res.json({
      success: true,
      items
    });
  } catch (err) {
    console.error('getOutletMenu error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch outlet menu.' });
  }
}

// 3. Dynamic Menu CSV/XLSX Upload (Super Admin Only)
async function uploadMenuCsv(req, res) {
  try {
    let csvContent = '';

    if (req.file) {
      csvContent = req.file.buffer.toString('utf-8');
    } else if (req.body.csv_text) {
      csvContent = req.body.csv_text;
    } else {
      return res.status(400).json({ success: false, message: 'No CSV file or csv_text provided.' });
    }

    const { items, errors, totalParsed } = parseMenuCsv(csvContent);

    if (errors.length > 0 && items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'CSV validation failed with errors.',
        errors
      });
    }

    let addedCount = 0;
    let updatedCount = 0;

    await db.transaction(async (trx) => {
      // Data Structure & Algorithm Optimization:
      // Pre-fetch existing menu items in 1 query and index with Map (O(1) lookup)
      // Eliminates 2*N sequential DB roundtrips (from O(N) DB trips to O(1) batch)
      const existingItems = await trx('menu_items').select('id', 'name');
      const existingMap = new Map();
      existingItems.forEach(i => existingMap.set(i.name.toLowerCase().trim(), i.id));

      const itemsToInsert = [];
      const updatePromises = [];

      for (const item of items) {
        const key = item.name.toLowerCase().trim();
        const existingId = existingMap.get(key);

        if (existingId) {
          updatePromises.push(
            trx('menu_items').where({ id: existingId }).update({
              category: item.category,
              customer_price: item.customer_price,
              vendor_cost: item.vendor_cost,
              is_veg: item.is_veg,
              is_outlet_only: true
            })
          );
          updatedCount++;
        } else {
          itemsToInsert.push({
            name: item.name,
            category: item.category,
            customer_price: item.customer_price,
            vendor_cost: item.vendor_cost,
            is_veg: item.is_veg,
            is_outlet_only: true
          });
          addedCount++;
        }
      }

      // Batch insert new items in 1 query
      if (itemsToInsert.length > 0) {
        await trx('menu_items').insert(itemsToInsert);
      }

      // Execute updates in parallel chunks
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }

      // Record in menu_upload_audits
      await trx('menu_upload_audits').insert({
        admin_id: req.staff.id,
        filename: req.file ? req.file.originalname : 'direct_text_upload.csv',
        items_added: addedCount,
        items_updated: updatedCount,
        snapshot_json: JSON.stringify(items.slice(0, 50))
      });
    });

    return res.json({
      success: true,
      message: `Menu synced successfully: ${addedCount} added, ${updatedCount} updated.`,
      stats: { addedCount, updatedCount, totalParsed, warnings: errors }
    });
  } catch (err) {
    console.error('uploadMenuCsv error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to process CSV menu upload.' });
  }
}

// 4. Get Menu Upload Audits
async function getMenuAudits(req, res) {
  try {
    const audits = await db('menu_upload_audits')
      .leftJoin('staff_users', 'menu_upload_audits.admin_id', 'staff_users.id')
      .select('menu_upload_audits.*', 'staff_users.name as uploaded_by')
      .orderBy('uploaded_at', 'desc')
      .limit(50);

    return res.json({ success: true, audits });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch menu upload audit trail.' });
  }
}

// 5. Locations API
async function getLocations(req, res) {
  try {
    const locations = await db('locations').where({ is_active: true }).orderBy('name', 'asc');
    return res.json({ success: true, locations });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch campus locations.' });
  }
}

async function addLocation(req, res) {
  try {
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Location name is required.' });
    }

    const clean = name.trim();
    const existing = await db('locations').where({ name: clean }).first();
    if (existing) {
      return res.status(400).json({ success: false, message: 'Location already exists.' });
    }

    const [newId] = await db('locations').insert({ name: clean, is_active: true });
    const location = await db('locations').where({ id: newId }).first();

    return res.json({ success: true, message: 'Campus location added successfully.', location });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to add location.' });
  }
}

// 6. Admin: Get Full Menu Catalog with Pricing & Stock
async function getAdminMenuItems(req, res) {
  try {
    const items = await db('menu_items')
      .orderBy('category', 'asc')
      .orderBy('name', 'asc');

    const mapped = items.map(item => {
      const custPrice = parseFloat(item.customer_price || 0);
      const vendCost = parseFloat(item.vendor_cost || 0);
      return {
        ...item,
        customer_price: custPrice,
        vendor_cost: vendCost,
        margin: parseFloat((custPrice - vendCost).toFixed(2)),
        margin_percent: custPrice > 0 ? parseFloat((((custPrice - vendCost) / custPrice) * 100).toFixed(1)) : 0,
        is_veg: !!item.is_veg,
        is_available: !!item.is_available,
        is_outlet_only: !!item.is_outlet_only
      };
    });

    return res.json({ success: true, items: mapped });
  } catch (err) {
    console.error('getAdminMenuItems error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch admin menu catalog.' });
  }
}

// 7. Admin: Create New Menu Item
async function createMenuItem(req, res) {
  try {
    const { name, category, customer_price, vendor_cost, is_veg, is_outlet_only, image_url, description } = req.body;

    if (!name || !category || customer_price === undefined || vendor_cost === undefined) {
      return res.status(400).json({ success: false, message: 'Name, Category, Customer Price, and Vendor Cost are required.' });
    }

    const cleanName = name.trim();
    const existing = await db('menu_items').where({ name: cleanName }).first();
    if (existing) {
      return res.status(400).json({ success: false, message: `An item named "${cleanName}" already exists.` });
    }

    const [newId] = await db('menu_items').insert({
      name: cleanName,
      category: category.trim(),
      customer_price: parseFloat(customer_price),
      vendor_cost: parseFloat(vendor_cost),
      is_veg: is_veg !== undefined ? !!is_veg : true,
      is_outlet_only: is_outlet_only !== undefined ? !!is_outlet_only : false,
      image_url: image_url ? image_url.trim() : null,
      description: description ? description.trim() : null,
      is_available: true
    });

    const created = await db('menu_items').where({ id: newId }).first();

    return res.json({
      success: true,
      message: `Dish "${cleanName}" created successfully!`,
      item: {
        ...created,
        customer_price: parseFloat(created.customer_price),
        vendor_cost: parseFloat(created.vendor_cost),
        margin: parseFloat((created.customer_price - created.vendor_cost).toFixed(2)),
        is_veg: !!created.is_veg,
        is_available: !!created.is_available,
        is_outlet_only: !!created.is_outlet_only
      }
    });
  } catch (err) {
    console.error('createMenuItem error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create menu item.' });
  }
}

// 8. Admin: Update Existing Menu Item
async function updateMenuItem(req, res) {
  try {
    const { id } = req.params;
    const { name, category, customer_price, vendor_cost, is_veg, is_outlet_only, image_url, description, is_available } = req.body;

    const item = await db('menu_items').where({ id }).first();
    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found.' });
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (category) updateData.category = category.trim();
    if (customer_price !== undefined) updateData.customer_price = parseFloat(customer_price);
    if (vendor_cost !== undefined) updateData.vendor_cost = parseFloat(vendor_cost);
    if (is_veg !== undefined) updateData.is_veg = !!is_veg;
    if (is_outlet_only !== undefined) updateData.is_outlet_only = !!is_outlet_only;
    if (image_url !== undefined) updateData.image_url = image_url ? image_url.trim() : null;
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (is_available !== undefined) updateData.is_available = !!is_available;

    await db('menu_items').where({ id }).update(updateData);
    const updated = await db('menu_items').where({ id }).first();

    return res.json({
      success: true,
      message: `Dish "${updated.name}" updated successfully!`,
      item: {
        ...updated,
        customer_price: parseFloat(updated.customer_price),
        vendor_cost: parseFloat(updated.vendor_cost),
        margin: parseFloat((updated.customer_price - updated.vendor_cost).toFixed(2)),
        is_veg: !!updated.is_veg,
        is_available: !!updated.is_available,
        is_outlet_only: !!updated.is_outlet_only
      }
    });
  } catch (err) {
    console.error('updateMenuItem error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update menu item.' });
  }
}

// 9. Admin: Toggle Availability Switch (In-Stock / Out-of-Stock)
async function toggleItemAvailability(req, res) {
  try {
    const { id } = req.params;
    const item = await db('menu_items').where({ id }).first();
    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found.' });
    }

    const newStatus = !item.is_available;
    await db('menu_items').where({ id }).update({ is_available: newStatus });

    return res.json({
      success: true,
      message: `"${item.name}" is now ${newStatus ? 'IN STOCK (Available)' : 'OUT OF STOCK (Unavailable)'}.`,
      is_available: newStatus
    });
  } catch (err) {
    console.error('toggleItemAvailability error:', err);
    return res.status(500).json({ success: false, message: 'Failed to toggle availability.' });
  }
}

// 10. Admin: Delete / Archive Menu Item
async function deleteMenuItem(req, res) {
  try {
    const { id } = req.params;
    const item = await db('menu_items').where({ id }).first();
    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found.' });
    }

    await db('menu_items').where({ id }).del();

    return res.json({
      success: true,
      message: `Dish "${item.name}" deleted from menu.`
    });
  } catch (err) {
    console.error('deleteMenuItem error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete menu item. It may be linked to existing order history.' });
  }
}

// 11. Admin: Get All Locations with Order Counts
async function getAllLocationsAdmin(req, res) {
  try {
    const locations = await db('locations').orderBy('id', 'asc');
    
    // Performance Fix: 1 single GROUP BY query instead of N individual count(*) queries
    const counts = await db('orders')
      .select('location_id')
      .count('id as cnt')
      .groupBy('location_id');

    const countMap = new Map(counts.map(c => [c.location_id, parseInt(c.cnt || 0)]));
    const enriched = locations.map(loc => ({
      ...loc,
      is_active: !!loc.is_active,
      total_orders: countMap.get(loc.id) || 0
    }));

    return res.json({ success: true, locations: enriched });
  } catch (err) {
    console.error('getAllLocationsAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch campus locations.' });
  }
}

// 12. Admin: Toggle Location Status
async function toggleLocationStatus(req, res) {
  try {
    const { id } = req.params;
    const loc = await db('locations').where({ id }).first();
    if (!loc) {
      return res.status(404).json({ success: false, message: 'Campus location not found.' });
    }

    const newStatus = !loc.is_active;
    await db('locations').where({ id }).update({ is_active: newStatus });

    return res.json({
      success: true,
      message: `Campus location "${loc.name}" is now ${newStatus ? 'ACTIVE' : 'INACTIVE'}.`,
      is_active: newStatus
    });
  } catch (err) {
    console.error('toggleLocationStatus error:', err);
    return res.status(500).json({ success: false, message: 'Failed to toggle location status.' });
  }
}

module.exports = {
  getMenu,
  getOutletMenu,
  uploadMenuCsv,
  getMenuAudits,
  getLocations,
  addLocation,
  getAdminMenuItems,
  createMenuItem,
  updateMenuItem,
  toggleItemAvailability,
  deleteMenuItem,
  getAllLocationsAdmin,
  toggleLocationStatus
};
