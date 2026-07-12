import User from '../../models/user.model.js';
import AppError from '../../utils/AppError.js';
import { createSendToken } from '../auth.service.js';

export const loginUser = async ({ email, password, organizationId }, res) => {
  if (!email || !password || !organizationId) {
    throw new AppError('Please provide email, password, and organization ID.', 400);
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase(), organizationId }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
      throw new AppError('Incorrect email or password for this institute.', 401);
    }

    if (!user.isEmailVerified) {
      throw new AppError('Please verify your email before logging in.', 403);
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated by the administrator.', 403);
    }

    createSendToken(user, 200, res);
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError('Login failed. Please try again.', 500);
  }
};
