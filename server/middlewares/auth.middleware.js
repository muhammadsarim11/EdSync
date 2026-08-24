import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import User from '../models/user.model.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// Shared by requireAuth (HTTP) and the chat socket's handshake auth
// (sockets/chat.socket.js), so both apply exactly the same checks.
export const resolveUserFromToken = async (token) => {
  if (!token) {
    throw new AppError('You are not logged in. Please log in to get access.', 401);
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const currentUser = await User.findOne({
    _id: decoded.id,
    organizationId: decoded.organizationId
  });

  if (!currentUser) {
    throw new AppError('The user belonging to this token no longer exists in this organization.', 401);
  }

  if (!currentUser.isActive) {
    throw new AppError('Your account has been suspended. Contact your institute admin.', 403);
  }

  return currentUser;
};

export const requireAuth = catchAsync(async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  req.user = await resolveUserFromToken(token);
  next();
});

export const restrictTo = (...roles) => {
  // Returns a middleware function
  return (req, res, next) => {
    // req.user is already set by requireAuth
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    next();
  };
};
