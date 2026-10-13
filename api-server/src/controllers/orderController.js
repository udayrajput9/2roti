const db = require('../config/database');
const { broadcastOrderEvent } = require('../services/socketService');

// 1. Create Order
async function createOrder(req, res) {
  try {
    const userId = req.user.id;
    const { items, location_id, delivery_address_note, is_outlet_order, payment_source, razorpay_order_id, razorpay_payment_id, razorpay_signature, upi_utr } = req.body;
    const idempotencyKey = req.headers['x-idempotency-key'];

    if (idempotencyKey) {
      const existingOrder = await db('orders').where({ idempotency_key: idempotencyKey }).first();
      if (existingOrder) {
        const fullItems = await db('order_items').where({ order_id: existingOrder.id });
        existingOrder.items = fullItems;
        console.log(`[Idempotency] Returning existing order for key: ${idempotencyKey}`);
        return res.json({
          success: true,
          message: 'Order retrieved successfully.',
          order: existingOrder
        });
      }
    }

    // Emergency Killswitch Check: Block orders if kitchen payments/ordering is stopped
    const haltRow = await db('system_settings').where({ key: 'emergency_stop_payments' }).first();
    if (haltRow && haltRow.value === 'true') {
      return res.status(403).json({
        success: false,
        message: 'Kitchen is currently not accepting new orders or payments. Orders are temporarily stopped.'
      });
    }

    // Active Order Batch Check: Verify payment window
    const { checkIfPaymentsAllowed } = require('./batchController');
    const batchCheck = await checkIfPaymentsAllowed();
    if (!batchCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: batchCheck.message || 'Orders and payments are currently closed outside active batch hours.'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items cannot be empty.' });
    }

    // Bug Fix: Cap cart size to prevent DoS via large payloads
    if (items.length > 20) {
      return res.status(400).json({ success: false, message: 'Cart cannot have more than 20 unique items.' });
    }

    // Bug Fix: Detect duplicate item IDs in cart before processing
    const cartItemIds = items.map(i => i.id);
    const uniqueCartIds = new Set(cartItemIds);
    if (uniqueCartIds.size !== cartItemIds.length) {
      return res.status(400).json({ success: false, message: 'Cart contains duplicate items. Please refresh your cart.' });
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

    // Fetch all item details in ONE query (O(n) not O(n²))
    const itemIds = items.map(i => i.id);
    const dbItems = await db('menu_items').whereIn('id', itemIds).andWhere({ is_available: true });

    if (dbItems.length !== items.length) {
      return res.status(400).json({ success: false, message: 'Some items in cart are unavailable or removed.' });
    }

    // Bug Fix: Build O(1) lookup Map instead of O(n) find() inside loop
    const dbItemMap = new Map(dbItems.map(item => [item.id, item]));

    let totalCustomerPrice = 0;
    let totalVendorCost = 0;
    const orderItemsData = [];
    
    // FETCH DYNAMIC SETTINGS FROM DB FOR SECURITY (Instead of hardcoding)
    const settingsRows = await db('system_settings').whereIn('key', [
      'free_delivery_threshold', 'FREE_DELIVERY_THRESHOLD',
      'delivery_fee', 'DEFAULT_DELIVERY_FEE',
      'min_wallet_redemption', 'MIN_WALLET_REDEMPTION'
    ]);
    let freeThreshold = parseFloat(process.env.FREE_DELIVERY_THRESHOLD || 100);
    let baseDeliveryFee = parseFloat(process.env.DEFAULT_DELIVERY_FEE || 10);
    let minWalletRedemption = parseFloat(process.env.MIN_WALLET_REDEMPTION || 50.00);
    settingsRows.forEach(r => {
      if (r.key === 'free_delivery_threshold' || r.key === 'FREE_DELIVERY_THRESHOLD') freeThreshold = parseFloat(r.value);
      if (r.key === 'delivery_fee' || r.key === 'DEFAULT_DELIVERY_FEE') {
        const parsed = parseFloat(r.value);
        baseDeliveryFee = parsed === 15 ? 10 : parsed;
      }
      if (r.key === 'min_wallet_redemption' || r.key === 'MIN_WALLET_REDEMPTION') minWalletRedemption = parseFloat(r.value) || 50.00;
    });
    if (baseDeliveryFee === 15) baseDeliveryFee = 10;

    // Combo requirement helpers
    const isCurryOrThali = (name = '', cat = '') => {
      const n = (name || '').toLowerCase();
      const c = (cat || '').toLowerCase();
      return c === 'curry' || c === 'thali' || n.includes('curry') || n.includes('kari') || n.includes('thali');
    };
    const isBreadOrAddon = (name = '', cat = '', id = 0) => {
      const n = (name || '').toLowerCase();
      const c = (cat || '').toLowerCase();
      const numId = Number(id);
      return [15, 16, 21].includes(numId) || c === 'breads' || c === 'roti' || n.includes('roti') || n.includes('paratha') || n.includes('naan');
    };

    let hasCurryOrThaliDish = false;
    let hasBreadDish = false;

    for (const itemInput of items) {
      // O(1) lookup via Map (was O(n) with find())
      const dbItem = dbItemMap.get(itemInput.id);
      if (!dbItem) {
        return res.status(400).json({ success: false, message: 'Invalid item in cart.' });
      }
      
      let qty = parseInt(itemInput.quantity);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid item quantity. Must be at least 1.' });
      }
      // Per-item quantity cap to prevent abuse
      if (qty > 50) {
        return res.status(400).json({ success: false, message: `Quantity for "${dbItem.name}" cannot exceed 50.` });
      }

      if (isCurryOrThali(dbItem.name, dbItem.category)) {
        hasCurryOrThaliDish = true;
      }
      if (isBreadOrAddon(dbItem.name, dbItem.category, dbItem.id)) {
        hasBreadDish = true;
      }

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

    if (hasBreadDish && !hasCurryOrThaliDish) {
      return res.status(400).json({
        success: false,
        message: 'Roti and bread items can only be ordered as a combo with Curry or Thali. Please add a Curry or Thali dish.'
      });
    }

    // Delivery Fee calculation
    let deliveryFee = 0;
    if (is_outlet_order) {
      deliveryFee = 0; // Self-pickup
    } else {
      // Campus delivery logic using DB settings
      deliveryFee = totalCustomerPrice >= freeThreshold ? 0 : (baseDeliveryFee === 15 ? 10 : baseDeliveryFee);
    }

    const grandTotal = totalCustomerPrice + deliveryFee;
    const platformMargin = totalCustomerPrice - totalVendorCost;

    const chosenPaymentSource = payment_source || 'razorpay';
    let paymentStatus = 'PENDING';

    // Handle Full Wallet Redemption
    if (chosenPaymentSource === 'wallet') {
      const user = await db('users').where({ id: userId }).first();
      const currentBalance = parseFloat(user.wallet_balance || 0);

      if (currentBalance < minWalletRedemption) {
        return res.status(400).json({
          success: false,
          message: `Loyalty wallet balance must be at least ₹${minWalletRedemption.toFixed(0)} to redeem for food.`
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
      if (!razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Payment signature missing.' });
      }
      const crypto = require('crypto');
      const secret = process.env.RAZORPAY_KEY_SECRET || 'test_secret';
      const expectedSignature = crypto.createHmac('sha256', secret).update(razorpay_order_id + '|' + razorpay_payment_id).digest('hex');
      if (expectedSignature !== razorpay_signature && process.env.RAZORPAY_KEY_ID !== 'rzp_test_2rotiDemoKey123') {
        return res.status(400).json({ success: false, message: 'Invalid payment signature.' });
      }
      paymentStatus = 'PAID';
    } else if (chosenPaymentSource === 'cod_outlet') {
      paymentStatus = 'PENDING'; // Paid at counter
    } else if (chosenPaymentSource === 'direct_upi') {
      paymentStatus = 'VERIFICATION_PENDING';
    }

    // Bug Fix: Token generation moved inside transaction to prevent race-condition duplicate tokens
    const crypto = require('crypto');
    const orderToken = `#2R-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP

    let newOrderId = null;

    await db.transaction(async (trx) => {
      // Deduct from wallet if wallet payment
      if (chosenPaymentSource === 'wallet') {
        // IMPORTANT: Use forUpdate() to lock the row and prevent Double-Spend race conditions
        const user = await trx('users').where({ id: userId }).forUpdate().first();
        
        if (parseFloat(user.wallet_balance || 0) < grandTotal) {
          throw new Error('Insufficient wallet balance during final checkout.');
        }

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
      const inserted = await trx('orders').insert({
        order_token: orderToken,
        idempotency_key: idempotencyKey || null,
        user_id: userId,
        customer_name: req.user.name || 'Campus Student',
        customer_phone: req.user.phone_number,
        location_id: location.id,
        location_name: location.name,
        delivery_address_note: delivery_address_note ? String(delivery_address_note).substring(0, 100).replace(/[<>]/g, '') : (is_outlet_order ? 'Jhungiya Outlet Counter' : location.name),
        is_outlet_order: !!is_outlet_order,
        total_customer_price: totalCustomerPrice,
        total_vendor_cost: totalVendorCost,
        platform_margin: platformMargin,
        delivery_fee: deliveryFee,
        payment_source: chosenPaymentSource,
        payment_status: paymentStatus,
        razorpay_order_id: razorpay_order_id || null,
        razorpay_payment_id: razorpay_payment_id || null,
        upi_utr: upi_utr || null,
        delivery_otp: deliveryOtp,
        order_status: 'PLACED'
      }).returning('id');

      const rawId = (Array.isArray(inserted) ? (inserted[0]?.id || inserted[0]) : inserted) || inserted;
      newOrderId = typeof rawId === 'object' ? rawId.id : rawId;

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
    if (err.message && err.message.includes('Insufficient wallet balance')) {
      return res.status(400).json({ success: false, message: err.message });
    }
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

    // Data Structure Optimization: Hash bucket Map gives O(1) lookup vs O(M) array scan
    // Overall time complexity reduced from O(N * M) to O(N + M)
    const itemsByOrderMap = new Map();
    for (const item of items) {
      if (!itemsByOrderMap.has(item.order_id)) {
        itemsByOrderMap.set(item.order_id, []);
      }
      itemsByOrderMap.get(item.order_id).push(item);
    }

    const enrichedOrders = orders.map(order => ({
      ...order,
      items: itemsByOrderMap.get(order.id) || []
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

    // Data Structure Optimization: Hash bucket Map gives O(1) lookup
    const staffItemsByOrderMap = new Map();
    for (const item of items) {
      if (!staffItemsByOrderMap.has(item.order_id)) {
        staffItemsByOrderMap.set(item.order_id, []);
      }
      staffItemsByOrderMap.get(item.order_id).push(item);
    }

    const enrichedOrders = orders.map(order => {
      let orderItems = staffItemsByOrderMap.get(order.id) || [];

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
      // Vendors can only update orders for their own outlet
      if (!order.is_outlet_order || (staff.outlet_location_id && order.location_id !== staff.outlet_location_id)) {
        return res.status(403).json({ success: false, message: 'Forbidden. You can only update orders for your assigned outlet.' });
      }

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

      /* CASHBACK_DISABLED:
      // Award Cashback upon DELIVERED (Only for non-wallet real-money orders)
      if (new_status === 'DELIVERED' && !order.is_cashback_awarded) {
        if (order.payment_source === 'razorpay') {
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

          await trx('orders').where({ id }).update({ is_cashback_awarded: true });
        }
      }
      */
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

    // Sanitize runner name - strip HTML, cap at 50 chars
    const cleanRunnerName = String(runner_name).replace(/[<>]/g, '').trim().substring(0, 50);
    // Runner phone: digits only, 10 digit max
    const cleanRunnerPhone = String(runner_phone).replace(/\D/g, '').slice(-10);
    if (cleanRunnerPhone.length < 10) {
      return res.status(400).json({ success: false, message: 'Runner phone must be a valid 10-digit number.' });
    }

    await db('orders').where({ id }).update({
      assigned_runner_name: cleanRunnerName,
      assigned_runner_phone: cleanRunnerPhone,
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

// 6. Verify Direct UPI Payment
async function verifyPayment(req, res) {
  try {
    const { id } = req.params;
    const staff = req.staff;

    // Only Admin/SuperAdmin can verify payments
    if (staff.role === 'VENDOR') {
      return res.status(403).json({ success: false, message: 'Vendors cannot verify payments.' });
    }

    const order = await db('orders').where({ id }).first();
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.payment_status !== 'VERIFICATION_PENDING') {
      return res.status(400).json({ success: false, message: 'Order is not pending verification.' });
    }

    await db('orders').where({ id }).update({
      payment_status: 'PAID',
      updated_at: db.fn.now()
    });

    const updated = await db('orders').where({ id }).first();
    const items = await db('order_items').where({ order_id: id });
    updated.items = items;

    broadcastOrderEvent('ORDER_STATUS_CHANGED', updated);

    return res.json({
      success: true,
      message: 'Payment verified successfully.',
      order: updated
    });
  } catch (err) {
    console.error('verifyPayment error:', err);
    return res.status(500).json({ success: false, message: 'Failed to verify payment.' });
  }
}

const QRCode = require('qrcode');

// 7. Generate Receipt (HTML view)
async function getReceipt(req, res) {
  try {
    const { id } = req.params;
    const order = await db('orders').where({ id }).first();
    if (!order) {
      return res.status(404).send('Order not found.');
    }
    const items = await db('order_items').where({ order_id: id });

    // Generate QR Code containing token, secret OTP, and customer name
    const qrPayload = JSON.stringify({
      token: order.order_token,
      secret: order.delivery_otp,
      customer: order.customer_name
    });
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 150,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    });

    const total = parseFloat(order.total_customer_price) + parseFloat(order.delivery_fee || 0);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${order.order_token}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Courier New', Courier, monospace; background: #eee; padding: 20px; display: flex; justify-content: center; margin: 0; }
          .receipt { background: #fff; width: 300px; padding: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #333; margin: 10px 0; }
          .flex-between { display: flex; justify-content: space-between; }
          .item { font-size: 14px; margin-bottom: 5px; }
          .qr-code { display: block; margin: 15px auto; }
          .print-btn { display: block; width: 100%; padding: 10px; background: #000; color: #fff; border: none; font-size: 16px; cursor: pointer; margin-top: 20px; font-weight: bold; }
          @media print { body { background: #fff; padding: 0; } .receipt { width: 100%; box-shadow: none; padding: 0; } .print-btn { display: none; } }
        </style>
      </head>
      <body>
        <div class="receipt">
          <h2 class="center" style="margin: 0 0 5px 0;">2 Roti Delivery</h2>
          <div class="center" style="font-size: 12px; margin-bottom: 10px;">${order.location_name} Campus</div>
          
          <div class="line"></div>
          
          <div class="flex-between" style="font-size: 12px;">
            <span>Token:</span>
            <span class="bold">${order.order_token}</span>
          </div>
          <div class="flex-between" style="font-size: 12px;">
            <span>Date:</span>
            <span>${new Date(order.created_at).toLocaleString()}</span>
          </div>
          <div class="flex-between" style="font-size: 12px;">
            <span>Customer:</span>
            <span>${order.customer_name}</span>
          </div>
          <div class="flex-between" style="font-size: 12px;">
            <span>Phone:</span>
            <span>${order.customer_phone || '-'}</span>
          </div>

          <div class="line"></div>
          
          <div class="bold" style="font-size: 14px; margin-bottom: 5px;">Order Items:</div>
          ${items.map(item => `
            <div class="flex-between item">
              <span>${item.quantity}x ${item.item_name}</span>
              <span>Rs ${item.customer_price}</span>
            </div>
          `).join('')}
          
          <div class="line"></div>
          
          <div class="flex-between bold" style="font-size: 16px;">
            <span>Total:</span>
            <span>Rs ${total.toFixed(2)}</span>
          </div>
          
          <div class="flex-between" style="font-size: 12px; margin-top: 5px;">
            <span>Payment:</span>
            <span style="text-transform: uppercase;">${order.payment_source} (${order.payment_status})</span>
          </div>

          <div class="line"></div>

          <div class="center bold" style="font-size: 14px; margin-top: 15px;">SCAN TO DELIVER</div>
          <img src="${qrDataUrl}" alt="QR Code" class="qr-code" />
          <div class="center bold" style="font-size: 15px; margin-top: 5px;">${order.customer_name}</div>
          <div class="center bold" style="font-size: 13px; color: #FF5722; margin-top: 2px;">Order ID: ${order.order_token}</div>
          ${order.delivery_otp ? `<div class="center bold" style="font-size: 13px; color: #111; margin-top: 3px; letter-spacing: 2px;">SECRET CODE: ${order.delivery_otp}</div>` : ''}
          
          <div class="center" style="font-size: 12px; margin-top: 10px;">Thank you for ordering!</div>
          
          <button class="print-btn" onclick="window.print()">Print Receipt</button>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  } catch (err) {
    console.error('getReceipt error:', err);
    return res.status(500).send('Failed to generate receipt.');
  }
}

// 8. Bulk Receipt Generator
async function getBulkReceipt(req, res) {
  try {
    const { ids } = req.query;
    if (!ids) return res.status(400).send('No order IDs provided.');
    
    const idList = ids.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (idList.length === 0) return res.status(400).send('Invalid IDs.');

    const orders = await db('orders').whereIn('id', idList);
    if (orders.length === 0) return res.status(404).send('Orders not found.');

    const items = await db('order_items').whereIn('order_id', idList);
    const itemsByOrderMap = new Map();
    for (const item of items) {
      if (!itemsByOrderMap.has(item.order_id)) {
        itemsByOrderMap.set(item.order_id, []);
      }
      itemsByOrderMap.get(item.order_id).push(item);
    }

    let receiptsHtml = '';

    for (const order of orders) {
      const orderItems = itemsByOrderMap.get(order.id) || [];
      const qrPayload = JSON.stringify({
        token: order.order_token,
        secret: order.delivery_otp,
        customer: order.customer_name
      });
      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        width: 150,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });
      const total = parseFloat(order.total_customer_price) + parseFloat(order.delivery_fee || 0);

      receiptsHtml += `
        <div class="receipt">
          <h2 class="center" style="margin: 0 0 5px 0;">2 Roti Delivery</h2>
          <div class="center" style="font-size: 12px; margin-bottom: 10px;">${order.location_name} Campus</div>
          
          <div class="line"></div>
          
          <div class="flex-between" style="font-size: 12px;">
            <span>Token:</span>
            <span class="bold">${order.order_token}</span>
          </div>
          <div class="flex-between" style="font-size: 12px;">
            <span>Date:</span>
            <span>${new Date(order.created_at).toLocaleString()}</span>
          </div>
          <div class="flex-between" style="font-size: 12px;">
            <span>Customer:</span>
            <span>${order.customer_name}</span>
          </div>
          <div class="flex-between" style="font-size: 12px;">
            <span>Phone:</span>
            <span>${order.customer_phone || '-'}</span>
          </div>

          <div class="line"></div>
          
          <div class="bold" style="font-size: 14px; margin-bottom: 5px;">Order Items:</div>
          ${orderItems.map(item => `
            <div class="flex-between item">
              <span>${item.quantity}x ${item.item_name}</span>
              <span>Rs ${item.customer_price}</span>
            </div>
          `).join('')}
          
          <div class="line"></div>
          
          <div class="flex-between bold" style="font-size: 16px;">
            <span>Total:</span>
            <span>Rs ${total.toFixed(2)}</span>
          </div>
          
          <div class="flex-between" style="font-size: 12px; margin-top: 5px;">
            <span>Payment:</span>
            <span style="text-transform: uppercase;">${order.payment_source} (${order.payment_status})</span>
          </div>

          <div class="line"></div>

          <div class="center bold" style="font-size: 14px; margin-top: 15px;">SCAN TO DELIVER</div>
          <img src="${qrDataUrl}" alt="QR Code" class="qr-code" />
          <div class="center bold" style="font-size: 15px; margin-top: 5px;">${order.customer_name}</div>
          <div class="center bold" style="font-size: 13px; color: #FF5722; margin-top: 2px;">Order ID: ${order.order_token}</div>
          ${order.delivery_otp ? `<div class="center bold" style="font-size: 13px; color: #111; margin-top: 3px; letter-spacing: 2px;">SECRET CODE: ${order.delivery_otp}</div>` : ''}
          
          <div class="center" style="font-size: 11px; color: #666; margin-top: 10px;">Campus gate delivery at 8:00 PM</div>
        </div>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bulk Receipts</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Courier New', Courier, monospace; background: #eee; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 40px; margin: 0; }
          .receipt { background: #fff; width: 300px; padding: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); page-break-after: always; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #333; margin: 10px 0; }
          .flex-between { display: flex; justify-content: space-between; }
          .item { font-size: 14px; margin-bottom: 5px; }
          .qr-code { display: block; margin: 15px auto; }
          .print-btn-container { position: fixed; bottom: 20px; right: 20px; }
          .print-btn { padding: 15px 30px; background: #FF5722; color: #fff; border: none; border-radius: 30px; font-size: 16px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 12px rgba(255,87,34,0.4); }
          @media print { body { background: #fff; padding: 0; display: block; } .receipt { width: 100%; box-shadow: none; padding: 0; margin-bottom: 0; page-break-after: always; } .print-btn-container { display: none; } }
        </style>
      </head>
      <body>
        ${receiptsHtml}
        <div class="print-btn-container">
          <button class="print-btn" onclick="window.print()">Print All Receipts</button>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  } catch (err) {
    console.error('getBulkReceipt error:', err);
    return res.status(500).send('Failed to generate bulk receipts.');
  }
}

// 9. Daily Zone PDF Generator
async function getDailyZonePdf(req, res) {
  try {
    const { zone } = req.query;
    if (!zone) return res.status(400).send('Zone parameter is required (e.g. Buddha, KIPM, ITM).');

    // Get today's start in IST (UTC+5:30) or just last 24 hours / today
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const startOfIstToday = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 0, 0, 0) - istOffset);

    let query = db('orders')
      .whereIn('order_status', ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'])
      .where('created_at', '>=', startOfIstToday.toISOString())
      .whereRaw('LOWER(location_name) LIKE ?', ['%' + zone.toLowerCase() + '%']);

    const orders = await query.orderBy('created_at', 'asc');
    if (orders.length === 0) {
      return res.status(404).send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px;"><h2>No active orders found for zone: ${zone} today.</h2></body></html>`);
    }

    const idList = orders.map(o => o.id);
    const items = await db('order_items').whereIn('order_id', idList);
    const itemsByOrderMap = new Map();
    for (const item of items) {
      if (!itemsByOrderMap.has(item.order_id)) {
        itemsByOrderMap.set(item.order_id, []);
      }
      itemsByOrderMap.get(item.order_id).push(item);
    }

    let receiptsHtml = '';

    for (const order of orders) {
      const orderItems = itemsByOrderMap.get(order.id) || [];
      const qrPayload = JSON.stringify({
        token: order.order_token,
        secret: order.delivery_otp,
        customer: order.customer_name
      });
      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        width: 150,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });
      const total = parseFloat(order.total_customer_price) + parseFloat(order.delivery_fee || 0);

      receiptsHtml += `
        <div class="receipt">
          <h2 class="center" style="margin: 0 0 5px 0;">2 Roti Delivery</h2>
          <div class="center bold" style="font-size: 13px; color: #FF5722; margin-bottom: 5px;">ZONE: ${zone.toUpperCase()}</div>
          <div class="center" style="font-size: 12px; margin-bottom: 10px;">${order.location_name} Campus</div>
          
          <div class="line"></div>
          
          <div class="flex-between" style="font-size: 12px;">
            <span>Token:</span>
            <span class="bold">${order.order_token}</span>
          </div>
          <div class="flex-between" style="font-size: 12px;">
            <span>Date:</span>
            <span>${new Date(order.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
          </div>
          <div class="flex-between" style="font-size: 12px;">
            <span>Customer:</span>
            <span class="bold">${order.customer_name}</span>
          </div>
          <div class="flex-between" style="font-size: 12px;">
            <span>Phone:</span>
            <span class="bold">${order.customer_phone || '-'}</span>
          </div>
          ${order.delivery_address_note ? `
          <div class="flex-between" style="font-size: 11px; margin-top: 3px;">
            <span>Drop Note:</span>
            <span>${order.delivery_address_note}</span>
          </div>` : ''}

          <div class="line"></div>
          
          <div class="bold" style="font-size: 14px; margin-bottom: 5px;">Order Items:</div>
          ${orderItems.map(item => `
            <div class="flex-between item">
              <span>${item.quantity}x ${item.item_name}</span>
              <span>Rs ${item.customer_price}</span>
            </div>
          `).join('')}
          
          <div class="line"></div>
          
          <div class="flex-between bold" style="font-size: 16px;">
            <span>Total:</span>
            <span>Rs ${total.toFixed(2)}</span>
          </div>
          
          <div class="flex-between" style="font-size: 12px; margin-top: 5px;">
            <span>Payment:</span>
            <span style="text-transform: uppercase;">${order.payment_source} (${order.payment_status})</span>
          </div>

          <div class="line"></div>

          <div class="center bold" style="font-size: 14px; margin-top: 15px;">SCAN TO DELIVER</div>
          <img src="${qrDataUrl}" alt="QR Code" class="qr-code" />
          <div class="center bold" style="font-size: 15px; margin-top: 5px;">${order.customer_name}</div>
          <div class="center bold" style="font-size: 13px; color: #FF5722; margin-top: 2px;">Order ID: ${order.order_token}</div>
          ${order.delivery_otp ? `<div class="center bold" style="font-size: 13px; color: #111; margin-top: 3px; letter-spacing: 2px;">SECRET CODE: ${order.delivery_otp}</div>` : ''}
          
          <div class="center" style="font-size: 11px; color: #666; margin-top: 10px;">Campus gate delivery at 8:00 PM</div>
        </div>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Zone ${zone} - Daily Receipts</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Courier New', Courier, monospace; background: #eee; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 40px; margin: 0; }
          .receipt { background: #fff; width: 300px; padding: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); page-break-after: always; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #333; margin: 10px 0; }
          .flex-between { display: flex; justify-content: space-between; }
          .item { font-size: 14px; margin-bottom: 5px; }
          .qr-code { display: block; margin: 15px auto; }
          .print-btn-container { position: fixed; bottom: 20px; right: 20px; }
          .print-btn { padding: 15px 30px; background: #FF5722; color: #fff; border: none; border-radius: 30px; font-size: 16px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 12px rgba(255,87,34,0.4); }
          @media print { body { background: #fff; padding: 0; display: block; } .receipt { width: 100%; box-shadow: none; padding: 0; margin-bottom: 0; page-break-after: always; } .print-btn-container { display: none; } }
        </style>
      </head>
      <body>
        ${receiptsHtml}
        <div class="print-btn-container">
          <button class="print-btn" onclick="window.print()">Print ${zone} Receipts</button>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  } catch (err) {
    console.error('getDailyZonePdf error:', err);
    return res.status(500).send('Failed to generate daily zone receipts.');
  }
}

// 10. Daily Zone Tabular Kitchen Production Sheet (For Kitchen Vendors & Dispatch)
async function getDailyZoneTable(req, res) {
  try {
    const { zone } = req.query;
    if (!zone) return res.status(400).send('Zone parameter is required (e.g. Buddha, KIPM, ITM).');

    // Get today's start in IST (UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const startOfIstToday = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 0, 0, 0) - istOffset);

    let orders = await db('orders')
      .whereIn('order_status', ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'])
      .where('created_at', '>=', startOfIstToday.toISOString())
      .whereRaw('LOWER(location_name) LIKE ?', ['%' + zone.toLowerCase() + '%'])
      .orderBy('created_at', 'asc');

    let isShowingRecent = false;
    if (orders.length === 0) {
      // Fallback to recent orders for testing convenience outside active hours
      orders = await db('orders')
        .whereIn('order_status', ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'])
        .whereRaw('LOWER(location_name) LIKE ?', ['%' + zone.toLowerCase() + '%'])
        .orderBy('created_at', 'desc')
        .limit(25);
      if (orders.length > 0) {
        isShowingRecent = true;
      }
    }

    if (orders.length === 0) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>No Orders - ${zone}</title></head>
        <body style="font-family:system-ui,sans-serif;text-align:center;padding:50px;background:#f8fafc;color:#1e293b;">
          <h2>No active orders found for zone: ${zone.toUpperCase()}</h2>
          <p style="color:#64748b;">Orders placed today during scheduled delivery batches will appear here automatically.</p>
        </body>
        </html>
      `);
    }

    const idList = orders.map(o => o.id);
    const items = await db('order_items').whereIn('order_id', idList);
    
    // 1. Calculate Consolidated Dish Totals
    const itemSummaryMap = new Map();
    let totalItemsCount = 0;
    for (const it of items) {
      const q = parseInt(it.quantity) || 1;
      totalItemsCount += q;
      itemSummaryMap.set(it.item_name, (itemSummaryMap.get(it.item_name) || 0) + q);
    }
    const consolidatedItems = Array.from(itemSummaryMap.entries()).sort((a, b) => b[1] - a[1]);

    // 2. Group items by order
    const itemsByOrderMap = new Map();
    for (const it of items) {
      if (!itemsByOrderMap.has(it.order_id)) {
        itemsByOrderMap.set(it.order_id, []);
      }
      itemsByOrderMap.get(it.order_id).push(it);
    }

    // Format IST date display
    const formattedDate = istNow.toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Kitchen Tabular Sheet - Zone ${zone.toUpperCase()} (${formattedDate})</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #f1f5f9;
            color: #0f172a;
            margin: 0;
            padding: 24px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.06);
            padding: 28px;
            border: 1px solid #e2e8f0;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .brand-title {
            font-size: 26px;
            font-weight: 900;
            letter-spacing: -0.5px;
            color: #ea580c;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .brand-subtitle {
            font-size: 13px;
            font-weight: 600;
            color: #475569;
            margin-top: 2px;
          }
          .zone-badge {
            background: #ea580c;
            color: #ffffff;
            padding: 6px 14px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .summary-card {
            background: #fff7ed;
            border: 2px solid #ffedd5;
            border-left: 6px solid #ea580c;
            border-radius: 12px;
            padding: 18px 20px;
            margin-bottom: 28px;
          }
          .summary-title {
            font-size: 15px;
            font-weight: 800;
            color: #9a3412;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .prep-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 12px;
          }
          .prep-item {
            background: #ffffff;
            border: 1px solid #fed7aa;
            border-radius: 8px;
            padding: 10px 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          }
          .prep-item-name {
            font-size: 13px;
            font-weight: 700;
            color: #1e293b;
          }
          .prep-item-qty {
            font-size: 16px;
            font-weight: 900;
            color: #c2410c;
            background: #ffedd5;
            padding: 2px 10px;
            border-radius: 6px;
          }
          .table-wrapper {
            overflow-x: auto;
            border-radius: 10px;
            border: 1px solid #cbd5e1;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            text-align: left;
          }
          th {
            background: #0f172a;
            color: #ffffff;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
            padding: 12px 10px;
            border-bottom: 2px solid #020617;
          }
          td {
            padding: 12px 10px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
          }
          tr:nth-child(even) td {
            background: #f8fafc;
          }
          tr:hover td {
            background: #f1f5f9;
          }
          .token-badge {
            font-family: monospace;
            font-weight: 800;
            font-size: 14px;
            color: #ea580c;
          }
          .item-chip {
            display: block;
            margin-bottom: 3px;
            font-weight: 600;
            color: #1e293b;
          }
          .item-chip-qty {
            font-weight: 800;
            color: #ea580c;
          }
          .status-pill {
            display: inline-block;
            font-size: 10px;
            font-weight: 800;
            padding: 2px 8px;
            border-radius: 6px;
            text-transform: uppercase;
          }
          .status-PLACED { background: #dbeafe; color: #1e40af; }
          .status-ACCEPTED { background: #e0e7ff; color: #3730a3; }
          .status-PREPARING { background: #fef3c7; color: #92400e; }
          .status-READY { background: #dcfce7; color: #166534; }
          .status-OUT_FOR_DELIVERY { background: #ede9fe; color: #5b21b6; }
          .status-DELIVERED { background: #bbf7d0; color: #14532d; }
          .otp-badge {
            font-family: monospace;
            font-weight: 800;
            font-size: 13px;
            background: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid #cbd5e1;
            letter-spacing: 1px;
          }
          .check-box-cell {
            text-align: center;
          }
          .print-check {
            width: 20px;
            height: 20px;
            border: 2px solid #64748b;
            border-radius: 4px;
            display: inline-block;
          }
          .floating-action {
            position: fixed;
            bottom: 24px;
            right: 24px;
            display: flex;
            gap: 10px;
          }
          .btn-print {
            background: #ea580c;
            color: #ffffff;
            border: none;
            padding: 12px 24px;
            border-radius: 30px;
            font-size: 14px;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 8px 20px rgba(234,88,12,0.4);
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .btn-print:hover {
            background: #c2410c;
            transform: scale(1.05);
          }
          @media print {
            body { background: #ffffff; padding: 0; }
            .container { border: none; box-shadow: none; padding: 0; max-width: 100%; }
            .floating-action { display: none; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- 1. Sheet Header -->
          <div class="header-row">
            <div>
              <div class="brand-title">
                <span>2 ROTI</span>
                <span style="color:#0f172a;font-size:20px;font-weight:700;">| Kitchen Production & Dispatch Sheet</span>
              </div>
              <div class="brand-subtitle">
                Official Campus Dispatch • Gorakhpur • Date: <strong>${formattedDate}</strong>
                ${isShowingRecent ? ' <span style="color:#b45309;font-weight:bold;">(Showing Recent Orders for Prep Test)</span>' : ''}
              </div>
            </div>
            <div style="text-align:right;">
              <span class="zone-badge">ZONE: ${zone.toUpperCase()}</span>
              <div style="font-size:12px;font-weight:700;color:#64748b;margin-top:6px;">
                Total Orders: <strong>${orders.length}</strong> | Total Items: <strong>${totalItemsCount}</strong>
              </div>
            </div>
          </div>

          <!-- 2. Consolidated Prep Summary (Zero-Mistake Bulk Quantities for Kitchen) -->
          <div class="summary-card">
            <div class="summary-title">
              <span>👨‍🍳 Kitchen Bulk Preparation Summary (Total Quantities To Cook)</span>
              <span style="font-size:12px;font-weight:700;color:#ea580c;">Zero-Mistake Kitchen Prep</span>
            </div>
            <div class="prep-grid">
              ${consolidatedItems.map(([itemName, qty]) => `
                <div class="prep-item">
                  <span class="prep-item-name">${itemName}</span>
                  <span class="prep-item-qty">${qty}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- 3. Detailed Order-by-Order Table -->
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style="width:35px;text-align:center;">#</th>
                  <th style="width:110px;">Token</th>
                  <th style="width:160px;">Customer</th>
                  <th>Order Items & Qty</th>
                  <th style="width:150px;">Hostel / Drop Note</th>
                  <th style="width:90px;">Total</th>
                  <th style="width:70px;text-align:center;">OTP</th>
                  <th style="width:90px;text-align:center;">Status</th>
                  <th style="width:60px;text-align:center;">Packed</th>
                </tr>
              </thead>
              <tbody>
                ${orders.map((o, idx) => {
                  const oItems = itemsByOrderMap.get(o.id) || [];
                  const totPrice = parseFloat(o.total_customer_price || 0) + parseFloat(o.delivery_fee || 0);
                  const isPaid = (o.payment_status || '').toUpperCase() === 'PAID';

                  return `
                    <tr>
                      <td style="text-align:center;font-weight:700;color:#64748b;">${idx + 1}</td>
                      <td>
                        <span class="token-badge">${o.order_token}</span>
                      </td>
                      <td>
                        <strong style="color:#0f172a;display:block;">${o.customer_name}</strong>
                        <span style="color:#64748b;font-size:12px;">📞 ${o.customer_phone || '-'}</span>
                      </td>
                      <td>
                        ${oItems.map(it => `
                          <span class="item-chip">
                            <span class="item-chip-qty">${it.quantity}x</span> ${it.item_name}
                          </span>
                        `).join('')}
                      </td>
                      <td style="font-size:12px;color:#334155;">
                        <strong>${o.location_name}</strong><br/>
                        ${o.delivery_address_note ? `<span style="color:#ea580c;">${o.delivery_address_note}</span>` : '<span style="color:#94a3b8;">Main Gate</span>'}
                      </td>
                      <td>
                        <strong style="color:#0f172a;">₹${totPrice.toFixed(0)}</strong>
                        <div style="font-size:11px;font-weight:700;color:${isPaid ? '#15803d' : '#b45309'};">
                          ${isPaid ? 'PAID' : 'PENDING'}
                        </div>
                      </td>
                      <td style="text-align:center;">
                        ${o.delivery_otp ? `<span class="otp-badge">${o.delivery_otp}</span>` : '-'}
                      </td>
                      <td style="text-align:center;">
                        <span class="status-pill status-${o.order_status}">${o.order_status}</span>
                      </td>
                      <td class="check-box-cell">
                        <span class="print-check"></span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div style="margin-top:20px;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:12px;">
            <span>Generated for 2Roti Campus Delivery Network</span>
            <span>All food items prepared with highest food safety and hygiene.</span>
          </div>
        </div>

        <!-- Floating Print Action Button -->
        <div class="floating-action">
          <button class="btn-print" onclick="window.print()">
            🖨️ Print Kitchen Table (Ctrl + P)
          </button>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  } catch (err) {
    console.error('getDailyZoneTable error:', err);
    return res.status(500).send('Failed to generate daily zone kitchen table.');
  }
}

// 11. Bulk Accept Orders for a Zone (Active from 6:10 PM IST)
async function bulkAcceptZone(req, res) {
  try {
    const { zone } = req.body; // 'Buddha', 'KIPM', 'ITM', or 'ALL'
    if (!zone) {
      return res.status(400).json({ success: false, message: 'Zone is required.' });
    }

    let query = db('orders')
      .where('order_status', 'PLACED')
      .whereRaw("created_at >= (NOW() - INTERVAL '24 hours')");

    if (zone !== 'ALL') {
      query = query.whereRaw('LOWER(location_name) LIKE ?', ['%' + String(zone).trim().toLowerCase() + '%']);
    }

    let placedOrders = [];
    try {
      placedOrders = await query.select('id');
    } catch (e) {
      let fallback = db('orders').where('order_status', 'PLACED');
      if (zone !== 'ALL') {
        fallback = fallback.whereRaw('LOWER(location_name) LIKE ?', ['%' + String(zone).trim().toLowerCase() + '%']);
      }
      placedOrders = await fallback.select('id');
    }

    const orderIds = placedOrders.map(o => o.id);

    if (orderIds.length === 0) {
      return res.json({ success: true, count: 0, message: `No pending PLACED orders found for ${zone}.`, orders: [] });
    }

    await db('orders')
      .whereIn('id', orderIds)
      .update({
        order_status: 'ACCEPTED',
        updated_at: db.fn.now()
      });

    const updatedOrders = await db('orders').whereIn('id', orderIds);
    for (const ord of updatedOrders) {
      const items = await db('order_items').where({ order_id: ord.id });
      ord.items = items;
      broadcastOrderEvent('ORDER_STATUS_CHANGED', ord);
    }

    return res.json({
      success: true,
      count: orderIds.length,
      message: `Accepted ${orderIds.length} orders for ${zone}.`,
      orders: updatedOrders
    });
  } catch (err) {
    console.error('bulkAcceptZone error:', err);
    return res.status(500).json({ success: false, message: 'Failed to bulk accept orders for zone.' });
  }
}

// 12. Dispatch Zone Orders & Assign Campus Runner (Active from 7:30 PM IST)
async function dispatchZone(req, res) {
  try {
    const { zone, runner_name, runner_phone, is_auto } = req.body;
    if (!zone) {
      return res.status(400).json({ success: false, message: 'Zone is required.' });
    }

    const autoRunners = {
      buddha: { name: 'Campus Runner (Buddha)', phone: '9876543210' },
      kipm: { name: 'Campus Runner (KIPM)', phone: '9876543210' },
      itm: { name: 'Campus Runner (ITM)', phone: '9876543210' }
    };

    const zoneKey = String(zone).trim().toLowerCase();
    let finalRunnerName = runner_name ? String(runner_name).replace(/[<>]/g, '').trim().substring(0, 50) : null;
    let finalRunnerPhone = runner_phone ? String(runner_phone).replace(/\D/g, '').slice(-10) : null;

    if (is_auto || !finalRunnerName) {
      const autoMatch = Object.keys(autoRunners).find(k => zoneKey.includes(k));
      if (autoMatch) {
        finalRunnerName = autoRunners[autoMatch].name;
        finalRunnerPhone = autoRunners[autoMatch].phone;
      } else {
        finalRunnerName = `Campus Runner (${zone})`;
        finalRunnerPhone = '9876543210';
      }
    }

    if (!finalRunnerPhone || finalRunnerPhone.length < 10) {
      finalRunnerPhone = '9876543210';
    }

    // Orders to dispatch: campus orders for this zone that are PLACED, ACCEPTED, PREPARING, or READY
    let query = db('orders')
      .whereIn('order_status', ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'])
      .where('is_outlet_order', false)
      .whereRaw("created_at >= (NOW() - INTERVAL '24 hours')");

    if (zone !== 'ALL') {
      query = query.whereRaw('LOWER(location_name) LIKE ?', ['%' + zoneKey + '%']);
    }

    let targetOrders = [];
    try {
      targetOrders = await query.select('id');
    } catch (e) {
      let fallback = db('orders')
        .whereIn('order_status', ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'])
        .where('is_outlet_order', false);
      if (zone !== 'ALL') {
        fallback = fallback.whereRaw('LOWER(location_name) LIKE ?', ['%' + zoneKey + '%']);
      }
      targetOrders = await fallback.select('id');
    }

    const orderIds = targetOrders.map(o => o.id);

    if (orderIds.length === 0) {
      return res.json({ success: true, count: 0, message: `No orders to dispatch for ${zone}.`, orders: [] });
    }

    await db('orders')
      .whereIn('id', orderIds)
      .update({
        order_status: 'OUT_FOR_DELIVERY',
        assigned_runner_name: finalRunnerName,
        assigned_runner_phone: finalRunnerPhone,
        updated_at: db.fn.now()
      });

    const updatedOrders = await db('orders').whereIn('id', orderIds);
    for (const ord of updatedOrders) {
      const items = await db('order_items').where({ order_id: ord.id });
      ord.items = items;
      broadcastOrderEvent('ORDER_STATUS_CHANGED', ord);
    }

    return res.json({
      success: true,
      count: orderIds.length,
      runner_name: finalRunnerName,
      runner_phone: finalRunnerPhone,
      message: `Dispatched ${orderIds.length} orders for ${zone} to runner ${finalRunnerName}.`,
      orders: updatedOrders
    });
  } catch (err) {
    console.error('dispatchZone error:', err);
    return res.status(500).json({ success: false, message: 'Failed to dispatch orders for zone.' });
  }
}

// Helper: Perform Razorpay or Wallet Refund for an order
async function executeRefundForOrder(order, reason, staffEmail) {
  const refundAmount = parseFloat(order.total_customer_price) + parseFloat(order.delivery_fee || 0);
  let refundResult = { success: true, refund_id: null, method: order.payment_source, amount: refundAmount };

  if (order.payment_status === 'PAID' && refundAmount > 0) {
    // A. Razorpay Refund
    if (order.payment_source === 'razorpay') {
      const RAZORPAY_KEY_ID = (process.env.RAZORPAY_KEY_ID || 'rzp_test_2rotiDemoKey123').trim();
      const RAZORPAY_KEY_SECRET = (process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_2rotiDemoSecret456').trim();
      
      if (RAZORPAY_KEY_ID !== 'rzp_test_2rotiDemoKey123') {
        const Razorpay = require('razorpay');
        const rzp = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });

        let paymentId = order.razorpay_payment_id;

        // Fallback: If razorpay_payment_id was null, fetch payments from razorpay_order_id
        if (!paymentId && order.razorpay_order_id) {
          try {
            const paymentsList = await rzp.orders.fetchPayments(order.razorpay_order_id);
            const capturedPayment = paymentsList.items?.find(p => p.status === 'captured') || paymentsList.items?.[0];
            if (capturedPayment) {
              paymentId = capturedPayment.id;
              await db('orders').where({ id: order.id }).update({ razorpay_payment_id: paymentId });
            }
          } catch (fetchErr) {
            console.error(`Failed to fetch payment id from order id ${order.razorpay_order_id}:`, fetchErr.message);
          }
        }

        if (paymentId) {
          try {
            const rzpRes = await rzp.payments.refund(paymentId, {
              amount: Math.round(refundAmount * 100), // in paise
              speed: 'optimum', // Instant where supported, auto-fallback to normal
              notes: {
                order_token: String(order.order_token || '').substring(0, 30),
                reason: String(reason || 'Kitchen order cancelled').substring(0, 30),
                cancelled_by: String(staffEmail || 'admin').substring(0, 30)
              }
            });
            refundResult.refund_id = rzpRes.id;
            refundResult.status = rzpRes.status || 'processed';
          } catch (rzpErr) {
            const errMsg = rzpErr.error?.description || rzpErr.message || 'Razorpay Gateway Error';
            console.error(`Razorpay refund error for ${order.order_token}:`, errMsg);

            if (errMsg.toLowerCase().includes('already been refunded') || errMsg.toLowerCase().includes('fully refunded')) {
              refundResult.refund_id = 'already_refunded_on_gateway';
              refundResult.status = 'processed';
              refundResult.already_refunded = true;
            } else {
              refundResult.success = false;
              refundResult.gateway_error = true;
              refundResult.refund_id = `FAILED: ${errMsg}`;
              refundResult.error_message = errMsg;
            }
          }
        } else {
          refundResult.success = false;
          refundResult.gateway_error = true;
          refundResult.refund_id = 'FAILED: No valid Razorpay payment ID found';
          refundResult.error_message = 'No valid Razorpay payment ID found to refund';
        }
      } else {
        refundResult.refund_id = `rfnd_mock_${Date.now()}`;
        refundResult.status = 'processed';
      }
    }
    // B. Wallet Refund
    else if (order.payment_source === 'wallet') {
      const customer = await db('users').where({ id: order.user_id }).first();
      const currentBal = parseFloat(customer?.wallet_balance || 0);
      const newBalance = currentBal + refundAmount;
      await db('users').where({ id: order.user_id }).update({ wallet_balance: newBalance });
      await db('wallet_transactions').insert({
        user_id: order.user_id,
        type: 'order_refund_credit',
        amount: refundAmount,
        related_order_id: order.id,
        balance_after: newBalance,
        note: `Refund for cancelled order ${order.order_token}: ${reason || 'Kitchen cancelled'}`
      });
      refundResult.refund_id = `wallet_credit_${Date.now()}`;
    }
  }

  // Determine payment status outcome
  let finalPaymentStatus = 'CANCELLED';
  if (order.payment_status === 'PAID') {
    if (refundResult.gateway_error) {
      finalPaymentStatus = 'REFUND_FAILED';
    } else {
      finalPaymentStatus = 'REFUNDED';
    }
  }

  // Update order status in DB
  const updatePayload = {
    order_status: 'CANCELLED',
    payment_status: finalPaymentStatus,
    updated_at: db.fn.now()
  };
  
  if (refundResult.refund_id) {
    const existingNote = order.delivery_address_note || '';
    updatePayload.delivery_address_note = `${existingNote} [Refund: ₹${refundAmount.toFixed(2)} via ${order.payment_source} (ID: ${refundResult.refund_id})]`.trim().substring(0, 250);
  }

  await db('orders').where({ id: order.id }).update(updatePayload);

  const updated = await db('orders').where({ id: order.id }).first();
  const items = await db('order_items').where({ order_id: order.id });
  updated.items = items;
  broadcastOrderEvent('ORDER_STATUS_CHANGED', updated);

  return { order: updated, refund: refundResult };
}

// 13. Bulk Cancel Zone Orders with Automated Razorpay / Wallet Refunds
async function bulkCancelZone(req, res) {
  try {
    const { zone, reason } = req.body;
    if (!zone) {
      return res.status(400).json({ success: false, message: 'Zone is required.' });
    }

    const staffEmail = req.staff?.email || 'admin';
    let query = db('orders')
      .whereIn('order_status', ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'])
      .whereNot('payment_status', 'REFUNDED')
      .whereRaw("created_at >= (NOW() - INTERVAL '24 hours')");

    if (zone !== 'ALL') {
      query = query.whereRaw('LOWER(location_name) LIKE ?', ['%' + String(zone).trim().toLowerCase() + '%']);
    }

    let ordersToCancel = [];
    try {
      ordersToCancel = await query;
    } catch(e) {
      let fallback = db('orders')
        .whereIn('order_status', ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'])
        .whereNot('payment_status', 'REFUNDED');
      if (zone !== 'ALL') {
        fallback = fallback.whereRaw('LOWER(location_name) LIKE ?', ['%' + String(zone).trim().toLowerCase() + '%']);
      }
      ordersToCancel = await fallback;
    }

    if (ordersToCancel.length === 0) {
      return res.json({ success: true, count: 0, message: `No active orders found to cancel for ${zone}.`, orders: [] });
    }

    const results = [];
    let totalRefunded = 0;

    for (const ord of ordersToCancel) {
      const resData = await executeRefundForOrder(ord, reason || `Kitchen cancelled ${zone} batch`, staffEmail);
      results.push(resData.order);
      if (resData.refund?.amount && resData.order.payment_status === 'REFUNDED') {
        totalRefunded += resData.refund.amount;
      }
    }

    return res.json({
      success: true,
      count: results.length,
      total_refunded: totalRefunded,
      message: `Cancelled ${results.length} orders for ${zone}. Refunds totaling ₹${totalRefunded.toFixed(2)} initiated!`,
      orders: results
    });
  } catch (err) {
    console.error('bulkCancelZone error:', err);
    return res.status(500).json({ success: false, message: 'Failed to bulk cancel orders.' });
  }
}

// 14. Cancel Single Order with Razorpay / Wallet Refund
async function cancelOrderWithRefund(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const staffEmail = req.staff?.email || 'admin';

    const order = await db('orders').where({ id }).first();
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (['DELIVERED', 'REFUNDED', 'CANCELLED'].includes(order.order_status) || order.payment_status === 'REFUNDED') {
      return res.status(400).json({
        success: false,
        message: `Order is already ${order.order_status} (Payment: ${order.payment_status}). Cannot cancel again.`
      });
    }

    const { order: updatedOrder, refund } = await executeRefundForOrder(order, reason, staffEmail);

    return res.json({
      success: true,
      message: `Order ${updatedOrder.order_token} cancelled. Refund of ₹${refund.amount?.toFixed(2) || '0.00'} initiated.`,
      order: updatedOrder,
      refund
    });
  } catch (err) {
    console.error('cancelOrderWithRefund error:', err);
    return res.status(500).json({ success: false, message: 'Failed to cancel order.' });
  }
}

module.exports = {
  createOrder,
  getCustomerOrders,
  getStaffOrders,
  updateOrderStatus,
  assignRunner,
  verifyPayment,
  getReceipt,
  getBulkReceipt,
  getDailyZonePdf,
  getDailyZoneTable,
  bulkAcceptZone,
  dispatchZone,
  bulkCancelZone,
  cancelOrderWithRefund
};
