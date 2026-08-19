import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { createVerifiedOrgAdmin, inviteAndRegister, createCohortWithInstructor } from './helpers.js';

describe('POST /api/v1/cohorts', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).post('/api/v1/cohorts').send({});
    expect(res.status).toBe(401);
  });

  it('blocks an Instructor from creating a cohort', async () => {
    const admin = await createVerifiedOrgAdmin();
    const instructor = await inviteAndRegister(admin, { email: 'instr@example.com', role: 'Instructor' });

    const res = await request(app)
      .post('/api/v1/cohorts')
      .set('Cookie', instructor.cookie)
      .send({ title: 'Cohort', startDate: new Date().toISOString(), instructorId: instructor.userId });
    expect(res.status).toBe(403);
  });

  it('rejects an instructorId that is not an Instructor in the org', async () => {
    const admin = await createVerifiedOrgAdmin();
    const student = await inviteAndRegister(admin, { email: 'student@example.com', role: 'Student' });

    const res = await request(app)
      .post('/api/v1/cohorts')
      .set('Cookie', admin.cookie)
      .send({ title: 'Cohort', startDate: new Date().toISOString(), instructorId: student.userId });
    expect(res.status).toBe(400);
  });

  it('lets an InstituteAdmin create a cohort assigned to an Instructor', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { res } = await createCohortWithInstructor(admin);
    expect(res.status).toBe(201);
    expect(res.body.data.cohort.status).toBe('Upcoming');
  });
});

describe('GET /api/v1/cohorts', () => {
  it('shows an admin all cohorts, an instructor only their own, and a student only enrolled ones', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const otherInstructor = await inviteAndRegister(admin, {
      email: 'other-instr@example.com',
      role: 'Instructor'
    });
    const student = await inviteAndRegister(admin, { email: 'student@example.com', role: 'Student' });

    const adminList = await request(app).get('/api/v1/cohorts').set('Cookie', admin.cookie);
    expect(adminList.body.results).toBe(1);

    const ownerList = await request(app).get('/api/v1/cohorts').set('Cookie', instructor.cookie);
    expect(ownerList.body.results).toBe(1);

    const otherList = await request(app).get('/api/v1/cohorts').set('Cookie', otherInstructor.cookie);
    expect(otherList.body.results).toBe(0);

    const studentListBefore = await request(app).get('/api/v1/cohorts').set('Cookie', student.cookie);
    expect(studentListBefore.body.results).toBe(0);

    await request(app)
      .post(`/api/v1/cohorts/${cohortId}/enrollments`)
      .set('Cookie', admin.cookie)
      .send({ studentIds: [student.userId] });

    const studentListAfter = await request(app).get('/api/v1/cohorts').set('Cookie', student.cookie);
    expect(studentListAfter.body.results).toBe(1);
  });
});

describe('GET /api/v1/cohorts/:id', () => {
  it("hides one org's cohort from another org's admin (404, not leaked)", async () => {
    const adminA = await createVerifiedOrgAdmin();
    const adminB = await createVerifiedOrgAdmin();
    const { cohortId } = await createCohortWithInstructor(adminA);

    const res = await request(app).get(`/api/v1/cohorts/${cohortId}`).set('Cookie', adminB.cookie);
    expect(res.status).toBe(404);
  });

  it('hides a cohort from an instructor who does not own it', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId } = await createCohortWithInstructor(admin);
    const otherInstructor = await inviteAndRegister(admin, {
      email: 'other-instr@example.com',
      role: 'Instructor'
    });

    const res = await request(app).get(`/api/v1/cohorts/${cohortId}`).set('Cookie', otherInstructor.cookie);
    expect(res.status).toBe(404);
  });

  it('hides a cohort from a student who is not enrolled', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId } = await createCohortWithInstructor(admin);
    const student = await inviteAndRegister(admin, { email: 'student@example.com', role: 'Student' });

    const res = await request(app).get(`/api/v1/cohorts/${cohortId}`).set('Cookie', student.cookie);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/v1/cohorts/:id', () => {
  it('lets the owning instructor update the cohort but blocks a non-owning one', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const otherInstructor = await inviteAndRegister(admin, {
      email: 'other-instr@example.com',
      role: 'Instructor'
    });

    const ownerRes = await request(app)
      .patch(`/api/v1/cohorts/${cohortId}`)
      .set('Cookie', instructor.cookie)
      .send({ status: 'Active' });
    expect(ownerRes.status).toBe(200);
    expect(ownerRes.body.data.cohort.status).toBe('Active');

    const nonOwnerRes = await request(app)
      .patch(`/api/v1/cohorts/${cohortId}`)
      .set('Cookie', otherInstructor.cookie)
      .send({ status: 'Completed' });
    expect(nonOwnerRes.status).toBe(404);
  });

  it('blocks a Student from updating a cohort', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId } = await createCohortWithInstructor(admin);
    const student = await inviteAndRegister(admin, { email: 'student@example.com', role: 'Student' });

    const res = await request(app)
      .patch(`/api/v1/cohorts/${cohortId}`)
      .set('Cookie', student.cookie)
      .send({ status: 'Active' });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/v1/cohorts/:id', () => {
  it('blocks deleting a cohort that has enrollments', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId } = await createCohortWithInstructor(admin);
    const student = await inviteAndRegister(admin, { email: 'student@example.com', role: 'Student' });
    await request(app)
      .post(`/api/v1/cohorts/${cohortId}/enrollments`)
      .set('Cookie', admin.cookie)
      .send({ studentIds: [student.userId] });

    const res = await request(app).delete(`/api/v1/cohorts/${cohortId}`).set('Cookie', admin.cookie);
    expect(res.status).toBe(409);
  });

  it('blocks deleting a cohort that has modules', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    await request(app)
      .post(`/api/v1/cohorts/${cohortId}/modules`)
      .set('Cookie', instructor.cookie)
      .send({ title: 'Module 1', orderIndex: 0 });

    const res = await request(app).delete(`/api/v1/cohorts/${cohortId}`).set('Cookie', admin.cookie);
    expect(res.status).toBe(409);
  });

  it('deletes an empty cohort', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId } = await createCohortWithInstructor(admin);

    const res = await request(app).delete(`/api/v1/cohorts/${cohortId}`).set('Cookie', admin.cookie);
    expect(res.status).toBe(200);

    const getRes = await request(app).get(`/api/v1/cohorts/${cohortId}`).set('Cookie', admin.cookie);
    expect(getRes.status).toBe(404);
  });
});
