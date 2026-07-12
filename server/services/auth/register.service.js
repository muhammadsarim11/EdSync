import crypto from 'crypto';
import bcrypt from 'bcrypt';
import User from '../../models/user.model.js';
import AppError from '../../utils/AppError.js';
import { sendVerificationEmail } from '../../utils/email.js';

export const registerUser = async ({ name, email, password, role, organizationId }) => {
  if (!name || !email || !password || !role || !organizationId) {
    throw new AppError('Please provide name, email, password, role, and organization ID.', 400);
  }

  const normalizedEmail = email.toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail, organizationId });

  if (existingUser) {
    throw new AppError('A user with this email already exists for this organization. Please verify or use another email.', 409);
  }

  try {
    const verificationCode = crypto.randomInt(100000, 1000000).toString();
    const hashedCode = await bcrypt.hash(verificationCode, 12);

    const newUser = await User.create({
      name,
      email: normalizedEmail,
      password,
      role,
      organizationId,
      isEmailVerified: false,
      verificationCode: hashedCode,
      verificationCodeExpires: Date.now() + 10 * 60 * 1000
    });

    await sendVerificationEmail(newUser.email, verificationCode);

    return {
      statusCode: 201,
      payload: {
        status: 'success',
        message: 'Verification code sent to your email. Please verify your account before logging in.'
      }
    };
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError('A user with this email already exists for this organization.', 409);
    }

    if (err.name === 'ValidationError') {
      throw new AppError(err.message, 400);
    }

    throw new AppError('Registration failed. Please try again.', 500);
  }
};
