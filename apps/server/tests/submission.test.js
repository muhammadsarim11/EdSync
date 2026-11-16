import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import Assignment from '../models/assignment.model.js';
import {
  createVerifiedOrgAdmin,
  inviteAndRegister,
  createCohortWithInstructor,
  createLectureForCohort
} from './helpers.js';

const futureDate = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

const setupEnrolledStudent = async (admin, cohortId, overrides = {}) => {
  const student = await inviteAndRegister(admin, {
    email: 'student@example.com',
    role: 'Student',
    ...overrides
  });
  await request(app)
    .post(`/api/v1/cohorts/${cohortId}/enrollments`)
    .set('Cookie', admin.cookie)
    .send({ studentIds: [student.userId] });
  return student;
};

describe('POST /api/v1/assignments/:assignmentId/submissions', () => {
  it('lets an enrolled student submit, computing status from the deadline', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const { lectureId } = await createLectureForCohort(cohortId, instructor.cookie);
    const createRes = await request(app)
      .post(`/api/v1/lectures/${lectureId}/assignments`)
      .set('Cookie', instructor.cookie)
      .send({ title: 'HW1', deadline: futureDate() });
    const assignmentId = createRes.body.data.assignment.id;
    const student = await setupEnrolledStudent(admin, cohortId);

    const res = await request(app)
      .post(`/api/v1/assignments/${assignmentId}/submissions`)
      .set('Cookie', student.cookie)
      .send({ fileUrl: 'https://github.com/example/repo' });
    expect(res.status).toBe(201);
    expect(res.body.data.submission.status).toBe('Submitted');
  });

  it('marks a submission Late when the deadline has already passed', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const { lectureId } = await createLectureForCohort(cohortId, instructor.cookie);
    const createRes = await request(app)
      .post(`/api/v1/lectures/${lectureId}/assignments`)
      .set('Cookie', instructor.cookie)
      .send({ title: 'HW1', deadline: futureDate() });
    const assignmentId = createRes.body.data.assignment.id;
    await Assignment.updateOne({ _id: assignmentId }, { deadline: new Date(Date.now() - 1000) });
    const student = await setupEnrolledStudent(admin, cohortId);

    const res = await request(app)
      .post(`/api/v1/assignments/${assignmentId}/submissions`)
      .set('Cookie', student.cookie)
      .send({ fileUrl: 'https://github.com/example/repo' });
    expect(res.status).toBe(201);
    expect(res.body.data.submission.status).toBe('Late');
  });

  it('rejects a second submission from the same student', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const { lectureId } = await createLectureForCohort(cohortId, instructor.cookie);
    const createRes = await request(app)
      .post(`/api/v1/lectures/${lectureId}/assignments`)
      .set('Cookie', instructor.cookie)
      .send({ title: 'HW1', deadline: futureDate() });
    const assignmentId = createRes.body.data.assignment.id;
    const student = await setupEnrolledStudent(admin, cohortId);
    await request(app)
      .post(`/api/v1/assignments/${assignmentId}/submissions`)
      .set('Cookie', student.cookie)
      .send({ fileUrl: 'https://github.com/example/repo' });

    const res = await request(app)
      .post(`/api/v1/assignments/${assignmentId}/submissions`)
      .set('Cookie', student.cookie)
      .send({ fileUrl: 'https://github.com/example/repo-v2' });
    expect(res.status).toBe(409);
  });

  it('blocks an unenrolled student and blocks InstituteAdmin/Instructor from submitting', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const { lectureId } = await createLectureForCohort(cohortId, instructor.cookie);
    const createRes = await request(app)
      .post(`/api/v1/lectures/${lectureId}/assignments`)
      .set('Cookie', instructor.cookie)
      .send({ title: 'HW1', deadline: futureDate() });
    const assignmentId = createRes.body.data.assignment.id;
    const unenrolledStudent = await inviteAndRegister(admin, { email: 'nope@example.com', role: 'Student' });

    const unenrolledRes = await request(app)
      .post(`/api/v1/assignments/${assignmentId}/submissions`)
      .set('Cookie', unenrolledStudent.cookie)
      .send({ fileUrl: 'https://github.com/example/repo' });
    expect(unenrolledRes.status).toBe(404);

    const adminRes = await request(app)
      .post(`/api/v1/assignments/${assignmentId}/submissions`)
      .set('Cookie', admin.cookie)
      .send({ fileUrl: 'https://github.com/example/repo' });
    expect(adminRes.status).toBe(403);
  });
});

