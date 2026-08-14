import express from 'express';
import { createOrganization } from '../controllers/organization.controller.js';
import { authLimiter } from '../middlewares/security.middleware.js';
import { validate, createOrganizationValidator } from '../middlewares/validators/auth.validators.js';

const router = express.Router();

router.post('/', authLimiter, createOrganizationValidator, validate, createOrganization);

export default router;
