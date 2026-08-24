import express from 'express';
import { getOne, reply, resolve } from '../controllers/question.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validators/auth.validators.js';
import {
  questionIdParamValidator,
  addReplyValidator
} from '../middlewares/validators/question.validators.js';

const router = express.Router();

router.use(requireAuth);

router.get('/:id', questionIdParamValidator, validate, getOne);
router.post('/:id/replies', addReplyValidator, validate, reply);
router.patch('/:id/resolve', questionIdParamValidator, validate, resolve);

export default router;
