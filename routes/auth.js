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

// Запрос на сброс пароля (ИЗМЕНИТЬ НАЗВАНИЕ)
router.post('/password-reset', authCtrl.requestPasswordReset);

// Сброс пароля
router.post('/reset-password', authCtrl.resetPassword);

// Подтверждение сброса пароля с токеном
router.post('/password-reset/:confirm_token', authCtrl.confirmPasswordReset);

// Выход из системы
router.post('/logout', authCtrl.logout);

module.exports = router;
