import { body, param } from 'express-validator';

export const cohortIdParamValidator = [
  param('cohortId').isMongoId().withMessage('A valid cohortId is required.')
];

export const moduleIdParamValidator = [param('id').isMongoId().withMessage('A valid module id is required.')];

export const createModuleValidator = [
  ...cohortIdParamValidator,
  body('title').trim().notEmpty().withMessage('title is required.'),
  body('orderIndex').isInt({ min: 0 }).withMessage('orderIndex must be a non-negative integer.')
];

export const updateModuleValidator = [
  ...moduleIdParamValidator,
  body('title').optional().trim().notEmpty().withMessage('title cannot be empty.'),
  body('orderIndex').optional().isInt({ min: 0 }).withMessage('orderIndex must be a non-negative integer.')
];
