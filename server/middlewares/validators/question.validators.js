import { body, param } from 'express-validator';

export const cohortIdParamValidator = [
  param('cohortId').isMongoId().withMessage('A valid cohortId is required.')
];

export const questionIdParamValidator = [
  param('id').isMongoId().withMessage('A valid question id is required.')
];

export const createQuestionValidator = [
  ...cohortIdParamValidator,
  body('title').trim().notEmpty().withMessage('title is required.'),
  body('body').trim().notEmpty().withMessage('body is required.')
];

export const addReplyValidator = [
  ...questionIdParamValidator,
  body('body').trim().notEmpty().withMessage('body is required.')
];
