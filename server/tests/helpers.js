import request from 'supertest';
import app from '../app.js';
import { sendVerificationEmail, sendInvitationEmail } from '../utils/email.js';

export const lastCodeSentTo = (mockFn) => mockFn.mock.calls.at(-1)[1];

export const lastInviteTokenSent = () => {
  const inviteLink = sendInvitationEmail.mock.calls.at(-1)[1];
  return new URL(inviteLink).searchParams.get('token');
};

const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const createVerifiedOrgAdmin = async (overrides = {}) => {
  const id = unique();
  const orgName = overrides.orgName || `Institute ${id}`;
  const adminName = overrides.adminName || 'Ada Admin';
  const email = overrides.email || `admin-${id}@example.com`;
  const password = overrides.password || 'adminPassword123';

  const registerRes = await request(app)
    .post('/api/v1/organizations')
    .send({ orgName, adminName, email, password });

  const organizationId = registerRes.body.data.organization.id;
  const code = lastCodeSentTo(sendVerificationEmail);

  await request(app).post('/api/v1/auth/verify-email').send({ email, organizationId, code });

  const loginRes = await request(app).post('/api/v1/auth/login').send({ email, password, organizationId });

  return { organizationId, email, password, cookie: loginRes.headers['set-cookie'], orgName };
};

export const inviteAndRegister = async (
  admin,
  { name = 'New User', email, role, password = 'password123' }
) => {
  await request(app).post('/api/v1/invitations').set('Cookie', admin.cookie).send({ email, role });
  const inviteToken = lastInviteTokenSent();

  const res = await request(app).post('/api/v1/auth/register').send({ name, email, password, inviteToken });

  // /auth/register's response comes straight from createSendToken, which
  // serializes the raw Mongoose document (_id), unlike the shaped `id`
  // fields returned by the organization/invitation/user-management APIs.
  return { res, userId: res.body.data.user._id, email, password, cookie: res.headers['set-cookie'] };
};

export const createCohortWithInstructor = async (admin, overrides = {}) => {
  const instructor = await inviteAndRegister(admin, {
    email: overrides.instructorEmail || `instructor-${unique()}@example.com`,
    role: 'Instructor'
  });

  const res = await request(app)
    .post('/api/v1/cohorts')
    .set('Cookie', admin.cookie)
    .send({
      title: overrides.title || 'Test Cohort',
      startDate: overrides.startDate || new Date().toISOString(),
      instructorId: instructor.userId,
      ...overrides.cohortBody
    });

  return { res, cohortId: res.body.data?.cohort?.id, instructor };
};
