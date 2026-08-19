import { body, param } from 'express-validator';

const idParam = (name) => param(name).isMongoId().withMessage(`A valid ${name} is required.`);

export const cohortIdParamValidator = [idParam('id')];

export const createCohortValidator = [
  body('title').trim().notEmpty().withMessage('title is required.'),
  body('description').optional().trim(),
  body('instructorId').isMongoId().withMessage('A valid instructorId is required.'),
  body('startDate').isISO8601().withMessage('A valid startDate is required.'),
  body('endDate').optional().isISO8601().withMessage('endDate must be a valid date.')
];

export const updateCohortValidator = [
  idParam('id'),
  body('title').optional().trim().notEmpty().withMessage('title cannot be empty.'),
  body('description').optional().trim(),
  body('status').optional().isIn(['Upcoming', 'Active', 'Completed']).withMessage('Invalid status.'),
  body('startDate').optional().isISO8601().withMessage('startDate must be a valid date.'),
  body('endDate').optional().isISO8601().withMessage('endDate must be a valid date.')
];
