import { body } from 'express-validator';

export const updateOrganizationValidator = [
  body('name').optional().trim().notEmpty().withMessage('Organization name cannot be empty.'),
  body('logoUrl').optional({ checkFalsy: true }).isURL().withMessage('logoUrl must be a valid URL.'),
  body('themeColor')
    .optional()
    .trim()
    .matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
    .withMessage('themeColor must be a valid hex color, e.g. #1A2B3C.')
];
