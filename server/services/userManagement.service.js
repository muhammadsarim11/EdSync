import User from '../models/user.model.js';
import AppError from '../utils/AppError.js';

export const shapeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  isEmailVerified: user.isEmailVerified,
  organizationId: user.organizationId,
  createdAt: user.createdAt
});

export const listUsers = async ({ organizationId, role, status }) => {
  const filter = { organizationId };
  if (role) filter.role = role;
  if (status === 'active') filter.isActive = true;
  if (status === 'suspended') filter.isActive = false;

  const users = await User.find(filter).sort({ createdAt: -1 });

  return {
    statusCode: 200,
    payload: {
      status: 'success',
      results: users.length,
      data: { users: users.map(shapeUser) }
    }
  };
};

const setUserActiveStatus = async ({ organizationId, actingUserId, targetUserId, isActive }) => {
  if (String(targetUserId) === String(actingUserId)) {
    throw new AppError('You cannot change your own account status.', 400);
  }

  const targetUser = await User.findOne({ _id: targetUserId, organizationId });

  if (!targetUser) {
    throw new AppError('User not found.', 404);
  }

  targetUser.isActive = isActive;
  await targetUser.save();

  return {
    statusCode: 200,
    payload: {
      status: 'success',
      message: isActive ? 'User reactivated.' : 'User suspended.',
      data: { user: shapeUser(targetUser) }
    }
  };
};

export const suspendUser = (params) => setUserActiveStatus({ ...params, isActive: false });
export const reactivateUser = (params) => setUserActiveStatus({ ...params, isActive: true });
