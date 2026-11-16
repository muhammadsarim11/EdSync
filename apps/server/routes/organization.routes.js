import express from 'express';
import {
  createOrganization,
  lookupOrganization,
  getOrganization,
  updateOrganization,
  getOrganizationDashboard
} from '../controllers/organization.controller.js';
import { authLimiter } from '../middlewares/security.middleware.js';
import { validate, createOrganizationValidator } from '../middlewares/validators/auth.validators.js';
import {
  lookupOrganizationValidator,
  updateOrganizationValidator
} from '../middlewares/validators/organization.validators.js';
import { requireAuth, restrictTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/', authLimiter, createOrganizationValidator, validate, createOrganization);
router.get('/lookup', authLimiter, lookupOrganizationValidator, validate, lookupOrganization);

router.get('/me', requireAuth, getOrganization);
router.patch(
  '/me',
  requireAuth,
  restrictTo('InstituteAdmin'),
  updateOrganizationValidator,
  validate,
  updateOrganization
);
router.get('/me/dashboard', requireAuth, restrictTo('InstituteAdmin'), getOrganizationDashboard);

export default router;
