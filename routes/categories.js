// routes/categories.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const cc = require('../controllers/categoryController');

// Список всех категорий
router.get('/', cc.listCategories);

// Создание новой категории (только для админов)
router.post('/', auth, admin, cc.createCategory);

// Получение данных конкретной категории
router.get('/:categoryId', cc.getCategory);

// Обновление категории (только для админов)
router.patch('/:categoryId', auth, admin, cc.updateCategory);

// Удаление категории (только для админов)
router.delete('/:categoryId', auth, admin, cc.deleteCategory);

// Получение всех постов, связанных с категорией
router.get('/:categoryId/posts', cc.getPostsByCategory);

module.exports = router;
