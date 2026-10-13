const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batchController');

// Public route to fetch active batches and current open status
router.get('/', batchController.getActiveBatches);

module.exports = router;
