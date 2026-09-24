const db = require('../config/database');

// 1. Get Vendor Financial Summary
async function getVendorSummary(req, res) {
  try {
    const staff = req.staff;
    const vendorId = staff.role === 'VENDOR' ? staff.id : (req.query.vendor_id || null);

    let ordersQuery = db('orders')
      .where({ order_status: 'DELIVERED', is_test_simulated: false });

    if (staff.role === 'VENDOR' && staff.outlet_location_id) {
      ordersQuery = ordersQuery.andWhere({ location_id: staff.outlet_location_id });
    }

    const allDelivered = await ordersQuery;

    // Algorithm Optimization: Single-Pass Accumulator O(N) replaces 9 separate filter/reduce scans
    let pendingPayable = 0;
    let totalLifetimeEarned = 0;
    let totalSettledPaid = 0;
    let razorpayFunded = 0;
    let walletFunded = 0;
    const unsettled = [];
    let settledCount = 0;

    for (let i = 0; i < allDelivered.length; i++) {
      const o = allDelivered[i];
      const cost = parseFloat(o.total_vendor_cost || 0);
      totalLifetimeEarned += cost;

      if (o.settlement_id) {
        settledCount++;
        totalSettledPaid += cost;
      } else {
        unsettled.push(o);
        pendingPayable += cost;
        if (o.payment_source === 'razorpay') razorpayFunded += cost;
        else if (o.payment_source === 'wallet') walletFunded += cost;
      }
    }

    const sanitizedUnsettled = (staff.role === 'VENDOR'
      ? unsettled.slice(0, 50).map(o => {
          const { total_customer_price, platform_margin, ...rest } = o;
          return rest;
        })
      : unsettled.slice(0, 50));

    return res.json({
      success: true,
      summary: {
        pending_payable: pendingPayable,
        total_lifetime_earned: totalLifetimeEarned,
        total_settled_paid: totalSettledPaid,
        unsettled_orders_count: unsettled.length,
        settled_orders_count: settledCount,
        razorpay_funded_amount: razorpayFunded,
        wallet_funded_amount: walletFunded
      },
      unsettled_orders: sanitizedUnsettled
    });
  } catch (err) {
    console.error('getVendorSummary error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch vendor summary.' });
  }
}

// 2. Create Settlement Batch & Lock Orders (Super Admin Only)
async function createSettlementBatch(req, res) {
  try {
    const { vendor_id, utr_reference, note, adjustments = 0 } = req.body;

    if (!vendor_id || !utr_reference) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID and Bank UTR/Reference number are required to settle.'
      });
    }

    const vendor = await db('staff_users').where({ id: vendor_id, role: 'VENDOR' }).first();
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found.' });
    }

    // Find all unsettled delivered orders for this vendor's outlet
    let ordersQuery = db('orders')
      .where({
        order_status: 'DELIVERED',
        is_test_simulated: false
      })
      .whereNull('settlement_id');

    if (vendor.outlet_location_id) {
      ordersQuery = ordersQuery.andWhere({ location_id: vendor.outlet_location_id });
    }

    const eligibleOrders = await ordersQuery;

    if (eligibleOrders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No unsettled delivered orders found for this vendor to settle.'
      });
    }

    let razorpayFunded = 0;
    let walletFunded = 0;
    let totalVendorCostSum = 0;

    eligibleOrders.forEach((o) => {
      const vCost = parseFloat(o.total_vendor_cost || 0);
      totalVendorCostSum += vCost;
      if (o.payment_source === 'razorpay') {
        razorpayFunded += vCost;
      } else if (o.payment_source === 'wallet') {
        walletFunded += vCost;
      }
    });

    const parsedAdj = parseFloat(adjustments) || 0;
    const finalPayable = totalVendorCostSum + parsedAdj;

    let settlementId = null;

    await db.transaction(async (trx) => {
      // 1. Insert into vendor_settlements
      const [sId] = await trx('vendor_settlements').insert({
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        period_start: eligibleOrders[eligibleOrders.length - 1].created_at,
        period_end: eligibleOrders[0].created_at,
        total_orders: eligibleOrders.length,
        razorpay_funded_amount: razorpayFunded,
        wallet_funded_amount: walletFunded,
        adjustments: parsedAdj,
        final_payable: finalPayable,
        status: 'PAID',
        utr_reference: utr_reference.trim(),
        marked_paid_by: req.staff.name,
        paid_at: db.fn.now(),
        note: note || 'Batch settlement payout completed'
      });

      settlementId = sId;

      // 2. Lock orders permanently with settlement_id
      const orderIds = eligibleOrders.map(o => o.id);
      await trx('orders').whereIn('id', orderIds).update({
        settlement_id: settlementId,
        updated_at: db.fn.now()
      });
    });

    const createdSettlement = await db('vendor_settlements').where({ id: settlementId }).first();

    return res.json({
      success: true,
      message: `Settlement batch #${settlementId} of ₹${finalPayable.toFixed(2)} marked as PAID and ${eligibleOrders.length} orders locked.`,
      settlement: createdSettlement
    });
  } catch (err) {
    console.error('createSettlementBatch error:', err);
    return res.status(500).json({ success: false, message: 'Settlement execution failed.' });
  }
}

