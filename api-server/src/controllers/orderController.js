const db = require('../config/database');
const { broadcastOrderEvent } = require('../services/socketService');

// 1. Create Order
async function createOrder(req, res) {
  try {
    const userId = req.user.id;
    const { items, location_id, delivery_address_note, is_outlet_order, payment_source, razorpay_order_id, razorpay_payment_id, upi_utr } = req.body;
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
    const settingsRows = await db('system_settings').whereIn('key', ['free_delivery_threshold', 'delivery_fee', 'min_wallet_redemption']);
    let freeThreshold = 100;
    let baseDeliveryFee = 15;
    let minWalletRedemption = 50.00;
    settingsRows.forEach(r => {
      if (r.key === 'free_delivery_threshold') freeThreshold = parseFloat(r.value);
      if (r.key === 'delivery_fee') baseDeliveryFee = parseFloat(r.value);
      if (r.key === 'min_wallet_redemption') minWalletRedemption = parseFloat(r.value) || 50.00;
    });

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
      // Campus delivery logic using DB settings
      deliveryFee = totalCustomerPrice >= freeThreshold ? 0 : baseDeliveryFee;
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

    // Generate QR Code containing the order_token
    const qrDataUrl = await QRCode.toDataURL(order.order_token, {
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
          
          <div class="center" style="font-size: 12px;">Thank you for ordering!</div>
          
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
      const qrDataUrl = await QRCode.toDataURL(order.order_token, {
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
          
          <div class="center" style="font-size: 12px;">Thank you for ordering!</div>
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

module.exports = {
  createOrder,
  getCustomerOrders,
  getStaffOrders,
  updateOrderStatus,
  assignRunner,
  verifyPayment,
  getReceipt,
  getBulkReceipt
};
