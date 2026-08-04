import { body, validationResult } from 'express-validator';
import AppError from '../../utils/AppError.js';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  const message = errors.array().map((error) => error.msg).join(' ');
  next(new AppError(message, 400));
};

const email = () => body('email').trim().isEmail().withMessage('A valid email is required.');
const organizationId = () => body('organizationId').isMongoId().withMessage('A valid organization ID is required.');
const sixDigitCode = (field) =>
  body(field).trim().isLength({ min: 6, max: 6 }).isNumeric().withMessage(`${field} must be a 6-digit code.`);

export const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  email(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.'),
  body('role')
    .isIn(['InstituteAdmin', 'Instructor', 'Student'])
    .withMessage('Role must be one of InstituteAdmin, Instructor, or Student.'),
  organizationId()
];

export const verifyEmailValidator = [email(), organizationId(), sixDigitCode('code')];

export const resendVerificationValidator = [email(), organizationId()];

export const loginValidator = [
  email(),
  body('password').notEmpty().withMessage('Password is required.'),
  organizationId()
];

export const forgotPasswordValidator = [email(), organizationId()];

export const resetPasswordValidator = [
  email(),
  organizationId(),
  sixDigitCode('code'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long.')
];

export const resendPasswordResetValidator = [email(), organizationId()];

export const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long.')
];
