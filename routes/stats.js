const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const statsController = require('../controllers/statsController');
const admin = require('../middleware/adminMiddleware');

// Get user statistics
router.get('/users/:userId', auth, statsController.getUserStats);

// Site-wide stats (public)
router.get('/overview', statsController.getOverview);

module.exports = router;