import { body, param } from 'express-validator';

export const createInvitationValidator = [
  body('email').trim().isEmail().withMessage('A valid email is required.'),
  body('role')
    .isIn(['InstituteAdmin', 'Instructor', 'Student'])
    .withMessage('Role must be one of InstituteAdmin, Instructor, or Student.')
];

export const revokeInvitationValidator = [
  param('id').isMongoId().withMessage('A valid invitation ID is required.')
];
