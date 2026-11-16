import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { createVerifiedOrgAdmin, inviteAndRegister } from './helpers.js';

describe('GET /api/v1/users', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/v1/users');
    expect(res.status).toBe(401);
  });

  it('blocks a Student from listing users', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cookie } = await inviteAndRegister(admin, { email: 'student@example.com', role: 'Student' });

    const res = await request(app).get('/api/v1/users').set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  it('lets an Instructor list users too, so they can find students to enroll', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cookie } = await inviteAndRegister(admin, {
      email: 'instructor@example.com',
      role: 'Instructor'
    });

    const res = await request(app).get('/api/v1/users').set('Cookie', cookie);
    expect(res.status).toBe(200);
  });

  it("scopes the list to the admin's organization and supports role/status filters", async () => {
    const adminA = await createVerifiedOrgAdmin();
    const adminB = await createVerifiedOrgAdmin();
    await inviteAndRegister(adminA, { email: 'instructorA@example.com', role: 'Instructor' });
    await inviteAndRegister(adminA, { email: 'studentA@example.com', role: 'Student' });
    await inviteAndRegister(adminB, { email: 'studentB@example.com', role: 'Student' });

    const allA = await request(app).get('/api/v1/users').set('Cookie', adminA.cookie);
    expect(allA.body.results).toBe(3); // adminA + instructor + student

    const studentsOnly = await request(app).get('/api/v1/users?role=Student').set('Cookie', adminA.cookie);
    expect(studentsOnly.body.results).toBe(1);
    expect(studentsOnly.body.data.users[0].email).toBe('studenta@example.com');
  });

  it('rejects an invalid role/status filter with 400', async () => {
    const admin = await createVerifiedOrgAdmin();
    const res = await request(app).get('/api/v1/users?role=NotARole').set('Cookie', admin.cookie);
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/v1/users/:id/suspend and /reactivate', () => {
  it('lets an admin suspend and reactivate another user, blocking their access in between', async () => {
    const admin = await createVerifiedOrgAdmin();
    const instructor = await inviteAndRegister(admin, { email: 'instr@example.com', role: 'Instructor' });

    const suspendRes = await request(app)
      .patch(`/api/v1/users/${instructor.userId}/suspend`)
      .set('Cookie', admin.cookie);
    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.data.user.isActive).toBe(false);

    const blockedLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: instructor.email, password: instructor.password, organizationId: admin.organizationId });
    expect(blockedLogin.status).toBe(403);

    // Use an endpoint that only requires auth (not an admin role), so this
    // actually exercises requireAuth's isActive gate rather than restrictTo.
    const blockedRequest = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Cookie', instructor.cookie)
      .send({ currentPassword: instructor.password, newPassword: 'irrelevant123' });
    expect(blockedRequest.status).toBe(403);

    const reactivateRes = await request(app)
      .patch(`/api/v1/users/${instructor.userId}/reactivate`)
      .set('Cookie', admin.cookie);
    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.data.user.isActive).toBe(true);

    const restoredLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: instructor.email, password: instructor.password, organizationId: admin.organizationId });
    expect(restoredLogin.status).toBe(200);
  });

  it('lets an admin suspend a peer InstituteAdmin in the same org', async () => {
    const admin = await createVerifiedOrgAdmin();
    const peerAdmin = await inviteAndRegister(admin, {
      email: 'peer-admin@example.com',
      role: 'InstituteAdmin'
    });

    const res = await request(app)
      .patch(`/api/v1/users/${peerAdmin.userId}/suspend`)
      .set('Cookie', admin.cookie);
    expect(res.status).toBe(200);
  });

  it('blocks an admin from suspending themselves', async () => {
    const admin = await createVerifiedOrgAdmin();

    const meRes = await request(app).get('/api/v1/users?role=InstituteAdmin').set('Cookie', admin.cookie);
    const selfId = meRes.body.data.users[0].id;

    const res = await request(app).patch(`/api/v1/users/${selfId}/suspend`).set('Cookie', admin.cookie);
    expect(res.status).toBe(400);
  });

  it('returns 404 for a user id in a different organization', async () => {
    const adminA = await createVerifiedOrgAdmin();
    const adminB = await createVerifiedOrgAdmin();
    const studentB = await inviteAndRegister(adminB, { email: 'studentb@example.com', role: 'Student' });

    const res = await request(app)
      .patch(`/api/v1/users/${studentB.userId}/suspend`)
      .set('Cookie', adminA.cookie);
    expect(res.status).toBe(404);
  });

  it('rejects a malformed user id with 400', async () => {
    const admin = await createVerifiedOrgAdmin();
    const res = await request(app).patch('/api/v1/users/not-an-id/suspend').set('Cookie', admin.cookie);
    expect(res.status).toBe(400);
  });

  it('blocks an Instructor from suspending, even though they can list users', async () => {
    const admin = await createVerifiedOrgAdmin();
    const instructor = await inviteAndRegister(admin, {
      email: 'instructor2@example.com',
      role: 'Instructor'
    });
    const student = await inviteAndRegister(admin, { email: 'student2@example.com', role: 'Student' });

    const res = await request(app)
      .patch(`/api/v1/users/${student.userId}/suspend`)
      .set('Cookie', instructor.cookie);
    expect(res.status).toBe(403);
  });
});
