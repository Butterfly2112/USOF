const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const fc = require('../controllers/favoriteController');

// Получить избранные посты пользователя
router.get('/', auth, fc.getFavorites);

// Добавить пост в избранное
router.post('/:postId', auth, fc.addToFavorites);

// Удалить пост из избранного
router.delete('/:postId', auth, fc.removeFromFavorites);

module.exports = router;