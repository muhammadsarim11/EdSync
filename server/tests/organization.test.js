import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { sendVerificationEmail } from '../utils/email.js';
import { lastCodeSentTo } from './helpers.js';

const orgBody = (overrides = {}) => ({
  orgName: 'SCIIT',
  adminName: 'Ada Admin',
  email: 'admin@sciit.example.com',
  password: 'adminPassword123',
  ...overrides
});

describe('POST /api/v1/organizations', () => {
  it('rejects an invalid payload with 400', async () => {
    const res = await request(app).post('/api/v1/organizations').send({ orgName: '', email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('fail');
  });

  it('creates an institute and its first InstituteAdmin, unverified', async () => {
    const body = orgBody();
    const res = await request(app).post('/api/v1/organizations').send(body);

    expect(res.status).toBe(201);
    expect(res.body.data.organization.slug).toBe('sciit');
    expect(sendVerificationEmail).toHaveBeenCalledTimes(1);

    const organizationId = res.body.data.organization.id;
    const loginBeforeVerify = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: body.email, password: body.password, organizationId });
    expect(loginBeforeVerify.status).toBe(403);

    const code = lastCodeSentTo(sendVerificationEmail);
    const verifyRes = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ email: body.email, organizationId, code });
    expect(verifyRes.status).toBe(200);

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: body.email, password: body.password, organizationId });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.role).toBe('InstituteAdmin');
  });

  it('assigns a distinct slug when the institute name collides', async () => {
    await request(app).post('/api/v1/organizations').send(orgBody());
    const res = await request(app)
      .post('/api/v1/organizations')
      .send(orgBody({ email: 'admin2@sciit.example.com' }));

    expect(res.status).toBe(201);
    expect(res.body.data.organization.slug).not.toBe('sciit');
    expect(res.body.data.organization.slug).toMatch(/^sciit-/);
  });
});
