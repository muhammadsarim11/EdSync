import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { createVerifiedOrgAdmin, inviteAndRegister, createCohortWithInstructor } from './helpers.js';

describe('GET /api/v1/organizations/me', () => {
  it('returns branding for any authenticated member of the organization', async () => {
    const admin = await createVerifiedOrgAdmin();

    const res = await request(app).get('/api/v1/organizations/me').set('Cookie', admin.cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.organization.name).toBe(admin.orgName);
    expect(res.body.data.organization.logoUrl).toBe('');
    expect(res.body.data.organization.themeColor).toBe('#000000');
  });

  it('blocks an unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/organizations/me');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/v1/organizations/me', () => {
  it('lets the InstituteAdmin update branding', async () => {
    const admin = await createVerifiedOrgAdmin();

    const res = await request(app)
      .patch('/api/v1/organizations/me')
      .set('Cookie', admin.cookie)
      .send({ name: 'Renamed Institute', logoUrl: 'https://example.com/logo.png', themeColor: '#1A2B3C' });

    expect(res.status).toBe(200);
    expect(res.body.data.organization.name).toBe('Renamed Institute');
    expect(res.body.data.organization.logoUrl).toBe('https://example.com/logo.png');
    expect(res.body.data.organization.themeColor).toBe('#1A2B3C');
  });

  it('rejects an invalid hex color', async () => {
    const admin = await createVerifiedOrgAdmin();

    const res = await request(app)
      .patch('/api/v1/organizations/me')
      .set('Cookie', admin.cookie)
      .send({ themeColor: 'not-a-color' });

    expect(res.status).toBe(400);
  });

  it('blocks a non-admin from updating branding', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { instructor } = await createCohortWithInstructor(admin);

    const res = await request(app)
      .patch('/api/v1/organizations/me')
      .set('Cookie', instructor.cookie)
      .send({ name: 'Hijacked Name' });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/v1/organizations/me/dashboard', () => {
  it('reports active cohorts, enrolled students, and pending invites', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId } = await createCohortWithInstructor(admin);
    const student = await inviteAndRegister(admin, { email: 'student@example.com', role: 'Student' });
    await request(app)
      .post(`/api/v1/cohorts/${cohortId}/enrollments`)
      .set('Cookie', admin.cookie)
      .send({ studentIds: [student.userId] });
    await request(app)
      .patch(`/api/v1/cohorts/${cohortId}`)
      .set('Cookie', admin.cookie)
      .send({ status: 'Active' });
    await request(app)
      .post('/api/v1/invitations')
      .set('Cookie', admin.cookie)
      .send({ email: 'pending@example.com', role: 'Instructor' });

    const res = await request(app).get('/api/v1/organizations/me/dashboard').set('Cookie', admin.cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.dashboard.cohorts).toEqual({ total: 1, active: 1 });
    expect(res.body.data.dashboard.enrolledStudents).toBe(1);
    expect(res.body.data.dashboard.pendingInvites).toBe(1);
  });

  it('blocks a non-admin from viewing the dashboard', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { instructor } = await createCohortWithInstructor(admin);

    const res = await request(app).get('/api/v1/organizations/me/dashboard').set('Cookie', instructor.cookie);

    expect(res.status).toBe(403);
  });
});
