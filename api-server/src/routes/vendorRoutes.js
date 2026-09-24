const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { requireStaffRole } = require('../middleware/authMiddleware');

// Accessible by Super Admin and Vendors (Vendor sees only their own summary)
router.get('/summary', requireStaffRole(['SUPER_ADMIN', 'VENDOR']), vendorController.getVendorSummary);
router.get('/settlements', requireStaffRole(['SUPER_ADMIN', 'VENDOR']), vendorController.getSettlements);

// Day-Wise Settlement Reports & Manual Payment Status Updates
router.get('/daily-reports', requireStaffRole(['SUPER_ADMIN', 'ORDER_MANAGER', 'VENDOR']), vendorController.getDailySettlementReports);
router.get('/daily-reports/detail', requireStaffRole(['SUPER_ADMIN', 'ORDER_MANAGER', 'VENDOR']), vendorController.getDailyReportDetail);
router.post('/daily-reports/mark-paid', requireStaffRole(['SUPER_ADMIN']), vendorController.markDailySettlementPaid);
router.post('/daily-reports/revert-pending', requireStaffRole(['SUPER_ADMIN']), vendorController.revertDailySettlementToPending);

// Legacy Batch Settlement
router.post('/settlements/payout', requireStaffRole(['SUPER_ADMIN']), vendorController.createSettlementBatch);

module.exports = router;
