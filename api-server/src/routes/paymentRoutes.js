const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { requireCustomer, requireStaffRole } = require('../middleware/authMiddleware');

// Customer payment endpoints
router.post('/create-order', requireCustomer, paymentController.createRazorpayOrder);
router.post('/verify', requireCustomer, paymentController.verifyPayment);

// Razorpay Webhook (Public, signature-verified + idempotent)
router.post('/webhook', paymentController.handleWebhook);

// Admin-only payment endpoints
router.post('/webhook-test', requireStaffRole(['SUPER_ADMIN']), paymentController.testWebhookSimulator);
router.post('/refund', requireStaffRole(['SUPER_ADMIN']), paymentController.processRefund);
router.get('/logs', requireStaffRole(['SUPER_ADMIN']), paymentController.getPaymentLogs);

module.exports = router;
