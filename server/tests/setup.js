import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-do-not-use-in-production';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_APP_PASS = 'test-app-password';
process.env.CLIENT_URL = 'http://localhost:3000';

vi.mock('../utils/email.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined)
}));

let mongod;

beforeAll(async () => {
  // CI provides a real Mongo service container (fast, no binary download).
  // Local dev falls back to an in-memory server for a zero-setup workflow.
  const uri = process.env.MONGO_TEST_URI;
  if (uri) {
    await mongoose.connect(uri);
  } else {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  }
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
  vi.clearAllMocks();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});
