const db = require('../config/database');

async function getDashboardStats(req, res) {
  try {
    // Scalability Optimization: Run aggregate queries in parallel directly in DB
    // Prevents loading 10,000+ orders into Node.js heap memory (O(1) memory complexity)
    const [statsRow, totalUsers, outletRow, pendingRow, payableRow, recentOrders] = await Promise.all([
      db('orders')
        .count('id as total_orders')
        .sum('total_customer_price as total_gmv')
        .sum('platform_margin as total_platform_margin')
        .first(),
      db('users').count('id as cnt').first(),
      db('orders').where({ is_outlet_order: true }).count('id as cnt').first(),
      db('orders').whereNotIn('order_status', ['DELIVERED', 'CANCELLED', 'REFUNDED']).count('id as cnt').first(),
      db('orders')
        .where({ order_status: 'DELIVERED', is_test_simulated: false })
        .whereNull('settlement_id')
        .sum('total_vendor_cost as sum')
        .first(),
      db('orders')
        .orderBy('created_at', 'desc')
        .limit(6)
    ]);

    const totalOrders = parseInt(statsRow?.total_orders || 0);
    const outletOrders = parseInt(outletRow?.cnt || 0);
    const campusOrders = Math.max(0, totalOrders - outletOrders);

    return res.json({
      success: true,
      stats: {
        total_gmv: parseFloat(statsRow?.total_gmv || 0),
        platform_margin: parseFloat(statsRow?.total_platform_margin || 0),
        total_orders: totalOrders,
        campus_orders: campusOrders,
        outlet_orders: outletOrders,
        pending_orders: parseInt(pendingRow?.cnt || 0),
        total_customers: parseInt(totalUsers?.cnt || 0),
        pending_vendor_payable: parseFloat(payableRow?.sum || 0)
      },
      recent_orders: recentOrders
    });
  } catch (err) {
    console.error('getDashboardStats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats.' });
  }
}

// 2. Get System & Kitchen Configuration Settings
async function getSystemSettings(req, res) {
  try {
    const rows = await db('system_settings');
    const settingsMap = {};
    rows.forEach(r => {
      try {
        if (r.value.startsWith('{') || r.value.startsWith('[')) {
          settingsMap[r.key] = JSON.parse(r.value);
        } else {
          settingsMap[r.key] = r.value;
        }
      } catch(e) { settingsMap[r.key] = r.value; }
    });
    return res.json({ success: true, settings: settingsMap });
  } catch (err) {
    console.error('getSystemSettings error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch system settings.' });
  }
}

// 3. Update System Settings
async function updateSystemSettings(req, res) {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, message: 'Settings payload is required.' });
    }

    await db.transaction(async (trx) => {
      for (const [key, value] of Object.entries(settings)) {
        const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
        const existing = await trx('system_settings').where({ key }).first();
        if (existing) {
          await trx('system_settings').where({ key }).update({ value: valStr, updated_at: db.fn.now() });
        } else {
          await trx('system_settings').insert({ key, value: valStr });
        }
      }
    });

    const updatedRows = await db('system_settings');
    const updatedMap = {};
    updatedRows.forEach(r => {
      updatedMap[r.key] = r.value;
    });

    return res.json({
      success: true,
      message: 'System settings saved and applied successfully!',
      settings: updatedMap
    });
  } catch (err) {
    console.error('updateSystemSettings error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update system settings.' });
  }
}

// 4. Public System Settings (for Consumer App)
async function getPublicSettings(req, res) {
  try {
    const rows = await db('system_settings').select('key', 'value');
    const settings = {
      kitchen_status: 'OPEN',
      kitchen_timing: '11:00 AM - 11:30 PM',
      free_delivery_threshold: '100',
      delivery_fee: '15',
      cashback_per_order: '3'
    };
    rows.forEach(r => {
      try {
        if (r.value.startsWith('{') || r.value.startsWith('[')) {
          settings[r.key] = JSON.parse(r.value);
        } else {
          settings[r.key] = r.value;
        }
      } catch(e) { settings[r.key] = r.value; }
    });
    return res.json({ success: true, settings });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch public settings.' });
  }
}

module.exports = {
  getDashboardStats,
  getSystemSettings,
  updateSystemSettings,
  getPublicSettings
};
