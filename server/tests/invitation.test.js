import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import Invitation from '../models/invitation.model.js';
import { sendInvitationEmail } from '../utils/email.js';
import { createVerifiedOrgAdmin, lastInviteTokenSent } from './helpers.js';

const registerWithToken = (overrides = {}) =>
  request(app)
    .post('/api/v1/auth/register')
    .send({
      name: 'Grace Hopper',
      email: 'grace@example.com',
      password: 'password123',
      ...overrides
    });

describe('POST /api/v1/invitations', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).post('/api/v1/invitations').send({ email: 'a@b.com', role: 'Student' });
    expect(res.status).toBe(401);
  });

  it('lets an InstituteAdmin invite a user and emails them a link', async () => {
    const admin = await createVerifiedOrgAdmin();

    const res = await request(app)
      .post('/api/v1/invitations')
      .set('Cookie', admin.cookie)
      .send({ email: 'grace@example.com', role: 'Student' });

    expect(res.status).toBe(201);
    expect(sendInvitationEmail).toHaveBeenCalledTimes(1);
  });

  it('creates the invited user with the invitation role/org even if the client sends different ones', async () => {
    const admin = await createVerifiedOrgAdmin();
    await request(app)
      .post('/api/v1/invitations')
      .set('Cookie', admin.cookie)
      .send({ email: 'grace@example.com', role: 'Student' });
    const inviteToken = lastInviteTokenSent();

    const otherAdmin = await createVerifiedOrgAdmin();

    const res = await registerWithToken({
      inviteToken,
      role: 'InstituteAdmin',
      organizationId: otherAdmin.organizationId
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('Student');
    expect(res.body.data.user.organizationId).toBe(admin.organizationId);
    expect(res.body.data.user.isEmailVerified).toBe(true);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('lets the invited user log in immediately with no separate verification step', async () => {
    const admin = await createVerifiedOrgAdmin();
    await request(app)
      .post('/api/v1/invitations')
      .set('Cookie', admin.cookie)
      .send({ email: 'grace@example.com', role: 'Instructor' });
    const inviteToken = lastInviteTokenSent();

    await registerWithToken({ inviteToken });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'grace@example.com', password: 'password123', organizationId: admin.organizationId });
    expect(loginRes.status).toBe(200);
  });

  it('rejects registration with a wrong, expired, or revoked invite token', async () => {
    const admin = await createVerifiedOrgAdmin();

    const badToken = await registerWithToken({ inviteToken: 'not-a-real-token' });
    expect(badToken.status).toBe(400);

    await request(app)
      .post('/api/v1/invitations')
      .set('Cookie', admin.cookie)
      .send({ email: 'expired@example.com', role: 'Student' });
    const expiredToken = lastInviteTokenSent();
    await Invitation.updateOne({ email: 'expired@example.com' }, { expiresAt: Date.now() - 1000 });
    const expiredRes = await registerWithToken({ inviteToken: expiredToken, email: 'expired@example.com' });
    expect(expiredRes.status).toBe(400);

    const inviteRes = await request(app)
      .post('/api/v1/invitations')
      .set('Cookie', admin.cookie)
      .send({ email: 'revoked@example.com', role: 'Student' });
    const revokedToken = lastInviteTokenSent();
    await request(app)
      .delete(`/api/v1/invitations/${inviteRes.body.data.invitation.id}`)
      .set('Cookie', admin.cookie);
    const revokedRes = await registerWithToken({ inviteToken: revokedToken, email: 'revoked@example.com' });
    expect(revokedRes.status).toBe(400);
  });

  it('rejects registration when the email does not match the invitation', async () => {
    const admin = await createVerifiedOrgAdmin();
    await request(app)
      .post('/api/v1/invitations')
      .set('Cookie', admin.cookie)
      .send({ email: 'grace@example.com', role: 'Student' });
    const inviteToken = lastInviteTokenSent();

    const res = await registerWithToken({ inviteToken, email: 'someone-else@example.com' });
    expect(res.status).toBe(400);
  });

  it('blocks a Student invitee from creating invitations', async () => {
    const admin = await createVerifiedOrgAdmin();
    await request(app)
      .post('/api/v1/invitations')
      .set('Cookie', admin.cookie)
      .send({ email: 'grace@example.com', role: 'Student' });
    const inviteToken = lastInviteTokenSent();
    const studentRegisterRes = await registerWithToken({ inviteToken });
    const studentCookie = studentRegisterRes.headers['set-cookie'];

    const res = await request(app)
      .post('/api/v1/invitations')
      .set('Cookie', studentCookie)
      .send({ email: 'nope@example.com', role: 'Student' });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/v1/invitations', () => {
  it("scopes invitations to the requesting admin's organization", async () => {
    const adminA = await createVerifiedOrgAdmin();
    const adminB = await createVerifiedOrgAdmin();

    await request(app)
      .post('/api/v1/invitations')
      .set('Cookie', adminA.cookie)
      .send({ email: 'onlyA@example.com', role: 'Student' });

    const resA = await request(app).get('/api/v1/invitations').set('Cookie', adminA.cookie);
    const resB = await request(app).get('/api/v1/invitations').set('Cookie', adminB.cookie);

    expect(resA.body.data.invitations).toHaveLength(1);
    expect(resB.body.data.invitations).toHaveLength(0);
  });
});

describe('DELETE /api/v1/invitations/:id', () => {
  it("returns 404 when revoking another organization's invitation", async () => {
    const adminA = await createVerifiedOrgAdmin();
    const adminB = await createVerifiedOrgAdmin();

    const inviteRes = await request(app)
      .post('/api/v1/invitations')
      .set('Cookie', adminA.cookie)
      .send({ email: 'onlyA@example.com', role: 'Student' });

    const res = await request(app)
      .delete(`/api/v1/invitations/${inviteRes.body.data.invitation.id}`)
      .set('Cookie', adminB.cookie);

    expect(res.status).toBe(404);
  });
});
