import { catchAsync } from '../utils/catchAsync.js';
import { listUsers, suspendUser, reactivateUser } from '../services/userManagement.service.js';

export const getUsers = catchAsync(async (req, res) => {
  const result = await listUsers({
    organizationId: req.user.organizationId,
    role: req.query.role,
    status: req.query.status
  });
  res.status(result.statusCode).json(result.payload);
});

export const suspend = catchAsync(async (req, res) => {
  const result = await suspendUser({
    organizationId: req.user.organizationId,
    actingUserId: req.user.id,
    targetUserId: req.params.id
  });
  res.status(result.statusCode).json(result.payload);
});

export const reactivate = catchAsync(async (req, res) => {
  const result = await reactivateUser({
    organizationId: req.user.organizationId,
    actingUserId: req.user.id,
    targetUserId: req.params.id
  });
  res.status(result.statusCode).json(result.payload);
});
