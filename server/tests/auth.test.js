import { describe, it, expect } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email.js';

const orgId = () => new mongoose.Types.ObjectId().toString();

const registerBody = (overrides = {}) => ({
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  password: 'password123',
  role: 'Student',
  organizationId: orgId(),
  ...overrides
});

const lastCodeSentTo = (mockFn) => mockFn.mock.calls.at(-1)[1];

describe('POST /api/v1/auth/register', () => {
  it('rejects an invalid payload with 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'A', email: 'not-an-email', password: 'short', role: 'Student', organizationId: '123' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('fail');
  });

  it('registers a new user and emails a verification code', async () => {
    const body = registerBody();
    const res = await request(app).post('/api/v1/auth/register').send(body);

    expect(res.status).toBe(201);
    expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(sendVerificationEmail).toHaveBeenCalledWith(body.email, expect.stringMatching(/^\d{6}$/));
  });

  it('rejects a duplicate email within the same organization with 409', async () => {
    const body = registerBody();
    await request(app).post('/api/v1/auth/register').send(body);

    const res = await request(app).post('/api/v1/auth/register').send(body);

    expect(res.status).toBe(409);
  });

  it('allows the same email in a different organization', async () => {
    const body = registerBody();
    await request(app).post('/api/v1/auth/register').send(body);

    const res = await request(app).post('/api/v1/auth/register').send(registerBody({ email: body.email }));

    expect(res.status).toBe(201);
  });
});

describe('full auth lifecycle', () => {
  it('registers, verifies, logs in, changes password, and logs in with the new password', async () => {
    const body = registerBody({ email: 'lifecycle@example.com' });
    const org = body.organizationId;

    await request(app).post('/api/v1/auth/register').send(body);
    const verificationCode = lastCodeSentTo(sendVerificationEmail);

    const loginBeforeVerify = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: body.email, password: body.password, organizationId: org });
    expect(loginBeforeVerify.status).toBe(403);

    const verifyRes = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ email: body.email, organizationId: org, code: verificationCode });
    expect(verifyRes.status).toBe(200);

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: body.email, password: body.password, organizationId: org });
    expect(loginRes.status).toBe(200);
    const cookie = loginRes.headers['set-cookie'];
    expect(cookie).toBeDefined();

    const noTokenRes = await request(app).post('/api/v1/auth/change-password').send({});
    expect(noTokenRes.status).toBe(401);

    const changeRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: body.password, newPassword: 'newPassword456' });
    expect(changeRes.status).toBe(200);

    const oldPasswordLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: body.email, password: body.password, organizationId: org });
    expect(oldPasswordLogin.status).toBe(401);

    const newPasswordLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: body.email, password: 'newPassword456', organizationId: org });
    expect(newPasswordLogin.status).toBe(200);
  });

  it('resets a forgotten password end to end', async () => {
    const body = registerBody({ email: 'forgot@example.com' });
    const org = body.organizationId;

    await request(app).post('/api/v1/auth/register').send(body);
    const verificationCode = lastCodeSentTo(sendVerificationEmail);
    await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ email: body.email, organizationId: org, code: verificationCode });

    const forgotRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: body.email, organizationId: org });
    expect(forgotRes.status).toBe(200);
    const resetCode = lastCodeSentTo(sendPasswordResetEmail);

    const resetRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ email: body.email, organizationId: org, code: resetCode, newPassword: 'resetPassword789' });
    expect(resetRes.status).toBe(200);

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: body.email, password: 'resetPassword789', organizationId: org });
    expect(loginRes.status).toBe(200);
  });
});

describe('account enumeration protection', () => {
  it('returns an identical generic response for forgot-password whether or not the account exists', async () => {
    const org = orgId();
    const body = registerBody({ email: 'exists@example.com', organizationId: org });
    await request(app).post('/api/v1/auth/register').send(body);

    const existingRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: body.email, organizationId: org });
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
