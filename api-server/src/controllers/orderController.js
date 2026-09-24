const db = require('../config/database');
const { broadcastOrderEvent } = require('../services/socketService');

// 1. Create Order
async function createOrder(req, res) {
  try {
    const userId = req.user.id;
    const { items, location_id, delivery_address_note, is_outlet_order, payment_source, razorpay_order_id, razorpay_payment_id } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items cannot be empty.' });
    }

    if (!location_id) {
      return res.status(400).json({ success: false, message: 'Delivery location is required.' });
    }

    const location = await db('locations').where({ id: location_id, is_active: true }).first();
    if (!location) {
      return res.status(400).json({ success: false, message: 'Invalid location selected.' });
    }

    // Proximity check assertion for outlet orders
    if (is_outlet_order && location.name !== 'Jhungiya') {
      return res.status(400).json({
        success: false,
        message: 'Outlet orders are strictly available only at the Jhungiya Outlet.'
      });
    }

    // Fetch all item details
    const itemIds = items.map(i => i.id);
    const dbItems = await db('menu_items').whereIn('id', itemIds).andWhere({ is_available: true });

    if (dbItems.length !== items.length) {
      return res.status(400).json({ success: false, message: 'Some items in cart are unavailable or removed.' });
    }

    let totalCustomerPrice = 0;
    let totalVendorCost = 0;
    const orderItemsData = [];

    for (const itemInput of items) {
      const dbItem = dbItems.find(i => i.id === itemInput.id);
      const qty = parseInt(itemInput.quantity) || 1;
      const custPrice = parseFloat(dbItem.customer_price);
      const vendCost = parseFloat(dbItem.vendor_cost);

      totalCustomerPrice += custPrice * qty;
      totalVendorCost += vendCost * qty;

      orderItemsData.push({
        menu_item_id: dbItem.id,
        item_name: dbItem.name,
        quantity: qty,
        customer_price: custPrice,
        vendor_cost: vendCost
      });
    }

    // Delivery Fee calculation
    let deliveryFee = 0;
    if (is_outlet_order) {
      deliveryFee = 0; // Self-pickup
    } else {
      // Campus delivery: Free above 100, else 15
      deliveryFee = totalCustomerPrice >= 100 ? 0 : 15;
    }

    const grandTotal = totalCustomerPrice + deliveryFee;
    const platformMargin = totalCustomerPrice - totalVendorCost;

    const chosenPaymentSource = payment_source || 'razorpay';
    let paymentStatus = 'PENDING';

    // Handle Full Wallet Redemption
    if (chosenPaymentSource === 'wallet') {
      const user = await db('users').where({ id: userId }).first();
      const currentBalance = parseFloat(user.wallet_balance || 0);

      if (currentBalance < 50.00) {
        return res.status(400).json({
          success: false,
          message: 'Loyalty wallet balance must be at least ₹50.00 to redeem for food.'
        });
      }

      if (currentBalance < grandTotal) {
        return res.status(400).json({
          success: false,
          message: `Insufficient wallet balance (₹${currentBalance.toFixed(2)}). Order total is ₹${grandTotal.toFixed(2)}.`
        });
      }

      paymentStatus = 'PAID';
    } else if (chosenPaymentSource === 'razorpay' && razorpay_payment_id) {
      paymentStatus = 'PAID';
    } else if (chosenPaymentSource === 'cod_outlet') {
      paymentStatus = 'PENDING'; // Paid at counter
    }

    // Generate Human Order Token (e.g. #2R-1052)
    const countRow = await db('orders').count('id as cnt').first();
    const tokenNum = 1000 + (parseInt(countRow.cnt) || 0) + 1;
    const orderToken = `#2R-${tokenNum}`;

    let newOrderId = null;

    await db.transaction(async (trx) => {
      // Deduct from wallet if wallet payment
      if (chosenPaymentSource === 'wallet') {
        const user = await trx('users').where({ id: userId }).first();
        const newBalance = parseFloat(user.wallet_balance) - grandTotal;
        await trx('users').where({ id: userId }).update({ wallet_balance: newBalance });

        // Record in wallet_transactions
        await trx('wallet_transactions').insert({
          user_id: userId,
          type: 'order_debit',
          amount: grandTotal,
          balance_after: newBalance,
          note: `Debited for food order ${orderToken}`
        });
      }

      // Insert Order
      const [ordId] = await trx('orders').insert({
        order_token: orderToken,
        user_id: userId,
        customer_name: req.user.name || 'Campus Student',
        customer_phone: req.user.phone_number,
        location_id: location.id,
        location_name: location.name,
        delivery_address_note: delivery_address_note || (is_outlet_order ? 'Jhungiya Outlet Counter' : location.name),
        is_outlet_order: !!is_outlet_order,
        total_customer_price: totalCustomerPrice,
        total_vendor_cost: totalVendorCost,
        platform_margin: platformMargin,
        delivery_fee: deliveryFee,
        payment_source: chosenPaymentSource,
        payment_status: paymentStatus,
        razorpay_order_id: razorpay_order_id || null,
        razorpay_payment_id: razorpay_payment_id || null,
        order_status: 'PLACED'
      });

      newOrderId = ordId;

      // Insert Order Items
      for (const itemData of orderItemsData) {
        await trx('order_items').insert({
          order_id: newOrderId,
          ...itemData
        });
      }

      // Link order id back to wallet transaction if needed
      if (chosenPaymentSource === 'wallet') {
        await trx('wallet_transactions')
          .where({ user_id: userId, type: 'order_debit' })
          .orderBy('id', 'desc')
          .first()
          .update({ related_order_id: newOrderId });
      }
    });

    const fullOrder = await db('orders').where({ id: newOrderId }).first();
    const fullItems = await db('order_items').where({ order_id: newOrderId });
    fullOrder.items = fullItems;

    // Real-time broadcast to kitchen and admin
    broadcastOrderEvent('NEW_ORDER', fullOrder);

    return res.json({
      success: true,
      message: 'Order placed successfully!',
      order: fullOrder
    });
  } catch (err) {
    console.error('createOrder error:', err);
    return res.status(500).json({ success: false, message: 'Failed to place order.' });
  }
}