// 3. Get All Settlements History
async function getSettlements(req, res) {
  try {
    const staff = req.staff;
    let query = db('vendor_settlements').orderBy('created_at', 'desc');

    if (staff.role === 'VENDOR') {
      query = query.where({ vendor_id: staff.id });
    }

    const settlements = await query.limit(50);
    return res.json({ success: true, settlements });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch settlements.' });
  }
}

// 4. Day-Wise Settlement Reports & Calculation
async function getDailySettlementReports(req, res) {
  try {
    const staff = req.staff;
    const { date_from, date_to, vendor_id, status } = req.query;

    // 1. Fetch all active vendors
    let vendorsQuery = db('staff_users').where({ role: 'VENDOR', is_active: true });
    if (staff.role === 'VENDOR') {
      vendorsQuery = vendorsQuery.where({ id: staff.id });
    } else if (vendor_id && vendor_id !== 'ALL') {
      vendorsQuery = vendorsQuery.where({ id: vendor_id });
    }
    const vendors = await vendorsQuery;
    const defaultVendor = vendors[0] || { id: 3, name: 'Jhungiya Outlet Vendor', outlet_location_id: 1 };

    // 2. Fetch orders
    let ordersQuery = db('orders')
      .where({ is_test_simulated: false })
      .orderBy('created_at', 'desc');

    if (staff.role === 'VENDOR' && staff.outlet_location_id) {
      ordersQuery = ordersQuery.where({ location_id: staff.outlet_location_id });
    }

    if (date_from) {
      ordersQuery = ordersQuery.where('created_at', '>=', `${date_from} 00:00:00`);
    }
    if (date_to) {
      ordersQuery = ordersQuery.where('created_at', '<=', `${date_to} 23:59:59`);
    }

    const allOrders = await ordersQuery;

    // 3. Fetch existing vendor_settlements
    let settlementsQuery = db('vendor_settlements').orderBy('created_at', 'desc');
    if (staff.role === 'VENDOR') {
      settlementsQuery = settlementsQuery.where({ vendor_id: staff.id });
    } else if (vendor_id && vendor_id !== 'ALL') {
      settlementsQuery = settlementsQuery.where({ vendor_id: vendor_id });
    }
    const existingSettlements = await settlementsQuery;

    const settlementKeyMap = new Map();
    existingSettlements.forEach(s => {
      const sDate = (s.period_start || s.created_at || '').substring(0, 10);
      const key = `${s.vendor_id}_${sDate}`;
      if (!settlementKeyMap.has(key)) {
        settlementKeyMap.set(key, s);
      }
    });

    // 4. Group orders by Day (YYYY-MM-DD) and Vendor
    const dailyBuckets = new Map();

    // Data Structure Optimization: Pre-index vendors by outlet_location_id for O(1) lookup
    const vendorByLocationMap = new Map();
    vendors.forEach(v => {
      if (v.outlet_location_id) vendorByLocationMap.set(v.outlet_location_id, v);
    });

    allOrders.forEach(o => {
      const orderDate = (o.created_at || '').substring(0, 10);
      if (!orderDate) return;

      // O(1) Map lookup vs O(V) array scan
      let assignedVendor = vendorByLocationMap.get(o.location_id) || defaultVendor;
      if (staff.role === 'VENDOR' && staff.id !== assignedVendor.id) {
        return;
      }

      const bucketKey = `${orderDate}_${assignedVendor.id}`;
      if (!dailyBuckets.has(bucketKey)) {
        dailyBuckets.set(bucketKey, {
          date: orderDate,
          vendor_id: assignedVendor.id,
          vendor_name: assignedVendor.name,
          location_name: o.location_name || 'Campus Outlet',
          deliveredOrders: [],
          cancelledOrders: []
        });
      }

      const bucket = dailyBuckets.get(bucketKey);

      // Business Rule:
      // Refund & Cancellation strictly isolated! Zero payout add-on!
      const isCancelledOrRefunded = 
        o.order_status === 'CANCELLED' || 
        o.order_status === 'REFUNDED' || 
        o.payment_status === 'REFUNDED';

      if (isCancelledOrRefunded) {
        bucket.cancelledOrders.push(o);
      } else if (o.order_status === 'DELIVERED') {
        bucket.deliveredOrders.push(o);
      }
    });

    const todayStr = new Date().toISOString().substring(0, 10);

    // Format reports list
    const reports = [];
    dailyBuckets.forEach(b => {
      const deliveredCount = b.deliveredOrders.length;
      const cancelledCount = b.cancelledOrders.length;

      let grossCustomerAmount = 0;
      let platformMargin = 0;
      let vendorPayableAmount = 0;
      let razorpayFunded = 0;
      let walletFunded = 0;

      b.deliveredOrders.forEach(o => {
        const custPrice = parseFloat(o.total_customer_price || 0);
        const vendCost = parseFloat(o.total_vendor_cost || 0);
        const margin = parseFloat(o.platform_margin || (custPrice - vendCost));

        grossCustomerAmount += custPrice;
        vendorPayableAmount += vendCost;
        platformMargin += margin;

        if (o.payment_source === 'razorpay') {
          razorpayFunded += vendCost;
        } else if (o.payment_source === 'wallet') {
          walletFunded += vendCost;
        }
      });

      // Check if settled
      const settlementKey = `${b.vendor_id}_${b.date}`;
      const settlement = settlementKeyMap.get(settlementKey) || null;
      const isPaid = settlement && settlement.status === 'PAID';
      const reportStatus = isPaid ? 'PAID' : 'PENDING';

      // Status filter
      if (status && status !== 'ALL' && reportStatus !== status) {
        return;
      }

      reports.push({
        id: `${b.vendor_id}-${b.date}`,
        date: b.date,
        is_today: b.date === todayStr,
        vendor_id: b.vendor_id,
        vendor_name: b.vendor_name,
        location_name: b.location_name,
        delivered_orders_count: deliveredCount,
        cancelled_orders_count: cancelledCount, // 0 cost isolated counter
        gross_customer_amount: staff.role === 'VENDOR' ? undefined : parseFloat(grossCustomerAmount.toFixed(2)),
        platform_margin: staff.role === 'VENDOR' ? undefined : parseFloat(platformMargin.toFixed(2)),
        vendor_payable_amount: parseFloat(vendorPayableAmount.toFixed(2)),
        razorpay_funded_amount: parseFloat(razorpayFunded.toFixed(2)),
        wallet_funded_amount: parseFloat(walletFunded.toFixed(2)),
        status: reportStatus,
        settlement: settlement ? {
          id: settlement.id,
          status: settlement.status,
          utr_reference: settlement.utr_reference,
          payment_mode: settlement.payment_mode || 'BANK_TRANSFER',
          marked_paid_by: settlement.marked_paid_by,
          paid_at: settlement.paid_at,
          adjustments: parseFloat(settlement.adjustments || 0),
          final_payable: parseFloat(settlement.final_payable || vendorPayableAmount),
          note: settlement.note
        } : null,
        eligible_order_ids: b.deliveredOrders.map(o => o.id)
      });
    });

    reports.sort((a, b) => b.date.localeCompare(a.date));

    return res.json({
      success: true,
      vendors: vendors.map(v => ({ id: v.id, name: v.name, outlet_location_id: v.outlet_location_id })),
      reports
    });
  } catch (err) {
    console.error('getDailySettlementReports error:', err);
    return res.status(500).json({ success: false, message: 'Failed to calculate daily settlement reports.' });
  }
}

