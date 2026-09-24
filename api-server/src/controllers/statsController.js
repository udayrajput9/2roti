const db = require('../config/database');

async function getDashboardStats(req, res) {
  try {
    const orders = await db('orders');
    const totalUsers = await db('users').count('id as cnt').first();

    let totalGmv = 0;
    let totalPlatformMargin = 0;
    let totalVendorPayable = 0;
    let campusOrdersCount = 0;
    let outletOrdersCount = 0;
    let pendingOrdersCount = 0;

    orders.forEach((o) => {
      const custPrice = parseFloat(o.total_customer_price || 0);
      const vendCost = parseFloat(o.total_vendor_cost || 0);
      const margin = parseFloat(o.platform_margin || 0);

      totalGmv += custPrice;
      totalPlatformMargin += margin;

      if (o.is_outlet_order) {
        outletOrdersCount++;
      } else {
        campusOrdersCount++;
      }

      if (o.order_status !== 'DELIVERED' && o.order_status !== 'CANCELLED' && o.order_status !== 'REFUNDED') {
        pendingOrdersCount++;
      }

      if (o.order_status === 'DELIVERED' && !o.settlement_id && !o.is_test_simulated) {
        totalVendorPayable += vendCost;
      }
    });

    const recentOrders = await db('orders')
      .orderBy('created_at', 'desc')
      .limit(6);

    return res.json({
      success: true,
      stats: {
        total_gmv: totalGmv,
        platform_margin: totalPlatformMargin,
        total_orders: orders.length,
        campus_orders: campusOrdersCount,
        outlet_orders: outletOrdersCount,
        pending_orders: pendingOrdersCount,
        total_customers: parseInt(totalUsers.cnt) || 0,
        pending_vendor_payable: totalVendorPayable
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
    const defaultSettings = {
      kitchen_status: 'OPEN',
      kitchen_timing: '11:00 AM - 11:30 PM',
      free_delivery_threshold: '100',
      delivery_fee: '15',
      cashback_per_order: '3',
      min_wallet_redemption: '50',
      support_phone: '+91 9999999999',
      support_whatsapp: '919999999999',
      announcement_banner: 'Fresh hot meals cooked and delivered right to your campus hostel gate!'
    };

    const rows = await db('system_settings');
    const settingsMap = { ...defaultSettings };
    rows.forEach(r => {
      settingsMap[r.key] = r.value;
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
        const valStr = String(value);
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

module.exports = {
  getDashboardStats,
  getSystemSettings,
  updateSystemSettings
};
