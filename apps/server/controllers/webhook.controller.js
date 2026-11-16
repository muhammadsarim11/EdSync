import { catchAsync } from '../utils/catchAsync.js';
import { getCloudinaryConfig, verifyWebhookSignature } from '../config/cloudinary.js';
import { completeRecordingUpload } from '../services/lecture.service.js';

export const cloudinaryWebhook = catchAsync(async (req, res) => {
  const config = getCloudinaryConfig();
  if (!config) {
    return res.status(503).json({ status: 'error', message: 'Webhook not configured.' });
  }

  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
  const valid = verifyWebhookSignature({
    rawBody,
    timestamp: req.get('x-cld-timestamp'),
    signature: req.get('x-cld-signature'),
    apiSecret: config.apiSecret
  });
  if (!valid) {
    return res.status(401).json({ status: 'fail', message: 'Invalid webhook signature.' });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ status: 'fail', message: 'Malformed payload.' });
  }

  if (payload.notification_type === 'upload' && payload.resource_type === 'video') {
    await completeRecordingUpload({
      publicId: payload.public_id,
      secureUrl: payload.secure_url,
      durationSeconds: Number(payload.duration) || 0
    });
  }

  // Always 200 for authentic deliveries (even unmatched/duplicate ones) so
  // Cloudinary doesn't retry something we have deliberately ignored.
  res.status(200).json({ status: 'success' });
});
