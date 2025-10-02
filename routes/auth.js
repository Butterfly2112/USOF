const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authCtrl = require('../controllers/authController');

router.post('/register', [
  body('login').isLength({ min: 3 }),
  body('password').isLength({ min: 6 }),
  body('email').isEmail()
], authCtrl.register);

router.post('/login', authCtrl.login);
router.post('/password-reset', authCtrl.requestPasswordReset);
router.post('/reset-password', authCtrl.resetPassword);
router.post('/password-reset/:confirm_token', authCtrl.confirmPasswordReset);
router.post('/logout', authCtrl.logout);

module.exports = router;
