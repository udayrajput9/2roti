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
    const defaultDeliveryFee = String(parseFloat(process.env.DEFAULT_DELIVERY_FEE || 10));
    const defaultThreshold = String(parseFloat(process.env.FREE_DELIVERY_THRESHOLD || 100));
    const settings = {
      kitchen_status: 'OPEN',
      kitchen_timing: '11:00 AM - 11:30 PM',
      free_delivery_threshold: defaultThreshold,
      delivery_fee: defaultDeliveryFee,
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

    // Alias mapping for compatibility between DEFAULT_DELIVERY_FEE and delivery_fee
    if (settings.DEFAULT_DELIVERY_FEE && (!settings.delivery_fee || settings.delivery_fee === '15' || settings.delivery_fee === '15.00')) {
      settings.delivery_fee = String(parseFloat(settings.DEFAULT_DELIVERY_FEE));
    }
    if (settings.FREE_DELIVERY_THRESHOLD && !settings.free_delivery_threshold) {
      settings.free_delivery_threshold = String(parseFloat(settings.FREE_DELIVERY_THRESHOLD));
    }

    // Strictly enforce 10 if fee is 15
    if (settings.delivery_fee === '15' || settings.delivery_fee === '15.00' || settings.delivery_fee === 15 || !settings.delivery_fee) {
      settings.delivery_fee = '10';
    }
    if (settings.DEFAULT_DELIVERY_FEE === '15' || settings.DEFAULT_DELIVERY_FEE === '15.00' || settings.DEFAULT_DELIVERY_FEE === 15) {
      settings.DEFAULT_DELIVERY_FEE = '10';
    }
    return res.json({ success: true, settings });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch public settings.' });
  }
}

// 5. Emergency Killswitch: Stop / Resume Payments & Orders
async function toggleStopPayments(req, res) {
  try {
    const { stop } = req.body; // boolean
    let shouldStop = stop;
    if (shouldStop === undefined) {
      const row = await db('system_settings').where({ key: 'emergency_stop_payments' }).first();
      shouldStop = !(row && row.value === 'true');
    }

    const valStr = shouldStop ? 'true' : 'false';
    const kitchenVal = shouldStop ? 'STOPPED' : 'OPEN';

    await db.transaction(async (trx) => {
      // 1. emergency_stop_payments
      const ex1 = await trx('system_settings').where({ key: 'emergency_stop_payments' }).first();
      if (ex1) {
        await trx('system_settings').where({ key: 'emergency_stop_payments' }).update({ value: valStr, updated_at: db.fn.now() });
      } else {
        await trx('system_settings').insert({ key: 'emergency_stop_payments', value: valStr });
      }

      // 2. kitchen_status
      const ex2 = await trx('system_settings').where({ key: 'kitchen_status' }).first();
      if (ex2) {
        await trx('system_settings').where({ key: 'kitchen_status' }).update({ value: kitchenVal, updated_at: db.fn.now() });
      } else {
        await trx('system_settings').insert({ key: 'kitchen_status', value: kitchenVal });
      }
    });

    const { broadcastOrderEvent } = require('../services/socketService');
    try {
      broadcastOrderEvent('EMERGENCY_HALT_CHANGED', { is_stopped: shouldStop, kitchen_status: kitchenVal });
    } catch(e) {}

    return res.json({
      success: true,
      is_stopped: shouldStop,
      kitchen_status: kitchenVal,
      message: shouldStop
        ? '🛑 Emergency Halt Activated: All online payments & orders are now completely STOPPED.'
        : '🟢 Payments & orders have been RESUMED. Kitchen is now accepting orders.'
    });
  } catch (err) {
    console.error('toggleStopPayments error:', err);
    return res.status(500).json({ success: false, message: 'Failed to toggle emergency payment stop.' });
  }
}

module.exports = {
  getDashboardStats,
  getSystemSettings,
  updateSystemSettings,
  getPublicSettings,
  toggleStopPayments
};
