const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authCtrl = require('../controllers/authController');

// User registration with validation
router.post('/register', [
  body('login').isLength({ min: 3 }),
  body('password').isLength({ min: 6 }),
  body('email').isEmail()
], authCtrl.register);

// User login
router.post('/login', authCtrl.login);

// Request password reset email
router.post('/password-reset', authCtrl.requestPasswordReset);

// Reset password with token from request body
router.post('/reset-password', authCtrl.resetPassword);

// Confirm password reset with token from URL parameter
router.post('/password-reset/:confirm_token', authCtrl.confirmPasswordReset);

// Logout (client-side token removal for JWT)
router.post('/logout', authCtrl.logout);

module.exports = router;
