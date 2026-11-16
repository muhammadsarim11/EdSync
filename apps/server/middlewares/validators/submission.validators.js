import { body, param } from 'express-validator';

export const assignmentIdParamValidator = [
  param('assignmentId').isMongoId().withMessage('A valid assignmentId is required.')
];

export const submissionIdParamValidator = [
  param('id').isMongoId().withMessage('A valid submission id is required.')
];

export const submitAssignmentValidator = [
  ...assignmentIdParamValidator,
  body('fileUrl').isURL().withMessage('A valid fileUrl is required.')
];

export const gradeSubmissionValidator = [
  ...submissionIdParamValidator,
  body('obtainedMarks').isInt({ min: 0 }).withMessage('obtainedMarks must be a non-negative integer.'),
  body('feedback').optional().trim()
];
