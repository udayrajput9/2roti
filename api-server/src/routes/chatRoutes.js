const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { requireCustomer, requireStaffRole } = require('../middleware/authMiddleware');

// Customer Chat Endpoints (Tied strictly to customer's own orders)
router.get('/customer/orders', requireCustomer, chatController.getCustomerChatOrders);
router.get('/customer/order/:orderId', requireCustomer, chatController.getOrderMessages);
router.post('/customer/order/:orderId/send', requireCustomer, chatController.sendCustomerMessage);

// Admin Support Chat Endpoints
router.get('/admin/threads', requireStaffRole(['SUPER_ADMIN', 'SUPPORT_ADMIN', 'ORDER_MANAGER']), chatController.getAdminChatThreads);
router.get('/admin/order/:orderId', requireStaffRole(['SUPER_ADMIN', 'SUPPORT_ADMIN', 'ORDER_MANAGER']), chatController.getAdminOrderMessages);
router.post('/admin/order/:orderId/send', requireStaffRole(['SUPER_ADMIN', 'SUPPORT_ADMIN', 'ORDER_MANAGER']), chatController.sendAdminMessage);

module.exports = router;
