const express = require('express');
const router = express.Router();
const runnerController = require('../controllers/runnerController');
const { apiLimiter } = require('../middleware/antiBotMiddleware');

// Public endpoints for the Runner App (Security relies on possessing the physical QR token and knowing the OTP)
router.get('/order/:token', apiLimiter, runnerController.getOrderByToken);
router.post('/order/:token/verify-otp', apiLimiter, runnerController.verifyOtpAndDeliver);

module.exports = router;
