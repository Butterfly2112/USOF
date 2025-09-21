const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const fc = require('../controllers/favoriteController');

// Get user's favorite posts
router.get('/', auth, fc.getFavorites);

// Add post to favorites
router.post('/:postId', auth, fc.addToFavorites);

// Remove post from favorites
router.delete('/:postId', auth, fc.removeFromFavorites);

module.exports = router;