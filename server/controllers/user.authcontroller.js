import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// --- Helper Functions ---

// 1. Generate JWT Token
const signToken = (id, organizationId, role) => {
  return jwt.sign(
    { id, organizationId, role }, 
    process.env.JWT_SECRET, 
    { expiresIn: '7d' } // e.g., '7d'
  );
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id, user.organizationId, user.role);

  const cookieOptions = {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Important for cross-domain frontend/backend
  };

  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};


export const register = catchAsync(async (req, res, next) => {
  // Normally, a student registers via a specific institute's invite link or subdomain
  const { name, email, password, role, organizationId } = req.body;

  if (!name || !email || !password || !role || !organizationId) {
    return next(new AppError('Please provide name, email, password, role, and organization ID.', 400));
  }

  try {
    const newUser = await User.create({
      name,
      email,
      password,
      role,
      organizationId
    });

    createSendToken(newUser, 201, res);
  } catch (err) {
    if (err.code === 11000) {
      return next(new AppError('A user with this email already exists for this organization.', 409));
    }

    if (err.name === 'ValidationError') {
      return next(new AppError(err.message, 400));
    }

    return next(new AppError('Registration failed. Please try again.', 500));
  }
});

export const login = catchAsync(async (req, res, next) => {
  const { email, password, organizationId } = req.body;

  if (!email || !password || !organizationId) {
    return next(new AppError('Please provide email, password, and organization ID.', 400));
  }

  try {
    const user = await User.findOne({ email, organizationId }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
      return next(new AppError('Incorrect email or password for this institute.', 401));
    }

    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated by the administrator.', 403));
    }

    createSendToken(user, 200, res);
  } catch (err) {
    return next(new AppError('Login failed. Please try again.', 500));
  }
});


export const logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000), 
    httpOnly: true
  });
  
  res.status(200).json({ status: 'success' });
};