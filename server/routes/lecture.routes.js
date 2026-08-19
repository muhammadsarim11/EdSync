import express from 'express';
import { getOne, update, remove } from '../controllers/lecture.controller.js';
import { requireAuth, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validators/auth.validators.js';
import {
  lectureIdParamValidator,
  updateLectureValidator
} from '../middlewares/validators/lecture.validators.js';

const router = express.Router();

router.use(requireAuth);

router.get('/:id', lectureIdParamValidator, validate, getOne);
router.patch('/:id', restrictTo('InstituteAdmin', 'Instructor'), updateLectureValidator, validate, update);
router.delete('/:id', restrictTo('InstituteAdmin', 'Instructor'), lectureIdParamValidator, validate, remove);

export default router;
