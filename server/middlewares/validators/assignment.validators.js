import { body, param } from 'express-validator';

export const lectureIdParamValidator = [
  param('lectureId').isMongoId().withMessage('A valid lectureId is required.')
];

export const assignmentIdParamValidator = [
  param('id').isMongoId().withMessage('A valid assignment id is required.')
];

const optionalUrl = (field) =>
  body(field).optional({ checkFalsy: true }).isURL().withMessage(`${field} must be a valid URL.`);

export const createAssignmentValidator = [
  ...lectureIdParamValidator,
  body('title').trim().notEmpty().withMessage('title is required.'),
  body('description').optional().trim(),
  optionalUrl('attachmentUrl'),
  body('deadline').isISO8601().withMessage('A valid deadline is required.'),
  body('totalMarks').optional().isInt({ min: 1 }).withMessage('totalMarks must be a positive integer.')
];

export const updateAssignmentValidator = [
  ...assignmentIdParamValidator,
  body('title').optional().trim().notEmpty().withMessage('title cannot be empty.'),
  body('description').optional().trim(),
  optionalUrl('attachmentUrl'),
  body('deadline').optional().isISO8601().withMessage('deadline must be a valid date.'),
  body('totalMarks').optional().isInt({ min: 1 }).withMessage('totalMarks must be a positive integer.')
];
