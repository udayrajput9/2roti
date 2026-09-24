const express = require('express');
const router = express.Router();
const multer = require('multer');
const menuController = require('../controllers/menuController');
const { requireStaffRole } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Public menu endpoints
router.get('/', menuController.getMenu);
router.get('/outlet', menuController.getOutletMenu);
router.get('/locations', menuController.getLocations);

// Admin-only endpoints
router.post('/upload-csv', requireStaffRole(['SUPER_ADMIN']), upload.single('file'), menuController.uploadMenuCsv);
router.get('/audits', requireStaffRole(['SUPER_ADMIN']), menuController.getMenuAudits);
router.post('/locations', requireStaffRole(['SUPER_ADMIN']), menuController.addLocation);

// Admin Menu Catalog & Live Inventory Controls
router.get('/admin-all', requireStaffRole(['SUPER_ADMIN', 'ORDER_MANAGER', 'VENDOR']), menuController.getAdminMenuItems);
router.post('/item', requireStaffRole(['SUPER_ADMIN']), menuController.createMenuItem);
router.put('/item/:id', requireStaffRole(['SUPER_ADMIN']), menuController.updateMenuItem);
router.patch('/item/:id/toggle-availability', requireStaffRole(['SUPER_ADMIN', 'ORDER_MANAGER']), menuController.toggleItemAvailability);
router.delete('/item/:id', requireStaffRole(['SUPER_ADMIN']), menuController.deleteMenuItem);

// Admin Campus Locations Management
router.get('/admin-locations', requireStaffRole(['SUPER_ADMIN', 'ORDER_MANAGER', 'VENDOR']), menuController.getAllLocationsAdmin);
router.patch('/locations/:id/toggle-status', requireStaffRole(['SUPER_ADMIN']), menuController.toggleLocationStatus);

module.exports = router;
