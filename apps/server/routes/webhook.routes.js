import express from 'express';
import { cloudinaryWebhook } from '../controllers/webhook.controller.js';

const router = express.Router();

router.post('/cloudinary', express.raw({ type: '*/*', limit: '100kb' }), cloudinaryWebhook);

export default router;
