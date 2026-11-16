import { Queue } from 'bullmq';
import { producerConnection } from '../config/redis.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendInvitationEmail,
  sendRecordingReadyEmail
} from '../utils/email.js';

const isTestEnv = () => process.env.NODE_ENV === 'test';

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { age: 24 * 60 * 60 },
  removeOnFail: { age: 7 * 24 * 60 * 60 }
};

// Constructing a BullMQ Queue opens a Redis connection immediately, which
// tests must never require - so the Queue itself is only ever created from
// enqueue() below, never at module load time.
let emailQueue;
const getEmailQueue = () => {
  if (!emailQueue) {
    emailQueue = new Queue('email', { connection: producerConnection, defaultJobOptions });
  }
  return emailQueue;
};

// Every call site treats these as a best-effort notification fired after
// its own database write already succeeded - a dead Redis (or any other
// enqueue failure) must never turn that already-successful request into a
// 500 for the client, so failures are logged here and swallowed, not
// thrown. producerConnection is tuned to fail this within ~5s rather than
// hang the request indefinitely.
const enqueue = async (jobName, data) => {
  try {
    await getEmailQueue().add(jobName, data);
  } catch (err) {
    console.error(`Failed to enqueue "${jobName}" email job:`, err.message);
  }
};

export const queueVerificationEmail = async (email, code) => {
  if (isTestEnv()) {
    return sendVerificationEmail(email, code);
  }
  return enqueue('verification', { email, code });
};

export const queuePasswordResetEmail = async (email, code) => {
  if (isTestEnv()) {
    return sendPasswordResetEmail(email, code);
  }
  return enqueue('password-reset', { email, code });
};

export const queueInvitationEmail = async (email, inviteLink, orgName, role) => {
  if (isTestEnv()) {
    return sendInvitationEmail(email, inviteLink, orgName, role);
  }
  return enqueue('invitation', { email, inviteLink, orgName, role });
};

// One job per recipient (addBulk), so a single bad address retries on its
// own instead of re-sending to the whole cohort.
export const queueRecordingReadyEmails = async (emails, lectureTitle, cohortTitle, link) => {
  if (emails.length === 0) return;
  if (isTestEnv()) {
    await Promise.all(emails.map((email) => sendRecordingReadyEmail(email, lectureTitle, cohortTitle, link)));
    return;
  }
  try {
    await getEmailQueue().addBulk(
      emails.map((email) => ({ name: 'recording-ready', data: { email, lectureTitle, cohortTitle, link } }))
    );
  } catch (err) {
    console.error('Failed to enqueue "recording-ready" email jobs:', err.message);
  }
};