describe('GET /api/v1/assignments/:assignmentId/submissions', () => {
  it('shows the instructor every submission but a student only their own', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const { lectureId } = await createLectureForCohort(cohortId, instructor.cookie);
    const createRes = await request(app)
      .post(`/api/v1/lectures/${lectureId}/assignments`)
      .set('Cookie', instructor.cookie)
      .send({ title: 'HW1', deadline: futureDate() });
    const assignmentId = createRes.body.data.assignment.id;
    const studentA = await setupEnrolledStudent(admin, cohortId, { email: 'a@example.com' });
    const studentB = await inviteAndRegister(admin, { email: 'b@example.com', role: 'Student' });
    await request(app)
      .post(`/api/v1/cohorts/${cohortId}/enrollments`)
      .set('Cookie', admin.cookie)
      .send({ studentIds: [studentB.userId] });
    await request(app)
      .post(`/api/v1/assignments/${assignmentId}/submissions`)
      .set('Cookie', studentA.cookie)
      .send({ fileUrl: 'https://github.com/example/repo-a' });
    await request(app)
      .post(`/api/v1/assignments/${assignmentId}/submissions`)
      .set('Cookie', studentB.cookie)
      .send({ fileUrl: 'https://github.com/example/repo-b' });

    const instructorView = await request(app)
      .get(`/api/v1/assignments/${assignmentId}/submissions`)
      .set('Cookie', instructor.cookie);
    expect(instructorView.body.results).toBe(2);
    expect(instructorView.body.data.submissions[0].student.email).toBeDefined();

    const studentView = await request(app)
      .get(`/api/v1/assignments/${assignmentId}/submissions`)
      .set('Cookie', studentA.cookie);
    expect(studentView.body.results).toBe(1);
    expect(studentView.body.data.submissions[0].fileUrl).toBe('https://github.com/example/repo-a');
  });
});

describe('PATCH /api/v1/submissions/:id/grade', () => {
  it('lets the owning instructor grade a submission', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const { lectureId } = await createLectureForCohort(cohortId, instructor.cookie);
    const createRes = await request(app)
      .post(`/api/v1/lectures/${lectureId}/assignments`)
      .set('Cookie', instructor.cookie)
      .send({ title: 'HW1', deadline: futureDate(), totalMarks: 50 });
    const assignmentId = createRes.body.data.assignment.id;
    const student = await setupEnrolledStudent(admin, cohortId);
    const submitRes = await request(app)
      .post(`/api/v1/assignments/${assignmentId}/submissions`)
      .set('Cookie', student.cookie)
      .send({ fileUrl: 'https://github.com/example/repo' });
    const submissionId = submitRes.body.data.submission.id;

    const overGrade = await request(app)
      .patch(`/api/v1/submissions/${submissionId}/grade`)
      .set('Cookie', instructor.cookie)
      .send({ obtainedMarks: 60 });
    expect(overGrade.status).toBe(400);

    const res = await request(app)
      .patch(`/api/v1/submissions/${submissionId}/grade`)
      .set('Cookie', instructor.cookie)
      .send({ obtainedMarks: 45, feedback: 'Great work' });
    expect(res.status).toBe(200);
    expect(res.body.data.submission.status).toBe('Graded');
    expect(res.body.data.submission.obtainedMarks).toBe(45);
  });

  it('blocks a Student from grading', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const { lectureId } = await createLectureForCohort(cohortId, instructor.cookie);
    const createRes = await request(app)
      .post(`/api/v1/lectures/${lectureId}/assignments`)
      .set('Cookie', instructor.cookie)
      .send({ title: 'HW1', deadline: futureDate() });
    const assignmentId = createRes.body.data.assignment.id;
    const student = await setupEnrolledStudent(admin, cohortId);
    const submitRes = await request(app)
      .post(`/api/v1/assignments/${assignmentId}/submissions`)
      .set('Cookie', student.cookie)
      .send({ fileUrl: 'https://github.com/example/repo' });
    const submissionId = submitRes.body.data.submission.id;

    const res = await request(app)
      .patch(`/api/v1/submissions/${submissionId}/grade`)
      .set('Cookie', student.cookie)
      .send({ obtainedMarks: 100 });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/v1/submissions/:id', () => {
  it("lets a student view their own submission but not another student's", async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const { lectureId } = await createLectureForCohort(cohortId, instructor.cookie);
    const createRes = await request(app)
      .post(`/api/v1/lectures/${lectureId}/assignments`)
      .set('Cookie', instructor.cookie)
      .send({ title: 'HW1', deadline: futureDate() });
    const assignmentId = createRes.body.data.assignment.id;
    const studentA = await setupEnrolledStudent(admin, cohortId, { email: 'a@example.com' });
    const studentB = await inviteAndRegister(admin, { email: 'b@example.com', role: 'Student' });
    await request(app)
      .post(`/api/v1/cohorts/${cohortId}/enrollments`)
      .set('Cookie', admin.cookie)
      .send({ studentIds: [studentB.userId] });
    const submitRes = await request(app)
      .post(`/api/v1/assignments/${assignmentId}/submissions`)
      .set('Cookie', studentA.cookie)
      .send({ fileUrl: 'https://github.com/example/repo' });
    const submissionId = submitRes.body.data.submission.id;

    const ownRes = await request(app)
      .get(`/api/v1/submissions/${submissionId}`)
      .set('Cookie', studentA.cookie);
    expect(ownRes.status).toBe(200);

    const otherRes = await request(app)
      .get(`/api/v1/submissions/${submissionId}`)
      .set('Cookie', studentB.cookie);
    expect(otherRes.status).toBe(404);
  });
});
