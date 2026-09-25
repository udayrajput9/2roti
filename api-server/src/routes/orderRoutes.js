const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { requireCustomer, requireStaffRole } = require('../middleware/authMiddleware');
const { orderLimiter, antiBotCheck } = require('../middleware/antiBotMiddleware');

// Customer routes
router.post('/create', requireCustomer, orderLimiter, antiBotCheck, orderController.createOrder);
router.get('/my-orders', requireCustomer, orderController.getCustomerOrders);

// Staff routes (Vendor, Order Manager, Super Admin)
router.get('/staff', requireStaffRole(['SUPER_ADMIN', 'ORDER_MANAGER', 'VENDOR']), orderController.getStaffOrders);
router.patch('/:id/status', requireStaffRole(['SUPER_ADMIN', 'ORDER_MANAGER', 'VENDOR']), orderController.updateOrderStatus);
router.patch('/:id/assign-runner', requireStaffRole(['SUPER_ADMIN', 'ORDER_MANAGER']), orderController.assignRunner);
router.patch('/:id/verify-payment', requireStaffRole(['SUPER_ADMIN', 'ORDER_MANAGER']), orderController.verifyPayment);

// Receipt route (Staff can view, or we can make it public for runners to verify, or just Staff)
// Actually we don't need auth here if we just want a simple link, but let's restrict it to staff
router.get('/:id/receipt', requireStaffRole(['SUPER_ADMIN', 'ORDER_MANAGER', 'VENDOR']), orderController.getReceipt);

module.exports = router;
