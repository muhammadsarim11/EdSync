import { body, param } from 'express-validator';

export const cohortIdParamValidator = [
  param('cohortId').isMongoId().withMessage('A valid cohortId is required.')
];

export const enrollmentIdParamValidator = [
  param('id').isMongoId().withMessage('A valid enrollment id is required.')
];

export const bulkEnrollValidator = [
  ...cohortIdParamValidator,
  body('studentIds').isArray({ min: 1 }).withMessage('studentIds must be a non-empty array.'),
  body('studentIds.*').isMongoId().withMessage('Each studentId must be a valid id.')
];
