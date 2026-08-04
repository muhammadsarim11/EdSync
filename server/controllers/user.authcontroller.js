import { catchAsync } from '../utils/catchAsync.js';
import {
  registerUser,
  verifyEmailUser,
  loginUser,
  forgotPasswordUser,
  resetPasswordUser,
  resendVerificationCodeUser,
  resendPasswordResetCodeUser,
  changePasswordUser
} from '../services/auth.service.js';

export const register = catchAsync(async (req, res) => {
  const result = await registerUser(req.body);
  res.status(result.statusCode).json(result.payload);
});

export const verifyEmail = catchAsync(async (req, res) => {
  const result = await verifyEmailUser(req.body);
  res.status(result.statusCode).json(result.payload);
});

export const resendVerificationCode = catchAsync(async (req, res) => {
  const result = await resendVerificationCodeUser(req.body);
  res.status(result.statusCode).json(result.payload);
});

export const login = catchAsync(async (req, res) => {
  await loginUser(req.body, res);
});

export const forgotPassword = catchAsync(async (req, res) => {
  const result = await forgotPasswordUser(req.body);
  res.status(result.statusCode).json(result.payload);
});

export const resetPassword = catchAsync(async (req, res) => {
  const result = await resetPasswordUser(req.body);
  res.status(result.statusCode).json(result.payload);
});

export const resendPasswordResetCode = catchAsync(async (req, res) => {
  const result = await resendPasswordResetCodeUser(req.body);
  res.status(result.statusCode).json(result.payload);
});

export const changePassword = catchAsync(async (req, res) => {
  const result = await changePasswordUser({
    userId: req.user.id,
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword
  });
  res.status(result.statusCode).json(result.payload);
});

export const logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({ status: 'success' });
};
