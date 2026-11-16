import { body, param } from 'express-validator';

export const moduleIdParamValidator = [
  param('moduleId').isMongoId().withMessage('A valid moduleId is required.')
];

export const lectureIdParamValidator = [
  param('id').isMongoId().withMessage('A valid lecture id is required.')
];

const optionalUrl = (field) =>
  body(field).optional({ checkFalsy: true }).isURL().withMessage(`${field} must be a valid URL.`);

export const createLectureValidator = [
  ...moduleIdParamValidator,
  body('title').trim().notEmpty().withMessage('title is required.'),
  body('orderIndex').isInt({ min: 0 }).withMessage('orderIndex must be a non-negative integer.'),
  body('type').isIn(['Live', 'Recorded']).withMessage('type must be Live or Recorded.'),
  optionalUrl('videoUrl'),
  optionalUrl('resourceUrl'),
  body('durationInMinutes')
    .optional()
    .isInt({ min: 0 })
    .withMessage('durationInMinutes must be a non-negative integer.')
];

export const updateLectureValidator = [
  ...lectureIdParamValidator,
  body('title').optional().trim().notEmpty().withMessage('title cannot be empty.'),
  body('orderIndex').optional().isInt({ min: 0 }).withMessage('orderIndex must be a non-negative integer.'),
  body('type').optional().isIn(['Live', 'Recorded']).withMessage('type must be Live or Recorded.'),
  optionalUrl('videoUrl'),
  optionalUrl('resourceUrl'),
  body('durationInMinutes')
    .optional()
    .isInt({ min: 0 })
    .withMessage('durationInMinutes must be a non-negative integer.')
];
