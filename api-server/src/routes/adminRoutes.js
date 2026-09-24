const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const statsController = require('../controllers/statsController');
const { requireStaffRole } = require('../middleware/authMiddleware');

// Dashboard statistics
router.get('/dashboard-stats', requireStaffRole(['SUPER_ADMIN']), statsController.getDashboardStats);

// Customer directory
router.get('/customers', requireStaffRole(['SUPER_ADMIN', 'ORDER_MANAGER']), userController.getCustomers);
router.patch('/customers/:id/toggle-status', requireStaffRole(['SUPER_ADMIN']), userController.toggleCustomerStatus);

// Staff RBAC management
router.get('/staff-users', requireStaffRole(['SUPER_ADMIN']), userController.getStaffList);
router.post('/staff-users', requireStaffRole(['SUPER_ADMIN']), userController.createStaffUser);

// System Settings Management
router.get('/settings', requireStaffRole(['SUPER_ADMIN']), statsController.getSystemSettings);
router.post('/settings', requireStaffRole(['SUPER_ADMIN']), statsController.updateSystemSettings);

module.exports = router;
