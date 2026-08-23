import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import {
  createVerifiedOrgAdmin,
  inviteAndRegister,
  createCohortWithInstructor,
  createLectureForCohort
} from './helpers.js';

const futureDate = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

const createAssignment = (lectureId, cookie, overrides = {}) =>
  request(app)
    .post(`/api/v1/lectures/${lectureId}/assignments`)
    .set('Cookie', cookie)
    .send({ title: 'Homework 1', deadline: futureDate(), ...overrides });

describe('POST /api/v1/lectures/:lectureId/assignments', () => {
  it('lets the owning instructor create an assignment', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const { lectureId } = await createLectureForCohort(cohortId, instructor.cookie);

    const res = await createAssignment(lectureId, instructor.cookie);
    expect(res.status).toBe(201);
    expect(res.body.data.assignment.lectureId).toBe(lectureId);
    expect(res.body.data.assignment.totalMarks).toBe(100);
  });

  it('blocks a non-owning instructor and a Student', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const { lectureId } = await createLectureForCohort(cohortId, instructor.cookie);
    const otherInstructor = await inviteAndRegister(admin, {
      email: 'other-instr@example.com',
      role: 'Instructor'
    });
    const student = await inviteAndRegister(admin, { email: 'student@example.com', role: 'Student' });

    const nonOwnerRes = await createAssignment(lectureId, otherInstructor.cookie);
    expect(nonOwnerRes.status).toBe(404);

    const studentRes = await createAssignment(lectureId, student.cookie);
    expect(studentRes.status).toBe(403);
  });

  it('rejects a missing deadline', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const { lectureId } = await createLectureForCohort(cohortId, instructor.cookie);

    const res = await request(app)
      .post(`/api/v1/lectures/${lectureId}/assignments`)
      .set('Cookie', instructor.cookie)
      .send({ title: 'No deadline' });
    expect(res.status).toBe(400);
  });
});

describe('assignment visibility for enrolled students', () => {
  it('hides assignments from a student who is not enrolled, shows them once enrolled', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const { lectureId } = await createLectureForCohort(cohortId, instructor.cookie);
    await createAssignment(lectureId, instructor.cookie);
    const student = await inviteAndRegister(admin, { email: 'student@example.com', role: 'Student' });

    const before = await request(app)
      .get(`/api/v1/lectures/${lectureId}/assignments`)
      .set('Cookie', student.cookie);
    expect(before.status).toBe(404);

    await request(app)
      .post(`/api/v1/cohorts/${cohortId}/enrollments`)
      .set('Cookie', admin.cookie)
      .send({ studentIds: [student.userId] });

    const after = await request(app)
      .get(`/api/v1/lectures/${lectureId}/assignments`)
      .set('Cookie', student.cookie);
    expect(after.status).toBe(200);
    expect(after.body.results).toBe(1);
  });
});

describe('PATCH/DELETE /api/v1/assignments/:id', () => {
  it('updates an assignment', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const { lectureId } = await createLectureForCohort(cohortId, instructor.cookie);
    const createRes = await createAssignment(lectureId, instructor.cookie);
    const assignmentId = createRes.body.data.assignment.id;

    const res = await request(app)
      .patch(`/api/v1/assignments/${assignmentId}`)
      .set('Cookie', instructor.cookie)
      .send({ totalMarks: 50 });
    expect(res.status).toBe(200);
    expect(res.body.data.assignment.totalMarks).toBe(50);
  });

  it('blocks deleting an assignment that has submissions', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const { lectureId } = await createLectureForCohort(cohortId, instructor.cookie);
    const createRes = await createAssignment(lectureId, instructor.cookie);
    const assignmentId = createRes.body.data.assignment.id;
    const student = await inviteAndRegister(admin, { email: 'student@example.com', role: 'Student' });
    await request(app)
      .post(`/api/v1/cohorts/${cohortId}/enrollments`)
      .set('Cookie', admin.cookie)
      .send({ studentIds: [student.userId] });
    await request(app)
      .post(`/api/v1/assignments/${assignmentId}/submissions`)
      .set('Cookie', student.cookie)
      .send({ fileUrl: 'https://github.com/example/repo' });

    const res = await request(app)
      .delete(`/api/v1/assignments/${assignmentId}`)
      .set('Cookie', instructor.cookie);
    expect(res.status).toBe(409);
  });
});
