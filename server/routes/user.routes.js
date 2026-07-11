import express from 'express';
import { register, login, logout } from '../controllers/user.authcontroller.js';
import { requireAuth, restrictTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

export default router;