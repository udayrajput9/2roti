const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireCustomer, requireStaffRole } = require('../middleware/authMiddleware');
const { antiBotCheck, authLimiter } = require('../middleware/antiBotMiddleware');

// Customer Auth — authLimiter prevents brute-force at scale
router.post('/customer', authLimiter, antiBotCheck, authController.customerAuth);
router.post('/customer/firebase', authLimiter, antiBotCheck, authController.firebaseCustomerAuth);
router.post('/complete-profile', requireCustomer, authController.completeProfile);
router.get('/customer/me', requireCustomer, authController.getCustomerMe);

// Staff Auth — tighter auth limiter for admin login
router.post('/staff/login', authLimiter, antiBotCheck, authController.staffLogin);
router.get('/staff/me', requireStaffRole(['SUPER_ADMIN', 'ORDER_MANAGER', 'VENDOR']), authController.getStaffMe);

// Logout
router.post('/logout', authController.logout);

module.exports = router;
