// routes/auth.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authCtrl = require('../controllers/authController');

// Регистрация пользователя
router.post('/register', [
  body('login').isLength({ min: 3 }),
  body('password').isLength({ min: 6 }),
  body('email').isEmail()
], authCtrl.register);

// Авторизация пользователя
router.post('/login', authCtrl.login);

// Запрос на сброс пароля
router.post('/request-reset', authCtrl.requestPasswordReset);

// Сброс пароля
router.post('/reset-password', authCtrl.resetPassword);

// Выход из системы
router.post('/logout', authCtrl.logout);

module.exports = router;
