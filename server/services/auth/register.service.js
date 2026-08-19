import User from '../../models/user.model.js';
import Invitation from '../../models/invitation.model.js';
import AppError from '../../utils/AppError.js';
import { hashInviteToken } from '../../utils/inviteToken.js';
import { createSendToken } from './token.service.js';

export const registerUser = async ({ name, email, password, inviteToken }, res) => {
  if (!name || !email || !password || !inviteToken) {
    throw new AppError('Please provide name, email, password, and inviteToken.', 400);
  }

  const normalizedEmail = email.toLowerCase();
  const tokenHash = hashInviteToken(inviteToken);

  const invitation = await Invitation.findOne({ tokenHash, status: 'Pending' });

  if (!invitation || invitation.expiresAt < Date.now()) {
    throw new AppError('Invalid or expired invite link.', 400);
  }

  if (invitation.email !== normalizedEmail) {
    throw new AppError('This invite was issued for a different email address.', 400);
  }

  const existingUser = await User.findOne({
    email: normalizedEmail,
    organizationId: invitation.organizationId
  });

  if (existingUser) {
    throw new AppError(
      'A user with this email already exists for this organization. Please log in instead.',
      409
    );
  }

  const newUser = await User.create({
    name,
    email: normalizedEmail,
    password,
    role: invitation.role,
    organizationId: invitation.organizationId,
    isEmailVerified: true
  });

  invitation.status = 'Accepted';
  await invitation.save();

  createSendToken(newUser, 201, res);
};
