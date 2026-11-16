import express from 'express';
import {
  getOne,
  update,
  remove,
  recordingSignature,
  liveStart,
  liveJoin,
  liveEnd
} from '../controllers/lecture.controller.js';
import * as assignmentController from '../controllers/assignment.controller.js';
import { requireAuth, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validators/auth.validators.js';
import {
  lectureIdParamValidator,
  updateLectureValidator
} from '../middlewares/validators/lecture.validators.js';
import {
  lectureIdParamValidator as assignmentLectureIdParamValidator,
  createAssignmentValidator
} from '../middlewares/validators/assignment.validators.js';

const router = express.Router();

router.use(requireAuth);

router.get('/:id', lectureIdParamValidator, validate, getOne);
router.patch('/:id', restrictTo('InstituteAdmin', 'Instructor'), updateLectureValidator, validate, update);
router.delete('/:id', restrictTo('InstituteAdmin', 'Instructor'), lectureIdParamValidator, validate, remove);

router.post(
  '/:id/recording/signature',
  restrictTo('InstituteAdmin', 'Instructor'),
  lectureIdParamValidator,
  validate,
  recordingSignature
);

router.post(
  '/:id/live/start',
  restrictTo('InstituteAdmin', 'Instructor'),
  lectureIdParamValidator,
  validate,
  liveStart
);
router.post('/:id/live/join', lectureIdParamValidator, validate, liveJoin);
router.post(
  '/:id/live/end',
  restrictTo('InstituteAdmin', 'Instructor'),
  lectureIdParamValidator,
  validate,
  liveEnd
);

router.get('/:lectureId/assignments', assignmentLectureIdParamValidator, validate, assignmentController.list);
router.post(
  '/:lectureId/assignments',
  restrictTo('InstituteAdmin', 'Instructor'),
  createAssignmentValidator,
  validate,
  assignmentController.create
);

export default router;
