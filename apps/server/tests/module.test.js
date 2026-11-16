import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { createVerifiedOrgAdmin, inviteAndRegister, createCohortWithInstructor } from './helpers.js';

const createModule = (cohortId, cookie, overrides = {}) =>
  request(app)
    .post(`/api/v1/cohorts/${cohortId}/modules`)
    .set('Cookie', cookie)
    .send({ title: 'Module 1', orderIndex: 0, ...overrides });

describe('POST /api/v1/cohorts/:cohortId/modules', () => {
  it('lets the owning instructor create a module', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);

    const res = await createModule(cohortId, instructor.cookie);
    expect(res.status).toBe(201);
    expect(res.body.data.module.cohortId).toBe(cohortId);
  });

  it('blocks a non-owning instructor from creating a module', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId } = await createCohortWithInstructor(admin);
    const otherInstructor = await inviteAndRegister(admin, {
      email: 'other-instr@example.com',
      role: 'Instructor'
    });

    const res = await createModule(cohortId, otherInstructor.cookie);
    expect(res.status).toBe(404);
  });

  it('blocks a Student from creating a module', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId } = await createCohortWithInstructor(admin);
    const student = await inviteAndRegister(admin, { email: 'student@example.com', role: 'Student' });

    const res = await createModule(cohortId, student.cookie);
    expect(res.status).toBe(403);
  });
});

describe('module visibility for enrolled students', () => {
  it('hides modules from a student who is not enrolled, shows them once enrolled', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    await createModule(cohortId, instructor.cookie);
    const student = await inviteAndRegister(admin, { email: 'student@example.com', role: 'Student' });

    const before = await request(app)
      .get(`/api/v1/cohorts/${cohortId}/modules`)
      .set('Cookie', student.cookie);
    expect(before.status).toBe(404);

    await request(app)
      .post(`/api/v1/cohorts/${cohortId}/enrollments`)
      .set('Cookie', admin.cookie)
      .send({ studentIds: [student.userId] });

    const after = await request(app).get(`/api/v1/cohorts/${cohortId}/modules`).set('Cookie', student.cookie);
    expect(after.status).toBe(200);
    expect(after.body.results).toBe(1);
  });
});

describe('PATCH/DELETE /api/v1/modules/:id', () => {
  it('updates a module', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const createRes = await createModule(cohortId, instructor.cookie);
    const moduleId = createRes.body.data.module.id;

    const res = await request(app)
      .patch(`/api/v1/modules/${moduleId}`)
      .set('Cookie', instructor.cookie)
      .send({ title: 'Renamed' });
    expect(res.status).toBe(200);
    expect(res.body.data.module.title).toBe('Renamed');
  });

  it('blocks deleting a module that has lectures', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const createRes = await createModule(cohortId, instructor.cookie);
    const moduleId = createRes.body.data.module.id;

    await request(app)
      .post(`/api/v1/modules/${moduleId}/lectures`)
      .set('Cookie', instructor.cookie)
      .send({ title: 'Lecture 1', orderIndex: 0, type: 'Recorded' });

    const res = await request(app).delete(`/api/v1/modules/${moduleId}`).set('Cookie', instructor.cookie);
    expect(res.status).toBe(409);
  });

  it('deletes an empty module', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const createRes = await createModule(cohortId, instructor.cookie);
    const moduleId = createRes.body.data.module.id;

    const res = await request(app).delete(`/api/v1/modules/${moduleId}`).set('Cookie', instructor.cookie);
    expect(res.status).toBe(200);
  });
});

describe('lecture CRUD nested under a module', () => {
  it('creates, lists, updates, and deletes a lecture, validating type and URLs', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const moduleRes = await createModule(cohortId, instructor.cookie);
    const moduleId = moduleRes.body.data.module.id;

    const badType = await request(app)
      .post(`/api/v1/modules/${moduleId}/lectures`)
      .set('Cookie', instructor.cookie)
      .send({ title: 'L1', orderIndex: 0, type: 'NotAType' });
    expect(badType.status).toBe(400);

    const createRes = await request(app)
      .post(`/api/v1/modules/${moduleId}/lectures`)
      .set('Cookie', instructor.cookie)
      .send({ title: 'Intro', orderIndex: 0, type: 'Recorded', videoUrl: 'https://example.com/v.mp4' });
    expect(createRes.status).toBe(201);
    const lectureId = createRes.body.data.lecture.id;

    const listRes = await request(app)
      .get(`/api/v1/modules/${moduleId}/lectures`)
      .set('Cookie', instructor.cookie);
    expect(listRes.body.results).toBe(1);

    const updateRes = await request(app)
      .patch(`/api/v1/lectures/${lectureId}`)
      .set('Cookie', instructor.cookie)
      .send({ resourceUrl: 'https://example.com/slides.pdf' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.lecture.resourceUrl).toBe('https://example.com/slides.pdf');

    const deleteRes = await request(app)
      .delete(`/api/v1/lectures/${lectureId}`)
      .set('Cookie', instructor.cookie);
    expect(deleteRes.status).toBe(200);
  });

  it('blocks a non-owning instructor from managing lectures', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const moduleRes = await createModule(cohortId, instructor.cookie);
    const moduleId = moduleRes.body.data.module.id;
    const otherInstructor = await inviteAndRegister(admin, {
      email: 'other-instr@example.com',
      role: 'Instructor'
    });

    const res = await request(app)
      .post(`/api/v1/modules/${moduleId}/lectures`)
      .set('Cookie', otherInstructor.cookie)
      .send({ title: 'L1', orderIndex: 0, type: 'Live' });
    expect(res.status).toBe(404);
  });
});
