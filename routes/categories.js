const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const cc = require('../controllers/categoryController');

// Public endpoint - anyone can view categories
router.get('/', cc.listCategories);

// Admin only - create new category
router.post('/', auth, admin, cc.createCategory);

// Public endpoint - get specific category details
router.get('/:categoryId', cc.getCategory);

// Admin only - update category
router.patch('/:categoryId', auth, admin, cc.updateCategory);

// Admin only - delete category
router.delete('/:categoryId', auth, admin, cc.deleteCategory);

// Public endpoint - get posts by category
router.get('/:categoryId/posts', cc.getPostsByCategory);

module.exports = router;
