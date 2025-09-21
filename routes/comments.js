// routes/comments.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const cc = require('../controllers/commentController');
const pc = require('../controllers/postController');

// Обновление комментария
router.patch('/:commentId', auth, cc.updateComment);

// Удаление комментария
router.delete('/:commentId', auth, cc.deleteComment);

// Лайки для комментариев
router.post('/:commentId/likes', auth, async (req, res, next) => {
  // delegate to postController.like with commentId
  req.params.commentId = req.params.commentId;
  return require('../controllers/postController').like(req, res, next);
});

// Получение всех лайков под комментарием
router.get('/:commentId/likes', auth, cc.getCommentLikes);

// Получение комментария
router.get('/:commentId', cc.getComment);

// Блокировка комментария
router.patch('/:commentId/lock', auth, admin, cc.toggleCommentLock);

// Удаление лайка с комментария
router.delete('/:commentId/likes', auth, cc.deleteCommentLike);

module.exports = router;
