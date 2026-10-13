const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const statsController = require('../controllers/statsController');
const activityController = require('../controllers/activityController');
const batchController = require('../controllers/batchController');
const { requireStaffRole } = require('../middleware/authMiddleware');

// Dashboard statistics
router.get('/dashboard-stats', requireStaffRole(['SUPER_ADMIN']), statsController.getDashboardStats);

// Order Batches & Delivery Triggers
router.get('/batches', requireStaffRole(['SUPER_ADMIN', 'ORDER_MANAGER']), batchController.getAllBatches);
router.post('/batches', requireStaffRole(['SUPER_ADMIN']), batchController.createBatch);
router.put('/batches/:id', requireStaffRole(['SUPER_ADMIN']), batchController.updateBatch);
router.patch('/batches/:id/toggle', requireStaffRole(['SUPER_ADMIN', 'ORDER_MANAGER']), batchController.toggleBatch);
router.delete('/batches/:id', requireStaffRole(['SUPER_ADMIN']), batchController.deleteBatch);

// User Activity Monitoring (Daily Live Analytics & Drop-offs)
router.get('/activity/overview', requireStaffRole(['SUPER_ADMIN', 'ORDER_MANAGER']), activityController.getActivityOverview);
router.get('/activity/dropoffs', requireStaffRole(['SUPER_ADMIN', 'ORDER_MANAGER']), activityController.getOnboardingDropoffs);

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
