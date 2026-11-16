import dotenv from 'dotenv';
dotenv.config();

import { Worker } from 'bullmq';
import connection from '../config/redis.js';
import validateEnv from '../config/validateEnv.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendInvitationEmail,
  sendRecordingReadyEmail
} from '../utils/email.js';

validateEnv();

const jobHandlers = {
  verification: (data) => sendVerificationEmail(data.email, data.code),
  'password-reset': (data) => sendPasswordResetEmail(data.email, data.code),
  invitation: (data) => sendInvitationEmail(data.email, data.inviteLink, data.orgName, data.role),
  'recording-ready': (data) =>
    sendRecordingReadyEmail(data.email, data.lectureTitle, data.cohortTitle, data.link)
};

const worker = new Worker(
  'email',
  async (job) => {
    const handler = jobHandlers[job.name];
    if (!handler) {
      throw new Error(`Unknown email job type: ${job.name}`);
    }
    await handler(job.data);
  },
  { connection }
);

worker.on('completed', (job) => {
  console.log(`Email job ${job.id} (${job.name}) completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Email job ${job?.id} (${job?.name}) failed: ${err.message}`);
});

console.log('Email worker started, waiting for jobs...');
