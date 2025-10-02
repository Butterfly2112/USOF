const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const userCtrl = require('../controllers/userController');
const multer = require('multer');
const path = require('path');
const { body } = require('express-validator');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || 'uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'avatar-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

router.get('/', userCtrl.listUsers);

router.patch('/avatar', auth, upload.single('profilePicture'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }
    
    const relPath = '/' + path.join(process.env.UPLOAD_DIR || 'uploads', req.file.filename);
    req.body.profilePicture = relPath;
    
    await userCtrl.updateAvatar(req, res, next);
  } catch (err) {
    if (err.message === 'Only image files are allowed!') {
      return res.status(400).json({ success: false, error: 'Only image files are allowed' });
    }
    next(err);
  }
});

router.post('/', auth, admin, [
  body('login').notEmpty().withMessage('Login is required').isLength({ min: 3 }).withMessage('Login must be at least 3 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('passwordConfirmation').notEmpty().withMessage('Password confirmation is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('role').optional().isIn(['user', 'admin']).withMessage('Role must be user or admin')
], userCtrl.createUser);

router.get('/:userId', auth, userCtrl.getProfile);

router.patch('/:userId', auth, upload.single('profilePicture'), async (req, res, next) => {
  try {
    if (req.file) {
      const relPath = '/' + path.join(process.env.UPLOAD_DIR || 'uploads', req.file.filename);
      req.body.profilePicture = relPath;
    }
    await userCtrl.updateProfile(req, res, next);
  } catch (err) {
    if (err.message === 'Only image files are allowed!') {
      return res.status(400).json({ success: false, error: 'Only image files are allowed' });
    }
    next(err);
  }
});

router.delete('/:userId', auth, userCtrl.deleteUser);

module.exports = router;