// 5. Manual Payout: Mark Day's Settlement as PAID (Super Admin Only)
async function markDailySettlementPaid(req, res) {
  try {
    const { vendor_id, date, utr_reference, payment_mode = 'BANK_TRANSFER', adjustments = 0, note } = req.body;

    if (!vendor_id || !date || !utr_reference) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID, Date (YYYY-MM-DD), and Manual Bank UTR / Reference ID are required.'
      });
    }

    const vendor = await db('staff_users').where({ id: vendor_id, role: 'VENDOR' }).first();
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found.' });
    }

    // Find all delivered non-cancelled orders for this vendor on this date
    let ordersQuery = db('orders')
      .where({
        order_status: 'DELIVERED',
        is_test_simulated: false
      })
      .where('payment_status', '!=', 'REFUNDED')
      .whereRaw("DATE(created_at) = ?", [date]);

    if (vendor.outlet_location_id) {
      ordersQuery = ordersQuery.andWhere({ location_id: vendor.outlet_location_id });
    }

    const eligibleOrders = await ordersQuery;

    let totalVendorCostSum = 0;
    let razorpayFunded = 0;
    let walletFunded = 0;

    eligibleOrders.forEach(o => {
      const vCost = parseFloat(o.total_vendor_cost || 0);
      totalVendorCostSum += vCost;
      if (o.payment_source === 'razorpay') razorpayFunded += vCost;
      else if (o.payment_source === 'wallet') walletFunded += vCost;
    });

    const parsedAdj = parseFloat(adjustments) || 0;
    const finalPayable = totalVendorCostSum + parsedAdj;

    let settlementRecord = null;

    await db.transaction(async (trx) => {
      const existing = await trx('vendor_settlements')
        .where({ vendor_id: vendor.id })
        .whereRaw("DATE(period_start) = ?", [date])
        .first();

      if (existing) {
        await trx('vendor_settlements').where({ id: existing.id }).update({
          total_orders: eligibleOrders.length,
          razorpay_funded_amount: razorpayFunded,
          wallet_funded_amount: walletFunded,
          adjustments: parsedAdj,
          final_payable: finalPayable,
          status: 'PAID',
          utr_reference: utr_reference.trim(),
          payment_mode: payment_mode,
          marked_paid_by: req.staff.name || 'Super Admin',
          paid_at: db.fn.now(),
          note: note ? note.trim() : `Manual ${payment_mode} payout confirmed for ${date}`
        });
        settlementRecord = await trx('vendor_settlements').where({ id: existing.id }).first();
      } else {
        const [newId] = await trx('vendor_settlements').insert({
          vendor_id: vendor.id,
          vendor_name: vendor.name,
          period_start: `${date} 00:00:00`,
          period_end: `${date} 23:59:59`,
          total_orders: eligibleOrders.length,
          razorpay_funded_amount: razorpayFunded,
          wallet_funded_amount: walletFunded,
          adjustments: parsedAdj,
          final_payable: finalPayable,
          status: 'PAID',
          utr_reference: utr_reference.trim(),
          payment_mode: payment_mode,
          marked_paid_by: req.staff.name || 'Super Admin',
          paid_at: db.fn.now(),
          note: note ? note.trim() : `Manual ${payment_mode} payout confirmed for ${date}`
        });
        settlementRecord = await trx('vendor_settlements').where({ id: newId }).first();
      }

      // Link orders with settlement_id
      if (eligibleOrders.length > 0) {
        const orderIds = eligibleOrders.map(o => o.id);
        await trx('orders').whereIn('id', orderIds).update({
          settlement_id: settlementRecord.id,
          updated_at: db.fn.now()
        });
      }
    });

    return res.json({
      success: true,
      message: `Manual payout recorded as DONE for ${vendor.name} on ${date}. UTR #${utr_reference.trim()} saved.`,
      settlement: settlementRecord
    });
  } catch (err) {
    console.error('markDailySettlementPaid error:', err);
    return res.status(500).json({ success: false, message: 'Failed to record manual payment.' });
  }
}

