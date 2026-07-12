import crypto from 'crypto';
import bcrypt from 'bcrypt';
import User from '../../models/user.model.js';
import AppError from '../../utils/AppError.js';
import { sendPasswordResetEmail } from '../../utils/email.js';

export const forgotPasswordUser = async ({ email, organizationId }) => {
  if (!email || !organizationId) {
    throw new AppError('Please provide email and organization ID.', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase(), organizationId });

  if (!user) {
    throw new AppError('No account found with that email for this organization.', 404);
  }

  const resetCode = crypto.randomInt(100000, 1000000).toString();
  const hashedCode = await bcrypt.hash(resetCode, 12);

  user.passwordResetCode = hashedCode;
  user.passwordResetCodeExpires = Date.now() + 10 * 60 * 1000;
  await user.save();

  await sendPasswordResetEmail(user.email, resetCode);

  return {
    statusCode: 200,
    payload: {
      status: 'success',
      message: 'Password reset code sent to your email.'
    }
  };
};

export const resetPasswordUser = async ({ email, organizationId, code, newPassword }) => {
  if (!email || !organizationId || !code || !newPassword) {
    throw new AppError('Please provide email, organization ID, reset code, and new password.', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase(), organizationId })
    .select('+passwordResetCode +passwordResetCodeExpires');

  if (!user) {
    throw new AppError('No account found with that email for this organization.', 404);
  }

  if (!user.passwordResetCodeExpires || user.passwordResetCodeExpires < Date.now()) {
    throw new AppError('Reset code has expired. Please request a new one.', 400);
  }

  const isCodeValid = await bcrypt.compare(code, user.passwordResetCode);
  if (!isCodeValid) {
    throw new AppError('Invalid reset code.', 401);
  }

  user.password = newPassword;
  user.passwordResetCode = undefined;
  user.passwordResetCodeExpires = undefined;
  await user.save();

  return {
    statusCode: 200,
    payload: {
      status: 'success',
      message: 'Password reset successfully. You can now log in.'
    }
  };
};

export const resendPasswordResetCodeUser = async ({ email, organizationId }) => {
  if (!email || !organizationId) {
    throw new AppError('Please provide email and organization ID.', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase(), organizationId });

  if (!user) {
    throw new AppError('No account found with that email for this organization.', 404);
  }

  const resetCode = crypto.randomInt(100000, 1000000).toString();
  const hashedCode = await bcrypt.hash(resetCode, 12);

  user.passwordResetCode = hashedCode;
  user.passwordResetCodeExpires = Date.now() + 10 * 60 * 1000;
  await user.save();

  await sendPasswordResetEmail(user.email, resetCode);

  return {
    statusCode: 200,
    payload: {
      status: 'success',
      message: 'A new password reset code has been sent to your email.'
    }
  };
};

export const changePasswordUser = async ({ userId, currentPassword, newPassword }) => {
  if (!currentPassword || !newPassword) {
    throw new AppError('Please provide your current password and new password.', 400);
  }

  const user = await User.findById(userId).select('+password');

  if (!user || !(await user.correctPassword(currentPassword, user.password))) {
    throw new AppError('Your current password is incorrect.', 401);
  }

  user.password = newPassword;
  await user.save();

  return {
    statusCode: 200,
    payload: {
      status: 'success',
      message: 'Password changed successfully.'
    }
  };
};