// 2. Get Customer's Orders
async function getCustomerOrders(req, res) {
  try {
    const userId = req.user.id;
    const orders = await db('orders')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(30);

    const orderIds = orders.map(o => o.id);
    const items = await db('order_items').whereIn('order_id', orderIds);

    const enrichedOrders = orders.map(order => ({
      ...order,
      items: items.filter(i => i.order_id === order.id)
    }));

    return res.json({ success: true, orders: enrichedOrders });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch order history.' });
  }
}

// 3. Get Staff Orders (Live Feed with RBAC)
async function getStaffOrders(req, res) {
  try {
    const staff = req.staff;
    const { status, is_outlet } = req.query;

    let query = db('orders').orderBy('created_at', 'desc');

    // Vendor scoping: only sees orders for their outlet
    if (staff.role === 'VENDOR') {
      query = query.where({ is_outlet_order: true });
      if (staff.outlet_location_id) {
        query = query.andWhere({ location_id: staff.outlet_location_id });
      }
    } else if (is_outlet === 'true') {
      query = query.where({ is_outlet_order: true });
    } else if (is_outlet === 'false') {
      query = query.where({ is_outlet_order: false });
    }

    if (status && status !== 'ALL') {
      query = query.andWhere({ order_status: status });
    }

    const orders = await query.limit(100);
    const orderIds = orders.map(o => o.id);
    const items = await db('order_items').whereIn('order_id', orderIds);

    const enrichedOrders = orders.map(order => {
      let orderItems = items.filter(i => i.order_id === order.id);

      if (staff.role === 'VENDOR') {
        orderItems = orderItems.map(item => ({
          id: item.id,
          order_id: item.order_id,
          menu_item_id: item.menu_item_id,
          item_name: item.item_name,
          quantity: item.quantity,
          vendor_cost: item.vendor_cost,
          created_at: item.created_at
        }));

        const { total_customer_price, platform_margin, ...restOrder } = order;
        return {
          ...restOrder,
          items: orderItems
        };
      }

      return {
        ...order,
        items: orderItems
      };
    });

    return res.json({ success: true, orders: enrichedOrders });
  } catch (err) {
    console.error('getStaffOrders error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch staff orders.' });
  }
}

// 4. Update Order Status (State Machine + Cashback on Delivered)
async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { new_status } = req.body;
    const staff = req.staff;

    const validStatuses = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(new_status)) {
      return res.status(400).json({ success: false, message: 'Invalid order status specified.' });
    }

    const order = await db('orders').where({ id }).first();
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Role-based transition permissions check
    if (staff.role === 'VENDOR') {
      // Vendors can only advance up to READY
      const vendorAllowed = ['ACCEPTED', 'PREPARING', 'READY'];
      if (!vendorAllowed.includes(new_status)) {
        return res.status(403).json({
          success: false,
          message: 'Vendors can only advance orders to Accepted, Preparing, or Ready.'
        });
      }
    }

    await db.transaction(async (trx) => {
      await trx('orders').where({ id }).update({
        order_status: new_status,
        updated_at: db.fn.now()
      });

      // Award ₹3 Cashback upon DELIVERED (Only for non-wallet real-money orders)
      if (new_status === 'DELIVERED' && !order.is_cashback_awarded) {
        if (order.payment_source === 'razorpay') {
          const cashbackAmount = 3.00;
          const customer = await trx('users').where({ id: order.user_id }).first();
          const newBalance = parseFloat(customer.wallet_balance || 0) + cashbackAmount;

          await trx('users').where({ id: order.user_id }).update({ wallet_balance: newBalance });

          await trx('wallet_transactions').insert({
            user_id: order.user_id,
            type: 'cashback_credit',
            amount: cashbackAmount,
            related_order_id: order.id,
            balance_after: newBalance,
            note: `₹3.00 Loyalty Cashback credited for delivery of ${order.order_token}`
          });

          await trx('orders').where({ id }).update({ is_cashback_awarded: true });
        }
      }
    });

    const updated = await db('orders').where({ id }).first();
    const items = await db('order_items').where({ order_id: id });
    updated.items = items;

    // Broadcast status change
    broadcastOrderEvent('ORDER_STATUS_CHANGED', updated);

    return res.json({
      success: true,
      message: `Order status changed to ${new_status}`,
      order: updated
    });
  } catch (err) {
    console.error('updateOrderStatus error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
}

// 5. Assign Runner to Campus Delivery
async function assignRunner(req, res) {
  try {
    const { id } = req.params;
    const { runner_name, runner_phone } = req.body;

    if (!runner_name || !runner_phone) {
      return res.status(400).json({ success: false, message: 'Runner name and phone are required.' });
    }

    await db('orders').where({ id }).update({
      assigned_runner_name: runner_name.trim(),
      assigned_runner_phone: runner_phone.trim(),
      order_status: 'OUT_FOR_DELIVERY',
      updated_at: db.fn.now()
    });

    const updated = await db('orders').where({ id }).first();
    broadcastOrderEvent('ORDER_STATUS_CHANGED', updated);

    return res.json({ success: true, message: 'Runner assigned successfully.', order: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to assign runner.' });
  }
}

module.exports = {
  createOrder,
  getCustomerOrders,
  getStaffOrders,
  updateOrderStatus,
  assignRunner
};
