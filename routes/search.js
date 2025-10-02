const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// Main search endpoint that handles type parameter
router.get('/', searchController.search);

// Search posts (legacy endpoint)
router.get('/posts', searchController.searchPosts);

module.exports = router;