// 6. Revert Settlement Back to PENDING (Super Admin Only)
async function revertDailySettlementToPending(req, res) {
  try {
    const { settlement_id, vendor_id, date } = req.body;

    let settlement = null;
    if (settlement_id) {
      settlement = await db('vendor_settlements').where({ id: settlement_id }).first();
    } else if (vendor_id && date) {
      settlement = await db('vendor_settlements')
        .where({ vendor_id: vendor_id })
        .whereRaw("DATE(period_start) = ?", [date])
        .first();
    }

    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Settlement record not found.' });
    }

    await db.transaction(async (trx) => {
      await trx('vendor_settlements').where({ id: settlement.id }).update({
        status: 'PENDING',
        utr_reference: null,
        paid_at: null,
        note: `Reverted to PENDING by ${req.staff.name || 'Admin'} on ${new Date().toISOString()}`
      });

      await trx('orders').where({ settlement_id: settlement.id }).update({
        settlement_id: null,
        updated_at: db.fn.now()
      });
    });

    return res.json({
      success: true,
      message: `Settlement #${settlement.id} successfully reverted to PENDING status.`
    });
  } catch (err) {
    console.error('revertDailySettlementToPending error:', err);
    return res.status(500).json({ success: false, message: 'Failed to revert settlement.' });
  }
}

