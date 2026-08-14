import express from 'express';
import { inviteUser, getInvitations, deleteInvitation } from '../controllers/invitation.controller.js';
import { requireAuth, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validators/auth.validators.js';
import { createInvitationValidator, revokeInvitationValidator } from '../middlewares/validators/invitation.validators.js';

const router = express.Router();

router.use(requireAuth, restrictTo('InstituteAdmin'));

router.post('/', createInvitationValidator, validate, inviteUser);
router.get('/', getInvitations);
router.delete('/:id', revokeInvitationValidator, validate, deleteInvitation);

export default router;
