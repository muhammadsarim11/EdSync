import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-do-not-use-in-production';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_APP_PASS = 'test-app-password';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-api-key';
process.env.CLOUDINARY_API_SECRET = 'test-api-secret';

process.env.DAILY_API_KEY = 'test-daily-key';
process.env.DAILY_DOMAIN = 'test-domain';

vi.mock('../config/daily.js', async (importOriginal) => ({
  ...(await importOriginal()),
  ensureRoom: vi.fn().mockResolvedValue('https://test-domain.daily.co/room'),
  createMeetingToken: vi.fn().mockResolvedValue('meeting-token'),
  deleteRoom: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../utils/email.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
  sendRecordingReadyEmail: vi.fn().mockResolvedValue(undefined)
}));

let replSet;

beforeAll(async () => {
  // A replica set (even a single node) is required for multi-document
  // transactions, which invite-acceptance relies on. An external
  // MONGO_TEST_URI is assumed to already be a replica set/Atlas cluster;
  // otherwise spin up an ephemeral one-node replica set for the run.
  const uri = process.env.MONGO_TEST_URI;
  if (uri) {
    await mongoose.connect(uri);
  } else {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());
  }
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
  vi.clearAllMocks();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (replSet) await replSet.stop();
});
