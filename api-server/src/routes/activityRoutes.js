const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');

// Public tracking route for customer website events (pageviews, cart additions, etc.)
router.post('/track', activityController.trackEvent);

module.exports = router;
