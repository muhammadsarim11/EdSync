import express from 'express';
import { getOne, grade } from '../controllers/submission.controller.js';
import { requireAuth, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validators/auth.validators.js';
import {
  submissionIdParamValidator,
  gradeSubmissionValidator
} from '../middlewares/validators/submission.validators.js';

const router = express.Router();

router.use(requireAuth);

router.get('/:id', submissionIdParamValidator, validate, getOne);
router.patch(
  '/:id/grade',
  restrictTo('InstituteAdmin', 'Instructor'),
  gradeSubmissionValidator,
  validate,
  grade
);

export default router;
