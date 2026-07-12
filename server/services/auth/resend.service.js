import crypto from 'crypto';
import bcrypt from 'bcrypt';
import User from '../../models/user.model.js';
import AppError from '../../utils/AppError.js';
import { sendVerificationEmail } from '../../utils/email.js';

export const resendVerificationCodeUser = async ({ email, organizationId }) => {
  if (!email || !organizationId) {
    throw new AppError('Please provide email and organization ID.', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase(), organizationId });

  if (!user) {
    throw new AppError('No account found with that email for this organization.', 404);
  }

  if (user.isEmailVerified) {
    return {
      statusCode: 200,
      payload: {
        status: 'success',
        message: 'Email is already verified. You can log in now.'
      }
    };
  }

  const verificationCode = crypto.randomInt(100000, 1000000).toString();
  const hashedCode = await bcrypt.hash(verificationCode, 12);

  user.verificationCode = hashedCode;
  user.verificationCodeExpires = Date.now() + 10 * 60 * 1000;
  await user.save();

  await sendVerificationEmail(user.email, verificationCode);

  return {
    statusCode: 200,
    payload: {
      status: 'success',
      message: 'A new verification code has been sent to your email.'
    }
  };
};
