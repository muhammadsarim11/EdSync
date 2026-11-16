import { shapeUser } from '../userManagement.service.js';

export const getCurrentUser = async ({ user }) => ({
  statusCode: 200,
  payload: { status: 'success', data: { user: shapeUser(user) } }
});
