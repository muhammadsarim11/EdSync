import express from 'express';
import { getUsers, suspend, reactivate } from '../controllers/userManagement.controller.js';
import { requireAuth, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validators/auth.validators.js';
import {
  userIdParamValidator,
  listUsersValidator
} from '../middlewares/validators/userManagement.validators.js';

const router = express.Router();

router.use(requireAuth);

// Instructors need this to find students to enroll in their own cohorts;
// suspend/reactivate stay InstituteAdmin-only.
router.get('/', restrictTo('InstituteAdmin', 'Instructor'), listUsersValidator, validate, getUsers);
router.patch('/:id/suspend', restrictTo('InstituteAdmin'), userIdParamValidator, validate, suspend);
router.patch('/:id/reactivate', restrictTo('InstituteAdmin'), userIdParamValidator, validate, reactivate);

export default router;
