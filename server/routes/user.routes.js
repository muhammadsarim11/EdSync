import express from 'express';
import {
  register,
  verifyEmail,
  resendVerificationCode,
  login,
  forgotPassword,
  resetPassword,
  resendPasswordResetCode,
  changePassword,
  logout
} from '../controllers/user.authcontroller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { authLimiter, loginLimiter } from '../middlewares/security.middleware.js';
import {
  validate,
  registerValidator,
  verifyEmailValidator,
  resendVerificationValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  resendPasswordResetValidator,
  changePasswordValidator
} from '../middlewares/validators/auth.validators.js';

const router = express.Router();

router.post('/register', authLimiter, registerValidator, validate, register);
router.post('/verify-email', authLimiter, verifyEmailValidator, validate, verifyEmail);
router.post(
  '/resend-verification-code',
  authLimiter,
  resendVerificationValidator,
  validate,
  resendVerificationCode
);
router.post('/login', loginLimiter, loginValidator, validate, login);
router.post('/forgot-password', authLimiter, forgotPasswordValidator, validate, forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordValidator, validate, resetPassword);
router.post(
  '/resend-password-reset-code',
  authLimiter,
  resendPasswordResetValidator,
  validate,
  resendPasswordResetCode
);
router.post('/change-password', requireAuth, changePasswordValidator, validate, changePassword);
router.post('/logout', logout);

export default router;
