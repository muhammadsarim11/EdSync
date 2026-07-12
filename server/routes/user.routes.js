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

const router = express.Router();

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification-code', resendVerificationCode);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/resend-password-reset-code', resendPasswordResetCode);
router.post('/change-password', requireAuth, changePassword);
router.post('/logout', logout);

export default router;