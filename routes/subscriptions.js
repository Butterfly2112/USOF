const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const sc = require('../controllers/subscriptionController');

// Subscribe to post updates
router.get('/', auth, sc.listSubscriptions);
router.post('/:postId', auth, sc.subscribeToPost);

// Unsubscribe from post updates
router.delete('/:postId', auth, sc.unsubscribeFromPost);

// Get user notifications
router.get('/notifications', auth, sc.getNotifications);

// Mark notification as read
router.patch('/notifications/:notificationId', auth, sc.markAsRead);

module.exports = router;