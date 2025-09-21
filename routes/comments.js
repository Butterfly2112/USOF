const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const cc = require('../controllers/commentController');
const pc = require('../controllers/postController');

// Update comment (author only)
router.patch('/:commentId', auth, cc.updateComment);

// Delete comment (author only)
router.delete('/:commentId', auth, cc.deleteComment);

// Like/dislike comment - reuse post like controller
router.post('/:commentId/like', auth, async (req, res, next) => {
  req.params.commentId = req.params.commentId;
  return require('../controllers/postController').like(req, res, next);
});

// Get all likes for a comment
router.get('/:commentId/like', cc.getCommentLikes);

// Get specific comment details
router.get('/:commentId', cc.getComment);

// Lock/unlock comment (admin only)
router.patch('/:commentId/lock', auth, admin, cc.toggleCommentLock);

// Remove like from comment
router.delete('/:commentId/like', auth, cc.deleteCommentLike);

// Change comment status (users - own comments only, admins - any)
router.patch('/:commentId/status', auth, cc.updateCommentStatus);

module.exports = router;
