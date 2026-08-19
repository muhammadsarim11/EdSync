import express from 'express';
import { remove } from '../controllers/enrollment.controller.js';
import { requireAuth, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validators/auth.validators.js';
import { enrollmentIdParamValidator } from '../middlewares/validators/enrollment.validators.js';

const router = express.Router();

router.use(requireAuth);

router.delete(
  '/:id',
  restrictTo('InstituteAdmin', 'Instructor'),
  enrollmentIdParamValidator,
  validate,
  remove
);

export default router;
