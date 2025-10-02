const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const cc = require('../controllers/commentController');

router.patch('/:commentId', auth, cc.updateComment);
router.delete('/:commentId', auth, cc.deleteComment);

router.post('/:commentId/like', auth, async (req, res, next) => {
  req.params.commentId = req.params.commentId;
  return require('../controllers/postController').like(req, res, next);
});

router.get('/:commentId/like', cc.getCommentLikes);
router.get('/:commentId', cc.getComment);
router.patch('/:commentId/lock', auth, admin, cc.toggleCommentLock);
router.delete('/:commentId/like', auth, cc.deleteCommentLike);
router.patch('/:commentId/status', auth, cc.updateCommentStatus);

module.exports = router;
