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
      req.body.images = req.files.map(f => '/' + path.join(process.env.UPLOAD_DIR || 'uploads', f.filename));
    }
    await pc.createPost(req, res, next);
  } catch (err) {
    next(err);
  }
});

router.get('/:postId', pc.getPost);
router.patch('/:postId', auth, pc.updatePost);
router.delete('/:postId', auth, pc.deletePost);
router.get('/:postId/comments', pc.listComments);
router.post('/:postId/comments', auth, pc.addComment);

router.get('/:postId/like', async (req, res, next) => {
  try {
    const postId = Number(req.params.postId);
    const likes = await pc.getPostLikes(postId);
    res.json({ success: true, likes });
  } catch (err) {
    next(err);
  }
});

router.post('/:postId/like', auth, pc.like);
router.delete('/:postId/like', auth, pc.deleteLike);
router.get('/:postId/categories', pc.getPostCategories);
router.patch('/:postId/lock', auth, admin, pc.togglePostLock);

module.exports = router;
