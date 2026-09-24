const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityController');
const { requireStaffRole } = require('../middleware/authMiddleware');

router.get('/overview', requireStaffRole(['SUPER_ADMIN']), securityController.getSecurityOverview);
router.post('/block-ip', requireStaffRole(['SUPER_ADMIN']), securityController.blockIp);
router.post('/unblock-ip', requireStaffRole(['SUPER_ADMIN']), securityController.unblockIp);

module.exports = router;
