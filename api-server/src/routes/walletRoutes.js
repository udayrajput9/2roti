const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { requireCustomer } = require('../middleware/authMiddleware');

router.get('/my-wallet', requireCustomer, walletController.getWalletDetails);

module.exports = router;
