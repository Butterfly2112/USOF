// routes/users.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const userCtrl = require('../controllers/userController');
const multer = require('multer');
const path = require('path');

const upload = multer({ dest: (process.env.UPLOAD_DIR || 'uploads') });

// Public endpoint - get list of all users
router.get('/', userCtrl.listUsers);

// Update avatar - must be before /:userId routes to avoid conflicts
router.patch('/avatar', auth, upload.single('profilePicture'), async (req, res, next) => {
  try {
    // Process uploaded file and create relative path
    if (req.file) {
      const relPath = path.join(process.env.UPLOAD_DIR || 'uploads', req.file.filename);
      req.body.profilePicture = '/' + relPath;
    }
    await userCtrl.updateAvatar(req, res, next);
  } catch (err) {
    next(err);
  }
});

// Admin only - create new user
router.post('/', auth, admin, userCtrl.createUser);

// Get user profile (must be after /avatar route)
router.get('/:userId', auth, userCtrl.getProfile);

// Update user profile with optional file upload
router.patch('/:userId', auth, upload.single('profilePicture'), async (req, res, next) => {
  try {
    // Handle profile picture upload if provided
    if (req.file) {
      const relPath = path.join(process.env.UPLOAD_DIR || 'uploads', req.file.filename);
      req.body.profilePicture = '/' + relPath;
    }
    await userCtrl.updateProfile(req, res, next);
  } catch (err) {
    next(err);
  }
});

// Delete user (author or admin only)
router.delete('/:userId', auth, userCtrl.deleteUser);

module.exports = router;
