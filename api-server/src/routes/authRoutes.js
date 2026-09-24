const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireCustomer, requireStaffRole } = require('../middleware/authMiddleware');
const { antiBotCheck } = require('../middleware/antiBotMiddleware');

// Customer Auth
router.post('/customer', antiBotCheck, authController.customerAuth);
router.post('/customer/firebase', antiBotCheck, authController.firebaseCustomerAuth);
router.post('/complete-profile', requireCustomer, authController.completeProfile);
router.get('/customer/me', requireCustomer, authController.getCustomerMe);

// Staff Auth (Super Admin, Order Manager, Vendor)
router.post('/staff/login', antiBotCheck, authController.staffLogin);
router.get('/staff/me', requireStaffRole(['SUPER_ADMIN', 'ORDER_MANAGER', 'VENDOR']), authController.getStaffMe);

// Logout
router.post('/logout', authController.logout);

module.exports = router;
