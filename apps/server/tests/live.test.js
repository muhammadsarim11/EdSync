import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { ensureRoom, createMeetingToken, deleteRoom } from '../config/daily.js';
import {
  createVerifiedOrgAdmin,
  inviteAndRegister,
  createCohortWithInstructor,
  createLectureForCohort
} from './helpers.js';

const setup = async (lectureOverrides = { type: 'Live' }) => {
  const admin = await createVerifiedOrgAdmin();
  const { cohortId, instructor } = await createCohortWithInstructor(admin);
  const { lectureId } = await createLectureForCohort(cohortId, instructor.cookie, lectureOverrides);
  const student = await inviteAndRegister(admin, { email: 'student@example.com', role: 'Student' });
  return { admin, cohortId, instructor, lectureId, student };
};

const enroll = (admin, cohortId, studentId) =>
  request(app)
    .post(`/api/v1/cohorts/${cohortId}/enrollments`)
    .set('Cookie', admin.cookie)
    .send({ studentIds: [studentId] });

const post = (path, cookie) => request(app).post(path).set('Cookie', cookie);

describe('live class lifecycle', () => {
  it('lets the instructor start, a student join, and the instructor end the class', async () => {
    const { admin, cohortId, instructor, lectureId, student } = await setup();
    await enroll(admin, cohortId, student.userId);

    const start = await post(`/api/v1/lectures/${lectureId}/live/start`, instructor.cookie);
    expect(start.status).toBe(200);
    expect(start.body.data.join.isOwner).toBe(true);
    expect(ensureRoom).toHaveBeenCalledTimes(1);
    expect(createMeetingToken.mock.calls[0][1].isOwner).toBe(true);

    const join = await post(`/api/v1/lectures/${lectureId}/live/join`, student.cookie);
    expect(join.status).toBe(200);
    expect(join.body.data.join.isOwner).toBe(false);
    expect(join.body.data.join.token).toBe('meeting-token');
    expect(join.body.data.join.roomUrl).toContain(`edsync-${lectureId}`);
    expect(createMeetingToken.mock.calls[1][1].isOwner).toBe(false);

    const end = await post(`/api/v1/lectures/${lectureId}/live/end`, instructor.cookie);
    expect(end.status).toBe(200);
    expect(end.body.data.lecture.liveStatus).toBe('ended');
    expect(deleteRoom).toHaveBeenCalledTimes(1);

    const after = await post(`/api/v1/lectures/${lectureId}/live/join`, student.cookie);
    expect(after.status).toBe(409);
  });

  it('blocks students from starting or ending a class', async () => {
    const { admin, cohortId, lectureId, student } = await setup();
    await enroll(admin, cohortId, student.userId);

    expect((await post(`/api/v1/lectures/${lectureId}/live/start`, student.cookie)).status).toBe(403);
    expect((await post(`/api/v1/lectures/${lectureId}/live/end`, student.cookie)).status).toBe(403);
  });

  it('refuses a join before the class has started', async () => {
    const { admin, cohortId, lectureId, student } = await setup();
    await enroll(admin, cohortId, student.userId);

    const res = await post(`/api/v1/lectures/${lectureId}/live/join`, student.cookie);
    expect(res.status).toBe(409);
    expect(createMeetingToken).not.toHaveBeenCalled();
  });

  it('hides the class from a student who is not enrolled', async () => {
    const { instructor, lectureId, student } = await setup();
    await post(`/api/v1/lectures/${lectureId}/live/start`, instructor.cookie);

    const res = await post(`/api/v1/lectures/${lectureId}/live/join`, student.cookie);
    expect(res.status).toBe(404);
  });

  it('rejects non-Live lectures', async () => {
    const { instructor, lectureId } = await setup({ type: 'Recorded' });

    const res = await post(`/api/v1/lectures/${lectureId}/live/start`, instructor.cookie);
    expect(res.status).toBe(400);
  });

  it('blocks an instructor who does not own the cohort', async () => {
    const { admin, lectureId } = await setup();
    const other = await inviteAndRegister(admin, { email: 'other@example.com', role: 'Instructor' });

    const res = await post(`/api/v1/lectures/${lectureId}/live/start`, other.cookie);
    expect(res.status).toBe(404);
  });
});
