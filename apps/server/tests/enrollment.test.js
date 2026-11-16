import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { createVerifiedOrgAdmin, inviteAndRegister, createCohortWithInstructor } from './helpers.js';

describe('POST /api/v1/cohorts/:cohortId/enrollments', () => {
  it('bulk-enrolls a roster of students, skipping ones already enrolled', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId } = await createCohortWithInstructor(admin);
    const studentA = await inviteAndRegister(admin, { email: 'a@example.com', role: 'Student' });
    const studentB = await inviteAndRegister(admin, { email: 'b@example.com', role: 'Student' });

    const firstRes = await request(app)
      .post(`/api/v1/cohorts/${cohortId}/enrollments`)
      .set('Cookie', admin.cookie)
      .send({ studentIds: [studentA.userId] });
    expect(firstRes.status).toBe(201);
    expect(firstRes.body.data.enrollments).toHaveLength(1);

    const secondRes = await request(app)
      .post(`/api/v1/cohorts/${cohortId}/enrollments`)
      .set('Cookie', admin.cookie)
      .send({ studentIds: [studentA.userId, studentB.userId] });
    expect(secondRes.status).toBe(201);
    expect(secondRes.body.data.enrollments).toHaveLength(1);
    expect(secondRes.body.message).toContain('1 were already enrolled');
  });

  it('rejects a studentId that does not reference a Student in the org', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);

    const res = await request(app)
      .post(`/api/v1/cohorts/${cohortId}/enrollments`)
      .set('Cookie', admin.cookie)
      .send({ studentIds: [instructor.userId] });
    expect(res.status).toBe(400);
  });

  it('rejects a studentId from a different organization', async () => {
    const adminA = await createVerifiedOrgAdmin();
    const adminB = await createVerifiedOrgAdmin();
    const { cohortId } = await createCohortWithInstructor(adminA);
    const studentB = await inviteAndRegister(adminB, { email: 'studentb@example.com', role: 'Student' });

    const res = await request(app)
      .post(`/api/v1/cohorts/${cohortId}/enrollments`)
      .set('Cookie', adminA.cookie)
      .send({ studentIds: [studentB.userId] });
    expect(res.status).toBe(400);
  });

  it('lets the owning instructor enroll students, blocks a non-owning one', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const otherInstructor = await inviteAndRegister(admin, {
      email: 'other-instr@example.com',
      role: 'Instructor'
    });
    const student = await inviteAndRegister(admin, { email: 'student@example.com', role: 'Student' });

    const blocked = await request(app)
      .post(`/api/v1/cohorts/${cohortId}/enrollments`)
      .set('Cookie', otherInstructor.cookie)
      .send({ studentIds: [student.userId] });
    expect(blocked.status).toBe(404);

    const allowed = await request(app)
      .post(`/api/v1/cohorts/${cohortId}/enrollments`)
      .set('Cookie', instructor.cookie)
      .send({ studentIds: [student.userId] });
    expect(allowed.status).toBe(201);
  });

  it('blocks a Student from bulk-enrolling', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId } = await createCohortWithInstructor(admin);
    const student = await inviteAndRegister(admin, { email: 'student@example.com', role: 'Student' });

    const res = await request(app)
      .post(`/api/v1/cohorts/${cohortId}/enrollments`)
      .set('Cookie', student.cookie)
      .send({ studentIds: [student.userId] });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/v1/cohorts/:cohortId/enrollments', () => {
  it('lists the roster with student details populated', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId } = await createCohortWithInstructor(admin);
    const student = await inviteAndRegister(admin, {
      name: 'Grace Hopper',
      email: 'grace@example.com',
      role: 'Student'
    });
    await request(app)
      .post(`/api/v1/cohorts/${cohortId}/enrollments`)
      .set('Cookie', admin.cookie)
      .send({ studentIds: [student.userId] });

    const res = await request(app).get(`/api/v1/cohorts/${cohortId}/enrollments`).set('Cookie', admin.cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.enrollments[0].student.email).toBe('grace@example.com');
    expect(res.body.data.enrollments[0].student.name).toBe('Grace Hopper');
  });
});

describe('DELETE /api/v1/enrollments/:id', () => {
  it('unenrolls a student', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId } = await createCohortWithInstructor(admin);
    const student = await inviteAndRegister(admin, { email: 'student@example.com', role: 'Student' });
    const enrollRes = await request(app)
      .post(`/api/v1/cohorts/${cohortId}/enrollments`)
      .set('Cookie', admin.cookie)
      .send({ studentIds: [student.userId] });
    const enrollmentId = enrollRes.body.data.enrollments[0].id;

    const res = await request(app).delete(`/api/v1/enrollments/${enrollmentId}`).set('Cookie', admin.cookie);
    expect(res.status).toBe(200);

    const rosterRes = await request(app)
      .get(`/api/v1/cohorts/${cohortId}/enrollments`)
      .set('Cookie', admin.cookie);
    expect(rosterRes.body.results).toBe(0);
  });

  it("returns 404 for another organization's enrollment", async () => {
    const adminA = await createVerifiedOrgAdmin();
    const adminB = await createVerifiedOrgAdmin();
    const { cohortId } = await createCohortWithInstructor(adminA);
    const student = await inviteAndRegister(adminA, { email: 'student@example.com', role: 'Student' });
    const enrollRes = await request(app)
      .post(`/api/v1/cohorts/${cohortId}/enrollments`)
      .set('Cookie', adminA.cookie)
      .send({ studentIds: [student.userId] });
    const enrollmentId = enrollRes.body.data.enrollments[0].id;

    const res = await request(app).delete(`/api/v1/enrollments/${enrollmentId}`).set('Cookie', adminB.cookie);
    expect(res.status).toBe(404);
  });
});
