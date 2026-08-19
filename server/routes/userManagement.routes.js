import express from 'express';
import { getUsers, suspend, reactivate } from '../controllers/userManagement.controller.js';
import { requireAuth, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validators/auth.validators.js';
import {
  userIdParamValidator,
  listUsersValidator
} from '../middlewares/validators/userManagement.validators.js';

const router = express.Router();

router.use(requireAuth, restrictTo('InstituteAdmin'));

router.get('/', listUsersValidator, validate, getUsers);
router.patch('/:id/suspend', userIdParamValidator, validate, suspend);
router.patch('/:id/reactivate', userIdParamValidator, validate, reactivate);

export default router;
