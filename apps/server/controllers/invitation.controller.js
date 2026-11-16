import { catchAsync } from '../utils/catchAsync.js';
import { createInvitation, listInvitations, revokeInvitation } from '../services/invitation.service.js';

export const inviteUser = catchAsync(async (req, res) => {
  const result = await createInvitation({
    organizationId: req.user.organizationId,
    invitedBy: req.user.id,
    email: req.body.email,
    role: req.body.role
  });
  res.status(result.statusCode).json(result.payload);
});

export const getInvitations = catchAsync(async (req, res) => {
  const result = await listInvitations(req.user.organizationId);
  res.status(result.statusCode).json(result.payload);
});

export const deleteInvitation = catchAsync(async (req, res) => {
  const result = await revokeInvitation({
    organizationId: req.user.organizationId,
    invitationId: req.params.id
  });
  res.status(result.statusCode).json(result.payload);
});
