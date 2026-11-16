import { param, query } from 'express-validator';

export const userIdParamValidator = [param('id').isMongoId().withMessage('A valid user ID is required.')];

export const listUsersValidator = [
  query('role')
    .optional()
    .isIn(['InstituteAdmin', 'Instructor', 'Student'])
    .withMessage('role must be one of InstituteAdmin, Instructor, or Student.'),
  query('status')
    .optional()
    .isIn(['active', 'suspended'])
    .withMessage('status must be either active or suspended.')
];
