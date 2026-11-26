import crypto from 'crypto';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { sendRecordingReadyEmail } from '../utils/email.js';
import {
  createVerifiedOrgAdmin,
  inviteAndRegister,
  createCohortWithInstructor,
  createLectureForCohort
} from './helpers.js';

const SECRET = process.env.CLOUDINARY_API_SECRET;

const webhook = (
  body,
  { secret = SECRET, timestamp = Math.floor(Date.now() / 1000), signature, algorithm = 'sha1' } = {}
) => {
  const raw = JSON.stringify(body);
  const sig = signature ?? crypto.createHash(algorithm).update(`${raw}${timestamp}${secret}`).digest('hex');
  return request(app)
    .post('/api/v1/webhooks/cloudinary')
    .set('Content-Type', 'application/json')
    .set('X-Cld-Timestamp', String(timestamp))
    .set('X-Cld-Signature', sig)
    .send(raw);
};

const setup = async () => {
  const admin = await createVerifiedOrgAdmin();
  const { cohortId, instructor } = await createCohortWithInstructor(admin);
  const { lectureId } = await createLectureForCohort(cohortId, instructor.cookie);
  return { admin, cohortId, instructor, lectureId };
};

const uploadPayload = (organizationId, lectureId, overrides = {}) => ({
  notification_type: 'upload',
  resource_type: 'video',
  public_id: `edsync/${organizationId}/lectures/${lectureId}`,
  secure_url: 'https://res.cloudinary.com/test-cloud/video/upload/v1/rec.mp4',
  duration: 3605,
  ...overrides
});

describe('POST /api/v1/lectures/:id/recording/signature', () => {
  it('returns a signed upload payload and marks the lecture pending', async () => {
    const { admin, instructor, lectureId } = await setup();

    const res = await request(app)
      .post(`/api/v1/lectures/${lectureId}/recording/signature`)
      .set('Cookie', instructor.cookie);

    expect(res.status).toBe(200);
    const { upload } = res.body.data;
    expect(upload.public_id).toBe(`edsync/${admin.organizationId}/lectures/${lectureId}`);
    expect(upload.uploadUrl).toContain('/test-cloud/video/upload');
    expect(upload.signature).toMatch(/^[a-f0-9]{40}$/);
    expect(JSON.stringify(res.body)).not.toContain(SECRET);

    const lecture = await request(app).get(`/api/v1/lectures/${lectureId}`).set('Cookie', instructor.cookie);
    expect(lecture.body.data.lecture.recordingStatus).toBe('pending');
  });

  it('blocks a Student', async () => {
    const { admin, lectureId } = await setup();
    const student = await inviteAndRegister(admin, { email: 'student@example.com', role: 'Student' });

    const res = await request(app)
      .post(`/api/v1/lectures/${lectureId}/recording/signature`)
      .set('Cookie', student.cookie);
    expect(res.status).toBe(403);
  });

  it('blocks an instructor who does not own the cohort', async () => {
    const { admin, lectureId } = await setup();
    const other = await inviteAndRegister(admin, { email: 'other@example.com', role: 'Instructor' });

    const res = await request(app)
      .post(`/api/v1/lectures/${lectureId}/recording/signature`)
      .set('Cookie', other.cookie);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/v1/webhooks/cloudinary', () => {
  it('marks the recording ready and emails enrolled students exactly once', async () => {
    const { admin, cohortId, instructor, lectureId } = await setup();
    const student = await inviteAndRegister(admin, { email: 'student@example.com', role: 'Student' });
    await request(app)
      .post(`/api/v1/cohorts/${cohortId}/enrollments`)
      .set('Cookie', admin.cookie)
      .send({ studentIds: [student.userId] });

    const body = uploadPayload(admin.organizationId, lectureId);
    expect((await webhook(body)).status).toBe(200);
    expect((await webhook(body)).status).toBe(200); // retried delivery

    const lecture = await request(app).get(`/api/v1/lectures/${lectureId}`).set('Cookie', instructor.cookie);
    expect(lecture.body.data.lecture.recordingStatus).toBe('ready');
    expect(lecture.body.data.lecture.recordingUrl).toBe(body.secure_url);
    expect(lecture.body.data.lecture.durationInMinutes).toBe(60);

    expect(sendRecordingReadyEmail).toHaveBeenCalledTimes(1);
    expect(sendRecordingReadyEmail.mock.calls[0][0]).toBe('student@example.com');
  });

  it('accepts a SHA-256 signed webhook', async () => {
    const { admin, lectureId } = await setup();
    const res = await webhook(uploadPayload(admin.organizationId, lectureId), { algorithm: 'sha256' });
    expect(res.status).toBe(200);
  });

  it('rejects a bad signature and a stale timestamp', async () => {
    const { admin, lectureId } = await setup();
    const body = uploadPayload(admin.organizationId, lectureId);

    expect((await webhook(body, { secret: 'wrong-secret' })).status).toBe(401);
    expect((await webhook(body, { timestamp: Math.floor(Date.now() / 1000) - 3 * 60 * 60 })).status).toBe(
      401
    );
    expect((await webhook(body, { signature: 'abc' })).status).toBe(401);
  });

  it('ignores an asset whose tenant does not match the lecture', async () => {
    const { lectureId, instructor } = await setup();
    const foreignOrg = 'a'.repeat(24);

    const res = await webhook(uploadPayload(foreignOrg, lectureId));
    expect(res.status).toBe(200);

    const lecture = await request(app).get(`/api/v1/lectures/${lectureId}`).set('Cookie', instructor.cookie);
    expect(lecture.body.data.lecture.recordingStatus).toBe('none');
    expect(sendRecordingReadyEmail).not.toHaveBeenCalled();
  });
});