// 7. Get Deep-Dive Detailed Day Report for a specific date and vendor
async function getDailyReportDetail(req, res) {
  try {
    const staff = req.staff;
    const { date, vendor_id } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date parameter (YYYY-MM-DD) is required.' });
    }

    let targetVendorId = vendor_id;
    if (staff.role === 'VENDOR') {
      targetVendorId = staff.id;
    } else if (!targetVendorId || targetVendorId === 'ALL') {
      const firstVendor = await db('staff_users').where({ role: 'VENDOR', is_active: true }).first();
      targetVendorId = firstVendor ? firstVendor.id : 3;
    }

    const vendor = await db('staff_users').where({ id: targetVendorId }).first();
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found.' });
    }

    // Fetch all orders on this date for this vendor/location
    let ordersQuery = db('orders')
      .where({ is_test_simulated: false })
      .whereRaw("DATE(created_at) = ?", [date])
      .orderBy('created_at', 'asc');

    if (vendor.outlet_location_id) {
      ordersQuery = ordersQuery.where({ location_id: vendor.outlet_location_id });
    }

    const dayOrders = await ordersQuery;
    const orderIds = dayOrders.map(o => o.id);

    // Fetch order items
    let orderItems = [];
    if (orderIds.length > 0) {
      orderItems = await db('order_items').whereIn('order_id', orderIds);
    }

    // Map items to orders
    const itemsByOrderId = new Map();
    const dishTallyMap = new Map();

    // Bug Fix: Build O(1) Map for parentOrder lookup (was O(n²) with .find() inside forEach)
    const dayOrdersMap = new Map(dayOrders.map(o => [o.id, o]));

    orderItems.forEach(item => {
      if (!itemsByOrderId.has(item.order_id)) {
        itemsByOrderId.set(item.order_id, []);
      }
      itemsByOrderId.get(item.order_id).push(item);

      // Check if order was delivered — O(1) lookup
      const parentOrder = dayOrdersMap.get(item.order_id);
      const isDelivered = parentOrder && parentOrder.order_status === 'DELIVERED' && parentOrder.payment_status !== 'REFUNDED';
      
      // Dish tally
      if (!dishTallyMap.has(item.item_name)) {
        dishTallyMap.set(item.item_name, {
          item_name: item.item_name,
          quantity_delivered: 0,
          quantity_cancelled: 0,
          customer_price: staff.role === 'VENDOR' ? undefined : parseFloat(item.customer_price || 0),
          vendor_cost: parseFloat(item.vendor_cost || 0),
          total_vendor_cost: 0
        });
      }
      const dishStat = dishTallyMap.get(item.item_name);
      if (isDelivered) {
        dishStat.quantity_delivered += item.quantity;
        dishStat.total_vendor_cost += (parseFloat(item.vendor_cost || 0) * item.quantity);
      } else {
        dishStat.quantity_cancelled += item.quantity;
      }
    });

    // Check settlement record
    const settlement = await db('vendor_settlements')
      .where({ vendor_id: vendor.id })
      .whereRaw("DATE(period_start) = ?", [date])
      .first();

    let deliveredCount = 0;
    let cancelledCount = 0;
    let grossTotal = 0;
    let platformMargin = 0;
    let totalVendorPayable = 0;
    let razorpayFunded = 0;
    let walletFunded = 0;

    const formattedOrders = dayOrders.map(o => {
      const items = itemsByOrderId.get(o.id) || [];
      const isCancelledOrRefunded = 
        o.order_status === 'CANCELLED' || 
        o.order_status === 'REFUNDED' || 
        o.payment_status === 'REFUNDED';

      const custPrice = parseFloat(o.total_customer_price || 0);
      const vendCost = parseFloat(o.total_vendor_cost || 0);
      const margin = parseFloat(o.platform_margin || (custPrice - vendCost));

      if (isCancelledOrRefunded) {
        cancelledCount++;
      } else if (o.order_status === 'DELIVERED') {
        deliveredCount++;
        grossTotal += custPrice;
        totalVendorPayable += vendCost;
        platformMargin += margin;

        if (o.payment_source === 'razorpay') razorpayFunded += vendCost;
        else if (o.payment_source === 'wallet') walletFunded += vendCost;
      }

      return {
        id: o.id,
        order_token: o.order_token,
        customer_name: o.customer_name,
        customer_phone: o.customer_phone,
        location_name: o.location_name,
        created_at: o.created_at,
        time: o.created_at ? o.created_at.substring(11, 16) : '',
        order_status: o.order_status,
        payment_status: o.payment_status,
        payment_source: o.payment_source,
        total_customer_price: staff.role === 'VENDOR' ? undefined : custPrice,
        total_vendor_cost: vendCost,
        platform_margin: staff.role === 'VENDOR' ? undefined : margin,
        is_payable: !isCancelledOrRefunded && o.order_status === 'DELIVERED',
        payable_added: (!isCancelledOrRefunded && o.order_status === 'DELIVERED') ? vendCost : 0,
        items: items.map(i => ({
          name: i.item_name,
          quantity: i.quantity,
          customer_price: staff.role === 'VENDOR' ? undefined : parseFloat(i.customer_price),
          vendor_cost: parseFloat(i.vendor_cost),
          line_vendor_cost: parseFloat(i.vendor_cost) * i.quantity
        }))
      };
    });

    const isPaid = settlement && settlement.status === 'PAID';

    return res.json({
      success: true,
      report: {
        date,
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        location_name: vendor.outlet_location_id ? (dayOrders[0]?.location_name || 'Campus Outlet') : 'Central Kitchen',
        status: isPaid ? 'PAID' : 'PENDING',
        summary: {
          delivered_orders_count: deliveredCount,
          cancelled_orders_count: cancelledCount,
          gross_customer_amount: staff.role === 'VENDOR' ? undefined : parseFloat(grossTotal.toFixed(2)),
          platform_margin: staff.role === 'VENDOR' ? undefined : parseFloat(platformMargin.toFixed(2)),
          vendor_payable_amount: parseFloat(totalVendorPayable.toFixed(2)),
          razorpay_funded_amount: parseFloat(razorpayFunded.toFixed(2)),
          wallet_funded_amount: parseFloat(walletFunded.toFixed(2)),
          final_payable: settlement ? parseFloat(settlement.final_payable || totalVendorPayable) : parseFloat(totalVendorPayable.toFixed(2))
        },
        settlement: settlement ? {
          id: settlement.id,
          status: settlement.status,
          utr_reference: settlement.utr_reference,
          payment_mode: settlement.payment_mode || 'BANK_TRANSFER',
          marked_paid_by: settlement.marked_paid_by,
          paid_at: settlement.paid_at,
          adjustments: parseFloat(settlement.adjustments || 0),
          note: settlement.note
        } : null,
        dishes_tally: Array.from(dishTallyMap.values()),
        orders: formattedOrders
      }
    });
  } catch (err) {
    console.error('getDailyReportDetail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch detailed day report.' });
  }
}

module.exports = {
  getVendorSummary,
  createSettlementBatch,
  getSettlements,
  getDailySettlementReports,
  getDailyReportDetail,
  markDailySettlementPaid,
  revertDailySettlementToPending
};


