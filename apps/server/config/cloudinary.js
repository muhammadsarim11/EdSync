import crypto from 'crypto';

// Cloudinary is used purely over its REST/webhook contract (no SDK): the
// browser uploads straight to Cloudinary with a signature minted here, and
// Cloudinary calls our webhook when the asset is ready. The API secret never
// leaves the server, and no video bytes ever pass through Node.

const WEBHOOK_MAX_AGE_SECONDS = 2 * 60 * 60;

const digestHex = (algorithm, value) => crypto.createHash(algorithm).update(value).digest('hex');
const sha1 = (value) => digestHex('sha1', value);

export const getCloudinaryConfig = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
};

// The public_id encodes tenant + lecture, so the webhook can map an asset
// back to exactly one lecture and reject anything that doesn't belong to it.
export const recordingPublicId = (organizationId, lectureId) =>
  `edsync/${organizationId}/lectures/${lectureId}`;

const PUBLIC_ID_PATTERN = /^edsync\/([a-f0-9]{24})\/lectures\/([a-f0-9]{24})$/;

export const parseRecordingPublicId = (publicId) => {
  const match = PUBLIC_ID_PATTERN.exec(String(publicId || ''));
  return match ? { organizationId: match[1], lectureId: match[2] } : null;
};

// Cloudinary signs the alphabetically-sorted `key=value&...` string of the
// signed params, with the API secret appended, using SHA-1.
export const signUploadParams = (params, apiSecret) => {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return sha1(`${toSign}${apiSecret}`);
};

export const buildRecordingUploadParams = ({ organizationId, lectureId, config, now = Date.now() }) => {
  const params = {
    invalidate: 'true',
    overwrite: 'true',
    public_id: recordingPublicId(organizationId, lectureId),
    timestamp: Math.floor(now / 1000)
  };
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/video/upload`,
    apiKey: config.apiKey,
    signature: signUploadParams(params, config.apiSecret),
    ...params
  };
};

// Webhook signature = hash(rawBody + timestamp + apiSecret), sent in the
// X-Cld-Signature / X-Cld-Timestamp headers. Cloudinary signs with SHA-1 by
// default and SHA-256 when an account opts in, so both digests are accepted.
// Compared in constant time and rejected once the timestamp is stale, so a
// captured request can't be replayed indefinitely.
export const verifyWebhookSignature = ({ rawBody, timestamp, signature, apiSecret, now = Date.now() }) => {
  if (!rawBody || !timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > WEBHOOK_MAX_AGE_SECONDS) return false;

  const payload = `${rawBody}${timestamp}${apiSecret}`;
  const received = Buffer.from(String(signature).toLowerCase());
  return ['sha1', 'sha256'].some((algorithm) => {
    const expected = Buffer.from(digestHex(algorithm, payload));
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
  });
};
