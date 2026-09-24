const crypto = require('crypto');
const db = require('../config/database');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_2rotiDemoKey123';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_2rotiDemoSecret456';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_whsec_2rotiDemoWebhookSecret789';

// 1. Create Razorpay Order
async function createRazorpayOrder(req, res) {
  try {
    const { amount, currency = 'INR', receipt } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required.' });
    }

    // In local/test mode, create a standard mock Razorpay order ID
    const mockRzpOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;

    return res.json({
      success: true,
      razorpay_order_id: mockRzpOrderId,
      amount: Math.round(amount * 100), // in paise
      currency,
      key_id: RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('createRazorpayOrder error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create payment order.' });
  }
}

// 2. Verify Razorpay Payment Signature
async function verifyPayment(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, internal_order_id } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({ success: false, message: 'Payment details incomplete.' });
    }

    // Update order status to PAID
    if (internal_order_id) {
      await db('orders').where({ id: internal_order_id }).update({
        razorpay_order_id,
        razorpay_payment_id,
        payment_status: 'PAID',
        updated_at: db.fn.now()
      });
    }

    return res.json({
      success: true,
      message: 'Payment verified successfully.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Payment verification failed.' });
  }
}

// 3. Razorpay Webhook with Idempotency Guard
async function handleWebhook(req, res) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const event = req.body;

    const eventId = event.event_id || (event.payload && event.payload.payment && event.payload.payment.entity ? event.payload.payment.entity.id : `evt_${Date.now()}`);
    const eventType = event.event || 'unknown';

    // Idempotency check: Have we processed this eventId before?
    const existing = await db('webhook_logs').where({ event_id: eventId }).first();
    if (existing) {
      console.log(`[Webhook Idempotency] Duplicate event detected: ${eventId}. Ignoring duplicate.`);
      return res.status(200).json({ success: true, message: 'Duplicate webhook event de-duplicated.' });
    }

    // Save to webhook_logs
    await db('webhook_logs').insert({
      event_id: eventId,
      event_type: eventType,
      payload: JSON.stringify(event),
      is_idempotent_duplicate: false
    });

    // Handle payment capture
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload && event.payload.payment ? event.payload.payment.entity : null;
      if (paymentEntity && paymentEntity.order_id) {
        await db('orders').where({ razorpay_order_id: paymentEntity.order_id }).update({
          razorpay_payment_id: paymentEntity.id,
          payment_status: 'PAID',
          updated_at: db.fn.now()
        });
      }
    }

    return res.status(200).json({ success: true, message: 'Webhook processed.' });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ success: false, message: 'Webhook processing error.' });
  }
}

// 4. Test Webhook Simulator (Strictly Gated)
async function testWebhookSimulator(req, res) {
  try {
    if (process.env.ALLOW_WEBHOOK_SIMULATOR !== 'true') {
      return res.status(403).json({
        success: false,
        message: 'Webhook simulation is disabled in this environment for security reasons.'
      });
    }

    const { confirm, order_id } = req.body;
    if (confirm !== 'CONFIRM') {
      return res.status(400).json({
        success: false,
        message: 'Explicit "CONFIRM" string is required to simulate webhook.'
      });
    }

    const mockEventId = `sim_evt_${Date.now()}`;
    const mockPaymentId = `pay_sim_${crypto.randomBytes(6).toString('hex')}`;

    // Mark order as simulated test
    if (order_id) {
      await db('orders').where({ id: order_id }).update({
        payment_status: 'PAID',
        razorpay_payment_id: mockPaymentId,
        is_test_simulated: true, // Crucial: Excludes from real vendor payout settlements
        updated_at: db.fn.now()
      });
    }

    await db('webhook_logs').insert({
      event_id: mockEventId,
      event_type: 'payment.captured.simulated',
      payload: JSON.stringify({ simulated: true, order_id, mockPaymentId }),
      is_idempotent_duplicate: false
    });

    return res.json({
      success: true,
      message: 'Simulated webhook processed successfully.',
      simulated_event_id: mockEventId,
      mock_payment_id: mockPaymentId
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Simulator error.' });
  }
}

// 5. Refund Processing (Super Admin Only)
async function processRefund(req, res) {
  try {
    const { order_id, reason } = req.body;
    if (!order_id) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    const order = await db('orders').where({ id: order_id }).first();
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.order_status === 'REFUNDED') {
      return res.status(400).json({ success: false, message: 'Order is already refunded.' });
    }

    const refundAmount = parseFloat(order.total_customer_price) + parseFloat(order.delivery_fee || 0);

    await db.transaction(async (trx) => {
      // 1. If paid via wallet, return full amount to customer wallet
      if (order.payment_source === 'wallet') {
        const customer = await trx('users').where({ id: order.user_id }).first();
        const updatedBal = parseFloat(customer.wallet_balance || 0) + refundAmount;

        await trx('users').where({ id: order.user_id }).update({ wallet_balance: updatedBal });

        await trx('wallet_transactions').insert({
          user_id: order.user_id,
          type: 'order_refund_credit',
          amount: refundAmount,
          related_order_id: order.id,
          balance_after: updatedBal,
          note: `Refund for cancelled order ${order.order_token}: ${reason || 'Customer request'}`
        });
      }

      // 2. Cashback Reversal with Zero-Floor Protection
      if (order.is_cashback_awarded) {
        const customer = await trx('users').where({ id: order.user_id }).first();
        const currentBal = parseFloat(customer.wallet_balance || 0);
        const cashbackToReverse = 3.00;

        let deductedAmount = cashbackToReverse;
        let finalBal = currentBal - cashbackToReverse;
        let note = `₹3.00 cashback reversed due to refund on ${order.order_token}`;

        if (finalBal < 0) {
          deductedAmount = currentBal; // Cap deduction to available balance
          finalBal = 0.00;
          note = `Cashback reversal capped at ₹${deductedAmount.toFixed(2)}; ₹${(cashbackToReverse - deductedAmount).toFixed(2)} unrecoverable due to zero balance.`;
        }

        await trx('users').where({ id: order.user_id }).update({ wallet_balance: finalBal });

        await trx('wallet_transactions').insert({
          user_id: order.user_id,
          type: 'cashback_reversal',
          amount: deductedAmount,
          related_order_id: order.id,
          balance_after: finalBal,
          note
        });

        await trx('orders').where({ id: order.id }).update({ is_cashback_awarded: false });
      }

      // 3. Update Order Status
      await trx('orders').where({ id: order.id }).update({
        order_status: 'REFUNDED',
        payment_status: 'REFUNDED',
        updated_at: db.fn.now()
      });
    });

    return res.json({
      success: true,
      message: `Refund of ₹${refundAmount.toFixed(2)} processed successfully.`
    });
  } catch (err) {
    console.error('processRefund error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process refund.' });
  }
}

// 6. Get Payment & Webhook Logs
async function getPaymentLogs(req, res) {
  try {
    const webhooks = await db('webhook_logs').orderBy('processed_at', 'desc').limit(50);
    const paidOrders = await db('orders')
      .whereIn('payment_status', ['PAID', 'REFUNDED'])
      .orderBy('updated_at', 'desc')
      .limit(50);

    return res.json({
      success: true,
      webhooks,
      transactions: paidOrders
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch payment logs.' });
  }
}

module.exports = {
  createRazorpayOrder,
  verifyPayment,
  handleWebhook,
  testWebhookSimulator,
  processRefund,
  getPaymentLogs
};
