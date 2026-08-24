import express from 'express';
import { param } from 'express-validator';
import { create, list, getOne, update, remove } from '../controllers/cohort.controller.js';
import * as moduleController from '../controllers/module.controller.js';
import * as enrollmentController from '../controllers/enrollment.controller.js';
import * as questionController from '../controllers/question.controller.js';
import { requireAuth, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validators/auth.validators.js';
import {
  cohortIdParamValidator,
  createCohortValidator,
  updateCohortValidator
} from '../middlewares/validators/cohort.validators.js';
import { createModuleValidator } from '../middlewares/validators/module.validators.js';
import { bulkEnrollValidator } from '../middlewares/validators/enrollment.validators.js';
import { createQuestionValidator } from '../middlewares/validators/question.validators.js';

const router = express.Router();

const cohortIdPathValidator = [param('cohortId').isMongoId().withMessage('A valid cohortId is required.')];

router.use(requireAuth);

router.get('/', list);
router.post('/', restrictTo('InstituteAdmin'), createCohortValidator, validate, create);
router.get('/:id', cohortIdParamValidator, validate, getOne);
router.patch('/:id', restrictTo('InstituteAdmin', 'Instructor'), updateCohortValidator, validate, update);
router.delete('/:id', restrictTo('InstituteAdmin', 'Instructor'), cohortIdParamValidator, validate, remove);

router.get('/:cohortId/modules', cohortIdPathValidator, validate, moduleController.list);
router.post(
  '/:cohortId/modules',
  restrictTo('InstituteAdmin', 'Instructor'),
  createModuleValidator,
  validate,
  moduleController.create
);

router.get(
  '/:cohortId/enrollments',
  restrictTo('InstituteAdmin', 'Instructor'),
  cohortIdPathValidator,
  validate,
  enrollmentController.list
);
router.post(
  '/:cohortId/enrollments',
  restrictTo('InstituteAdmin', 'Instructor'),
  bulkEnrollValidator,
  validate,
  enrollmentController.create
);

router.get('/:cohortId/questions', cohortIdPathValidator, validate, questionController.list);
router.post('/:cohortId/questions', createQuestionValidator, validate, questionController.create);

export default router;
