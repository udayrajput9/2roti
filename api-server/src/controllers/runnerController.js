const db = require('../config/database');
const { broadcastOrderEvent } = require('../services/socketService');

// 1. Get Order by Token (For Runner App Scan)
async function getOrderByToken(req, res) {
  try {
    let rawToken = req.params.token || req.query.token || req.body?.token;
    if (!rawToken) {
      return res.status(400).json({ success: false, message: 'Order token is required.' });
    }

    const cleanToken = decodeURIComponent(String(rawToken).trim());
    const tokenVariants = [
      cleanToken,
      cleanToken.replace(/^#/, ''),
      '#' + cleanToken.replace(/^#/, '')
    ];

    const order = await db('orders')
      .whereIn('order_token', tokenVariants)
      .first();
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const items = await db('order_items').where({ order_id: order.id });
    order.items = items;

    // Do NOT send the OTP in the response for security reasons!
    delete order.delivery_otp;

    return res.json({ success: true, order });
  } catch (err) {
    console.error('getOrderByToken error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch order.' });
  }
}

// 1.5 Get all active orders (for Runner Tabs)
async function getActiveOrders(req, res) {
  try {
    const { zone } = req.query;

    let query = db('orders')
      .whereIn('order_status', ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'])
      .whereRaw("created_at >= (NOW() - INTERVAL '24 hours')");

    if (zone && String(zone).trim() !== '') {
      query = query.whereRaw('LOWER(location_name) LIKE ?', ['%' + String(zone).trim().toLowerCase() + '%']);
    }

    let orders;
    try {
      orders = await query.orderBy('created_at', 'asc');
    } catch (e) {
      let fallbackQuery = db('orders')
        .whereIn('order_status', ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY']);
      if (zone && String(zone).trim() !== '') {
        fallbackQuery = fallbackQuery.whereRaw('LOWER(location_name) LIKE ?', ['%' + String(zone).trim().toLowerCase() + '%']);
      }
      orders = await fallbackQuery.orderBy('created_at', 'asc');
    }
      
    const orderIds = orders.map(o => o.id);
    const items = await db('order_items').whereIn('order_id', orderIds);
    const itemsMap = new Map();
    items.forEach(it => {
      if (!itemsMap.has(it.order_id)) itemsMap.set(it.order_id, []);
      itemsMap.get(it.order_id).push(it);
    });

    const enrichedOrders = orders.map(o => {
      o.items = itemsMap.get(o.id) || [];
      return o;
    });

    return res.json({ success: true, orders: enrichedOrders });
  } catch (err) {
    console.error('getActiveOrders error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch active orders.' });
  }
}

// 2. Verify OTP and Mark as Delivered
async function verifyOtpAndDeliver(req, res) {
  try {
    let rawToken = req.params.token || req.body?.token || req.query.token;
    const { otp } = req.body;

    if (!rawToken) {
      return res.status(400).json({ success: false, message: 'Order token is required.' });
    }
    if (!otp) {
      return res.status(400).json({ success: false, message: 'OTP is required.' });
    }

    const cleanToken = decodeURIComponent(String(rawToken).trim());
    const tokenVariants = [
      cleanToken,
      cleanToken.replace(/^#/, ''),
      '#' + cleanToken.replace(/^#/, '')
    ];

    const order = await db('orders')
      .whereIn('order_token', tokenVariants)
      .first();
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.order_status === 'DELIVERED') {
      return res.status(400).json({ success: false, message: 'Order is already delivered.' });
    }

    if (String(order.delivery_otp).trim() !== String(otp).trim()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }

    // OTP matches! Mark as delivered and award cashback
    await db.transaction(async (trx) => {
      await trx('orders').where({ id: order.id }).update({
        order_status: 'DELIVERED',
        updated_at: db.fn.now()
      });

      // /* CASHBACK_DISABLED */ Award Cashback upon DELIVERED (Only for non-wallet real-money orders)
      if (false && !order.is_cashback_awarded && order.payment_source === 'razorpay') { /* CASHBACK_DISABLED */
        const cbRow = await trx('system_settings').where({ key: 'cashback_per_order' }).first();
        const cashbackAmount = cbRow && !isNaN(parseFloat(cbRow.value)) ? parseFloat(cbRow.value) : 3.00;

        const customer = await trx('users').where({ id: order.user_id }).first();
        const newBalance = parseFloat(customer.wallet_balance || 0) + cashbackAmount;

        await trx('users').where({ id: order.user_id }).update({ wallet_balance: newBalance });

        await trx('wallet_transactions').insert({
          user_id: order.user_id,
          type: 'cashback_credit',
          amount: cashbackAmount,
          related_order_id: order.id,
          balance_after: newBalance,
          note: `₹${cashbackAmount.toFixed(2)} Loyalty Cashback credited for delivery of ${order.order_token}`
        });

        await trx('orders').where({ id: order.id }).update({ is_cashback_awarded: true });
      }
    });

    const updated = await db('orders').where({ id: order.id }).first();
    const items = await db('order_items').where({ order_id: order.id });
    updated.items = items;
    delete updated.delivery_otp;

    broadcastOrderEvent('ORDER_STATUS_CHANGED', updated);

    return res.json({ success: true, message: 'Delivery verified and marked as Delivered!', order: updated });
  } catch (err) {
    console.error('verifyOtpAndDeliver error:', err);
    return res.status(500).json({ success: false, message: 'Failed to verify OTP.' });
  }
}

module.exports = {
  getOrderByToken,
  getActiveOrders,
  verifyOtpAndDeliver
};
