const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authCtrl = require('../controllers/authController');

router.post('/register', [
  body('login').isLength({ min: 3 }).withMessage('Login must be at least 3 characters'),
  body('fullName').isLength({ min: 1 }).withMessage('Full name is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('passwordConfirmation').custom((val, { req }) => val === req.body.password).withMessage('Password confirmation does not match')
], authCtrl.register);

router.post('/login', authCtrl.login);
router.post('/password-reset', authCtrl.requestPasswordReset);
router.post('/reset-password', authCtrl.resetPassword);
router.get('/reset-password', authCtrl.resetPasswordRedirect);
router.post('/password-reset/:confirm_token', authCtrl.confirmPasswordReset);
router.post('/logout', authCtrl.logout);

module.exports = router;
