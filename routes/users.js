// routes/users.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const userCtrl = require('../controllers/userController');
const multer = require('multer');
const path = require('path');

const upload = multer({ dest: (process.env.UPLOAD_DIR || 'uploads') });

// Получение списка пользователей (только для админов)
router.get('/', auth, admin, userCtrl.listUsers);

// Получение профиля пользователя
router.get('/:userId', auth, userCtrl.getProfile);

// Создание пользователя (только для админов)
router.post('/', auth, admin, userCtrl.createUser);

// Обновление профиля пользователя (включая аватар)
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

// Загрузка аватара через отдельный роут
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

// Удаление пользователя
router.delete('/:userId', auth, userCtrl.deleteUser);

module.exports = router;
