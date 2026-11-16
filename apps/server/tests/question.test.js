import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { createVerifiedOrgAdmin, inviteAndRegister, createCohortWithInstructor } from './helpers.js';

const postQuestion = (cohortId, cookie, overrides = {}) =>
  request(app)
    .post(`/api/v1/cohorts/${cohortId}/questions`)
    .set('Cookie', cookie)
    .send({ title: 'How does X work?', body: 'I am stuck on X.', ...overrides });

describe('POST /api/v1/cohorts/:cohortId/questions', () => {
  it('lets an enrolled student post a question', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId } = await createCohortWithInstructor(admin);
    const student = await inviteAndRegister(admin, { email: 'student@example.com', role: 'Student' });
    await request(app)
      .post(`/api/v1/cohorts/${cohortId}/enrollments`)
      .set('Cookie', admin.cookie)
      .send({ studentIds: [student.userId] });

    const res = await postQuestion(cohortId, student.cookie);
    expect(res.status).toBe(201);
    expect(res.body.data.question.status).toBe('Open');
    expect(res.body.data.question.replies).toHaveLength(0);
  });

  it('blocks an unenrolled student from posting', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId } = await createCohortWithInstructor(admin);
    const student = await inviteAndRegister(admin, { email: 'student@example.com', role: 'Student' });

    const res = await postQuestion(cohortId, student.cookie);
    expect(res.status).toBe(404);
  });

  it('rejects an empty body', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);

    const res = await postQuestion(cohortId, instructor.cookie, { body: '' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/cohorts/:cohortId/questions', () => {
  it('lists questions for the cohort, hidden from a non-member', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    await postQuestion(cohortId, instructor.cookie);
    const outsider = await inviteAndRegister(admin, { email: 'outsider@example.com', role: 'Instructor' });

    const listRes = await request(app)
      .get(`/api/v1/cohorts/${cohortId}/questions`)
      .set('Cookie', admin.cookie);
    expect(listRes.body.results).toBe(1);

    const outsiderRes = await request(app)
      .get(`/api/v1/cohorts/${cohortId}/questions`)
      .set('Cookie', outsider.cookie);
    expect(outsiderRes.status).toBe(404);
  });
});

describe('POST /api/v1/questions/:id/replies', () => {
  it('lets the instructor reply to a question', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const student = await inviteAndRegister(admin, { email: 'student@example.com', role: 'Student' });
    await request(app)
      .post(`/api/v1/cohorts/${cohortId}/enrollments`)
      .set('Cookie', admin.cookie)
      .send({ studentIds: [student.userId] });
    const questionRes = await postQuestion(cohortId, student.cookie);
    const questionId = questionRes.body.data.question.id;

    const res = await request(app)
      .post(`/api/v1/questions/${questionId}/replies`)
      .set('Cookie', instructor.cookie)
      .send({ body: 'Here is the answer.' });
    expect(res.status).toBe(201);
    expect(res.body.data.question.replies).toHaveLength(1);
    expect(res.body.data.question.replies[0].body).toBe('Here is the answer.');
  });

  it('blocks a non-member from replying', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const questionRes = await postQuestion(cohortId, instructor.cookie);
    const questionId = questionRes.body.data.question.id;
    const outsider = await inviteAndRegister(admin, { email: 'outsider@example.com', role: 'Instructor' });

    const res = await request(app)
      .post(`/api/v1/questions/${questionId}/replies`)
      .set('Cookie', outsider.cookie)
      .send({ body: 'Nope' });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/v1/questions/:id/resolve', () => {
  it('lets the author resolve their own question', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId } = await createCohortWithInstructor(admin);
    const student = await inviteAndRegister(admin, { email: 'student@example.com', role: 'Student' });
    await request(app)
      .post(`/api/v1/cohorts/${cohortId}/enrollments`)
      .set('Cookie', admin.cookie)
      .send({ studentIds: [student.userId] });
    const questionRes = await postQuestion(cohortId, student.cookie);
    const questionId = questionRes.body.data.question.id;

    const res = await request(app)
      .patch(`/api/v1/questions/${questionId}/resolve`)
      .set('Cookie', student.cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.question.status).toBe('Resolved');
  });

  it('lets the owning instructor resolve a question they did not author, but blocks another student', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const studentA = await inviteAndRegister(admin, { email: 'a@example.com', role: 'Student' });
    const studentB = await inviteAndRegister(admin, { email: 'b@example.com', role: 'Student' });
    await request(app)
      .post(`/api/v1/cohorts/${cohortId}/enrollments`)
      .set('Cookie', admin.cookie)
      .send({ studentIds: [studentA.userId, studentB.userId] });
    const questionRes = await postQuestion(cohortId, studentA.cookie);
    const questionId = questionRes.body.data.question.id;

    const blockedRes = await request(app)
      .patch(`/api/v1/questions/${questionId}/resolve`)
      .set('Cookie', studentB.cookie);
    expect(blockedRes.status).toBe(404);

    const allowedRes = await request(app)
      .patch(`/api/v1/questions/${questionId}/resolve`)
      .set('Cookie', instructor.cookie);
    expect(allowedRes.status).toBe(200);
  });
});
