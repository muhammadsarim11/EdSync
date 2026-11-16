import mongoose from 'mongoose';
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

  const session = await mongoose.startSession();
  let newUser;

  try {
    await session.withTransaction(async () => {
      // Re-check status inside the transaction: two concurrent accepts of the
      // same invite would both pass the pre-checks above, but only one may
      // actually consume it. MongoDB's write-conflict detection on this
      // document forces the loser's transaction to retry withTransaction's
      // callback, where it will see the invite as already Accepted.
      const lockedInvitation = await Invitation.findOne({ _id: invitation._id, status: 'Pending' }).session(
        session
      );

      if (!lockedInvitation) {
        throw new AppError('This invite has already been used.', 409);
      }

      const created = await User.create(
        [
          {
            name,
            email: normalizedEmail,
            password,
            role: lockedInvitation.role,
            organizationId: lockedInvitation.organizationId,
            isEmailVerified: true
          }
        ],
        { session }
      );
      newUser = created[0];

      lockedInvitation.status = 'Accepted';
      await lockedInvitation.save({ session });
    });
  } finally {
    await session.endSession();
  }

  createSendToken(newUser, 201, res);
};
