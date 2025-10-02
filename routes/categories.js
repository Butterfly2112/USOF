const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const cc = require('../controllers/categoryController');

router.get('/', cc.listCategories);
router.post('/', auth, admin, cc.createCategory);
router.get('/:categoryId', cc.getCategory);
router.patch('/:categoryId', auth, admin, cc.updateCategory);
router.delete('/:categoryId', auth, admin, cc.deleteCategory);
router.get('/:categoryId/posts', cc.getPostsByCategory);

module.exports = router;
