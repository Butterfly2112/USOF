// routes/users.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const userCtrl = require('../controllers/userController');
const multer = require('multer');
const path = require('path');

const upload = multer({ dest: (process.env.UPLOAD_DIR || 'uploads') });

// Получение списка пользователей (ДОЛЖНО БЫТЬ ПУБЛИЧНЫМ)
router.get('/', userCtrl.listUsers); // убрать auth, admin

// Загрузка аватара (ПЕРВЫМ)
router.patch('/avatar', auth, upload.single('profilePicture'), async (req, res, next) => {
  try {
    if (req.file) {
      const relPath = path.join(process.env.UPLOAD_DIR || 'uploads', req.file.filename);
      req.body.profilePicture = '/' + relPath;
    }
    await userCtrl.updateAvatar(req, res, next);
  } catch (err) {
    next(err);
  }
});

// Создание пользователя (только для админов)
router.post('/', auth, admin, userCtrl.createUser);

// Получение профиля пользователя (ПОСЛЕ /avatar)
router.get('/:userId', auth, userCtrl.getProfile);

// Остальные маршруты с :userId
router.patch('/:userId', auth, upload.single('profilePicture'), async (req, res, next) => {
  try {
    if (req.file) {
      const relPath = path.join(process.env.UPLOAD_DIR || 'uploads', req.file.filename);
      req.body.profilePicture = '/' + relPath;
    }
    await userCtrl.updateProfile(req, res, next);
  } catch (err) {
    next(err);
  }
});

router.delete('/:userId', auth, userCtrl.deleteUser);

module.exports = router;
