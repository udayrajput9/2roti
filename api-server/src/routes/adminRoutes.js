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
router.post('/customers/:id/wallet', requireStaffRole(['SUPER_ADMIN']), userController.adjustWallet);

// Staff RBAC management
router.get('/staff-users', requireStaffRole(['SUPER_ADMIN']), userController.getStaffList);
router.post('/staff-users', requireStaffRole(['SUPER_ADMIN']), userController.createStaffUser);

// System Settings & Emergency Halt Killswitch
router.get('/settings', requireStaffRole(['SUPER_ADMIN']), statsController.getSystemSettings);
router.post('/settings', requireStaffRole(['SUPER_ADMIN']), statsController.updateSystemSettings);
router.post('/toggle-stop-payments', requireStaffRole(['SUPER_ADMIN', 'ORDER_MANAGER']), statsController.toggleStopPayments);

module.exports = router;
