import bcrypt from 'bcrypt';
import User from '../../models/user.model.js';
import AppError from '../../utils/AppError.js';

export const verifyEmailUser = async ({ email, organizationId, code }) => {
  if (!email || !organizationId || !code) {
    throw new AppError('Please provide email, organization ID, and verification code.', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase(), organizationId }).select(
    '+verificationCode +verificationCodeExpires'
  );

  if (!user) {
    throw new AppError('No pending verification was found for this email.', 404);
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

  if (!user.verificationCodeExpires || user.verificationCodeExpires < Date.now()) {
    throw new AppError('Verification code has expired. Please register again to receive a new one.', 400);
  }

  const isCodeValid = await bcrypt.compare(code, user.verificationCode);
  if (!isCodeValid) {
    throw new AppError('Invalid verification code.', 401);
  }

  user.isEmailVerified = true;
  user.verificationCode = undefined;
  user.verificationCodeExpires = undefined;
  await user.save();

  return {
    statusCode: 200,
    payload: {
      status: 'success',
      message: 'Email verified successfully. You can now log in.'
    }
  };
};
