import Organization from '../models/organization.model.js';
import Invitation from '../models/invitation.model.js';
import AppError from '../utils/AppError.js';
import { generateInviteToken } from '../utils/inviteToken.js';
import { queueInvitationEmail } from '../queues/email.queue.js';

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export const createInvitation = async ({ organizationId, invitedBy, email, role }) => {
  if (!email || !role) {
    throw new AppError('Please provide an email and role to invite.', 400);
  }

  const normalizedEmail = email.toLowerCase();

  const organization = await Organization.findById(organizationId);
  if (!organization) {
    throw new AppError('Organization not found.', 404);
  }

  await Invitation.updateMany(
    { organizationId, email: normalizedEmail, status: 'Pending' },
    { status: 'Revoked' }
  );

  const { token, tokenHash } = generateInviteToken();

  const invitation = await Invitation.create({
    organizationId,
    email: normalizedEmail,
    role,
    tokenHash,
    invitedBy,
    expiresAt: Date.now() + INVITE_EXPIRY_MS
  });

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const inviteLink = `${clientUrl}/accept-invite?token=${token}`;
  await queueInvitationEmail(normalizedEmail, inviteLink, organization.name, role);

  return {
    statusCode: 201,
    payload: {
      status: 'success',
      message: 'Invitation sent.',
      data: {
        invitation: {
          id: invitation._id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt
        }
      }
    }
  };
};

export const listInvitations = async (organizationId) => {
  const invitations = await Invitation.find({ organizationId }).sort({ createdAt: -1 });

  return {
    statusCode: 200,
    payload: {
      status: 'success',
      data: { invitations }
    }
  };
};

export const revokeInvitation = async ({ organizationId, invitationId }) => {
  const invitation = await Invitation.findOne({ _id: invitationId, organizationId });

  if (!invitation) {
    throw new AppError('Invitation not found.', 404);
  }

  if (invitation.status !== 'Pending') {
    throw new AppError('Only a pending invitation can be revoked.', 400);
  }

  invitation.status = 'Revoked';
  await invitation.save();

  return {
    statusCode: 200,
    payload: {
      status: 'success',
      message: 'Invitation revoked.'
    }
  };
};
