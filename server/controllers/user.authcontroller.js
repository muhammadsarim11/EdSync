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

export const register = catchAsync(async (req, res, next) => {
  try {
    const result = await registerUser(req.body);
    res.status(result.statusCode).json(result.payload);
  } catch (err) {
    next(err);
  }
});

export const verifyEmail = catchAsync(async (req, res, next) => {
  try {
    const result = await verifyEmailUser(req.body);
    res.status(result.statusCode).json(result.payload);
  } catch (err) {
    next(err);
  }
});

export const resendVerificationCode = catchAsync(async (req, res, next) => {
  try {
    const result = await resendVerificationCodeUser(req.body);
    res.status(result.statusCode).json(result.payload);
  } catch (err) {
    next(err);
  }
});

export const login = catchAsync(async (req, res, next) => {
  try {
    await loginUser(req.body, res);
  } catch (err) {
    next(err);
  }
});

export const forgotPassword = catchAsync(async (req, res, next) => {
  try {
    const result = await forgotPasswordUser(req.body);
    res.status(result.statusCode).json(result.payload);
  } catch (err) {
    next(err);
  }
});

export const resetPassword = catchAsync(async (req, res, next) => {
  try {
    const result = await resetPasswordUser(req.body);
    res.status(result.statusCode).json(result.payload);
  } catch (err) {
    next(err);
  }
});

export const resendPasswordResetCode = catchAsync(async (req, res, next) => {
  try {
    const result = await resendPasswordResetCodeUser(req.body);
    res.status(result.statusCode).json(result.payload);
  } catch (err) {
    next(err);
  }
});

export const changePassword = catchAsync(async (req, res, next) => {
  try {
    const result = await changePasswordUser({
      userId: req.user.id,
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword
    });
    res.status(result.statusCode).json(result.payload);
  } catch (err) {
    next(err);
  }
});

export const logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({ status: 'success' });
};