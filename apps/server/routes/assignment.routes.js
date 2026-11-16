import express from 'express';
import { getOne, update, remove } from '../controllers/assignment.controller.js';
import * as submissionController from '../controllers/submission.controller.js';
import { requireAuth, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validators/auth.validators.js';
import {
  assignmentIdParamValidator,
  updateAssignmentValidator
} from '../middlewares/validators/assignment.validators.js';
import {
  assignmentIdParamValidator as submissionAssignmentIdParamValidator,
  submitAssignmentValidator
} from '../middlewares/validators/submission.validators.js';

const router = express.Router();

router.use(requireAuth);

router.get('/:id', assignmentIdParamValidator, validate, getOne);
router.patch('/:id', restrictTo('InstituteAdmin', 'Instructor'), updateAssignmentValidator, validate, update);
router.delete(
  '/:id',
  restrictTo('InstituteAdmin', 'Instructor'),
  assignmentIdParamValidator,
  validate,
  remove
);

router.get(
  '/:assignmentId/submissions',
  submissionAssignmentIdParamValidator,
  validate,
  submissionController.list
);
router.post(
  '/:assignmentId/submissions',
  restrictTo('Student'),
  submitAssignmentValidator,
  validate,
  submissionController.submit
);

export default router;
