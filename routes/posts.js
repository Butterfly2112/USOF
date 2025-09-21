const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const pc = require('../controllers/postController');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || 'uploads'); // Upload directory
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random number
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname); // Get file extension
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

// List posts with filtering and sorting
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10, sort = 'likes', categories, dateFrom, dateTo, status = 'active' } = req.query;

    const filters = {
      page: Number(page),
      pageSize: Number(pageSize),
      sort,
      categories: categories ? categories.split(',') : [],
      dateFrom,
      dateTo,
      status
    };

    const posts = await pc.listPosts(filters);
    res.json({ success: true, posts });
  } catch (err) {
    next(err);
  }
});

// Create post with image upload support (up to 6 images)
router.post('/', auth, upload.array('images', 6), async (req, res, next) => {
  try {
    // Process uploaded images and add paths to request body
    if (req.files && req.files.length) {
      req.body.images = req.files.map(f => '/' + path.join(process.env.UPLOAD_DIR || 'uploads', f.filename));
    }
    await pc.createPost(req, res, next);
  } catch (err) {
    next(err);
  }
});

// Get post by ID (public endpoint)
router.get('/:postId', pc.getPost);

// Update post (author or admin only)
router.patch('/:postId', auth, pc.updatePost);

// Delete post (author or admin only)
router.delete('/:postId', auth, pc.deletePost);

// Get all comments for a post
router.get('/:postId/comments', pc.listComments);

// Add comment to post
router.post('/:postId/comments', auth, pc.addComment);

// Get all likes for a post
router.get('/:postId/like', async (req, res, next) => {
  try {
    const postId = Number(req.params.postId);
    const likes = await pc.getPostLikes(postId);
    res.json({ success: true, likes });
  } catch (err) {
    next(err);
  }
});

// Like/dislike a post
router.post('/:postId/like', auth, pc.like);

// Remove like from post
router.delete('/:postId/like', auth, pc.deleteLike);

// Get categories associated with a post
router.get('/:postId/categories', pc.getPostCategories);

// Lock/unlock post (admin only)
router.patch('/:postId/lock', auth, admin, pc.togglePostLock);

module.exports = router;
