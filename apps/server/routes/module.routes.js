import express from 'express';
import { getOne, update, remove } from '../controllers/module.controller.js';
import * as lectureController from '../controllers/lecture.controller.js';
import { requireAuth, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validators/auth.validators.js';
import {
  moduleIdParamValidator,
  updateModuleValidator
} from '../middlewares/validators/module.validators.js';
import {
  moduleIdParamValidator as lectureModuleIdParamValidator,
  createLectureValidator
} from '../middlewares/validators/lecture.validators.js';

const router = express.Router();

router.use(requireAuth);

router.get('/:id', moduleIdParamValidator, validate, getOne);
router.patch('/:id', restrictTo('InstituteAdmin', 'Instructor'), updateModuleValidator, validate, update);
router.delete('/:id', restrictTo('InstituteAdmin', 'Instructor'), moduleIdParamValidator, validate, remove);

router.get('/:moduleId/lectures', lectureModuleIdParamValidator, validate, lectureController.list);
router.post(
  '/:moduleId/lectures',
  restrictTo('InstituteAdmin', 'Instructor'),
  createLectureValidator,
  validate,
  lectureController.create
);

export default router;
