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

// Лайки для комментариев (УБРАТЬ 's')
router.post('/:commentId/like', auth, async (req, res, next) => {
  req.params.commentId = req.params.commentId;
  return require('../controllers/postController').like(req, res, next);
});

// Получение всех лайков под комментарием (УБРАТЬ 's')
router.get('/:commentId/like', cc.getCommentLikes);

// Получение комментария
router.get('/:commentId', cc.getComment);

// Блокировка комментария
router.patch('/:commentId/lock', auth, admin, cc.toggleCommentLock);

// Удаление лайка с комментария (УБРАТЬ 's')
router.delete('/:commentId/like', auth, cc.deleteCommentLike);

// Изменение статуса комментария (пользователи - только свои, админы - любые)
router.patch('/:commentId/status', auth, cc.updateCommentStatus);

module.exports = router;
