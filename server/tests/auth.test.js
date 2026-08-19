import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { sendPasswordResetEmail } from '../utils/email.js';
import { createVerifiedOrgAdmin, lastCodeSentTo, lastInviteTokenSent } from './helpers.js';

const inviteAndRegister = async (admin, { email = 'ada@example.com', role = 'Student' } = {}) => {
  await request(app).post('/api/v1/invitations').set('Cookie', admin.cookie).send({ email, role });
  const inviteToken = lastInviteTokenSent();

  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Ada Lovelace', email, password: 'password123', inviteToken });

  return { res, inviteToken };
};

describe('POST /api/v1/auth/register', () => {
  it('rejects an invalid payload with 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'A', email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('fail');
  });

  it('rejects registration without a valid invite token', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'password123',
      inviteToken: 'bogus'
    });

    expect(res.status).toBe(400);
  });

  it('registers a user from a valid invite and logs them in immediately', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { res } = await inviteAndRegister(admin);

    expect(res.status).toBe(201);
    expect(res.body.data.user.isEmailVerified).toBe(true);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects reusing an already-accepted invite token', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { inviteToken } = await inviteAndRegister(admin);

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Someone Else', email: 'ada@example.com', password: 'password456', inviteToken });

    expect(res.status).toBe(400);
  });
});

describe('full auth lifecycle', () => {
  it('registers via invite, changes password, and logs in with the new password', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { res: registerRes } = await inviteAndRegister(admin, { email: 'lifecycle@example.com' });
    const org = admin.organizationId;

    const noTokenRes = await request(app).post('/api/v1/auth/change-password').send({});
    expect(noTokenRes.status).toBe(401);

    const changeRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Cookie', registerRes.headers['set-cookie'])
      .send({ currentPassword: 'password123', newPassword: 'newPassword456' });
    expect(changeRes.status).toBe(200);

    const oldPasswordLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'lifecycle@example.com', password: 'password123', organizationId: org });
    expect(oldPasswordLogin.status).toBe(401);

    const newPasswordLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'lifecycle@example.com', password: 'newPassword456', organizationId: org });
    expect(newPasswordLogin.status).toBe(200);
  });

  it('resets a forgotten password end to end', async () => {
    const admin = await createVerifiedOrgAdmin();
    await inviteAndRegister(admin, { email: 'forgot@example.com' });
    const org = admin.organizationId;

    const forgotRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'forgot@example.com', organizationId: org });
    expect(forgotRes.status).toBe(200);
    const resetCode = lastCodeSentTo(sendPasswordResetEmail);

    const resetRes = await request(app).post('/api/v1/auth/reset-password').send({
      email: 'forgot@example.com',
      organizationId: org,
      code: resetCode,
      newPassword: 'resetPassword789'
    });
    expect(resetRes.status).toBe(200);

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'forgot@example.com', password: 'resetPassword789', organizationId: org });
    expect(loginRes.status).toBe(200);
  });
});

describe('account enumeration protection', () => {
  it('returns an identical generic response for forgot-password whether or not the account exists', async () => {
    const admin = await createVerifiedOrgAdmin();
    await inviteAndRegister(admin, { email: 'exists@example.com' });
    const org = admin.organizationId;

    const existingRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'exists@example.com', organizationId: org });
    const missingRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nobody@example.com', organizationId: org });

    expect(existingRes.status).toBe(200);
    expect(missingRes.status).toBe(200);
    expect(existingRes.body.message).toBe(missingRes.body.message);
  });
});

describe('error handling pipeline', () => {
  it('returns a structured 404 for unknown routes', async () => {
    const res = await request(app).post('/api/v1/auth/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.status).toBe('fail');
  });

  it('returns 401, not 500, for a malformed JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', 'Bearer garbage.token.here')
      .send({});
    expect(res.status).toBe(401);
  });
});
