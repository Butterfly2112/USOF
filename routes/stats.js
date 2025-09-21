const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const statsController = require('../controllers/statsController');

// Get user statistics
router.get('/users/:userId', auth, statsController.getUserStats);

module.exports = router;