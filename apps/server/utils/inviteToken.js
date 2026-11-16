import crypto from 'crypto';

export const generateInviteToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
};

export const hashInviteToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
