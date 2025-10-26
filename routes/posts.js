const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const optionalAuth = require('../middleware/optionalAuth');
const admin = require('../middleware/adminMiddleware');
const pc = require('../controllers/postController');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || 'uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    await pc.listPosts(req, res, next);
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, upload.array('images', 6), async (req, res, next) => {
  try {
    if (req.files && req.files.length) {
      const uploadDir = process.env.UPLOAD_DIR || 'uploads';
      // Use posix join so URLs use forward slashes on all platforms
      req.body.images = req.files.map(f => '/' + path.posix.join(uploadDir, f.filename));
    }
    await pc.createPost(req, res, next);
  } catch (err) {
    next(err);
  }
});

// Allow optional auth on post detail so authors (with token) can view their own inactive posts
router.get('/:postId', optionalAuth, pc.getPost);
router.patch('/:postId', auth, upload.array('images', 6), async (req, res, next) => {
    try {
      if (req.files && req.files.length) {
        const uploadDir = process.env.UPLOAD_DIR || 'uploads';
        // Use posix join so URLs use forward slashes on all platforms
        req.body.images = req.files.map(f => '/' + path.posix.join(uploadDir, f.filename));
      }
      await pc.updatePost(req, res, next);
    } catch (err) { next(err); }
});
router.delete('/:postId', auth, pc.deletePost);
router.get('/:postId/comments', optionalAuth, pc.listComments);
router.post('/:postId/comments', auth, pc.addComment);

router.get('/:postId/like', optionalAuth, pc.getPostLikesHandler);

router.post('/:postId/like', auth, pc.like);
router.delete('/:postId/like', auth, pc.deleteLike);
router.get('/:postId/categories', optionalAuth, pc.getPostCategories);
router.patch('/:postId/lock', auth, admin, pc.togglePostLock);

module.exports = router;
