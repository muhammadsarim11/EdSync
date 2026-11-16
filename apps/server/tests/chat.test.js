import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import request from 'supertest';
import { io as ioClient } from 'socket.io-client';
import app from '../app.js';
import { initChatSocket } from '../sockets/chat.socket.js';
import { createVerifiedOrgAdmin, inviteAndRegister, createCohortWithInstructor } from './helpers.js';

let server;
let port;

beforeAll(async () => {
  server = http.createServer(app);
  initChatSocket(server);
  await new Promise((resolve) => server.listen(0, resolve));
  port = server.address().port;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

const cookieHeader = (setCookieArray) => setCookieArray.map((c) => c.split(';')[0]).join('; ');

const connectClient = (cookie) =>
  ioClient(`http://localhost:${port}`, {
    extraHeaders: { Cookie: cookie },
    forceNew: true
  });

const waitFor = (socket, event) => new Promise((resolve) => socket.once(event, resolve));

const emitAck = (socket, event, ...args) => new Promise((resolve) => socket.emit(event, ...args, resolve));

describe('chat socket handshake auth', () => {
  it('rejects a connection with no session cookie', async () => {
    const client = connectClient('');
    const err = await waitFor(client, 'connect_error');
    expect(err.message).toBeTruthy();
    client.close();
  });

  it('accepts a connection with a valid session cookie', async () => {
    const admin = await createVerifiedOrgAdmin();
    const client = connectClient(cookieHeader(admin.cookie));
    await waitFor(client, 'connect');
    expect(client.connected).toBe(true);
    client.close();
  });
});

describe('join-cohort and send-message', () => {
  it('lets an enrolled student and the owning instructor join, blocks an outsider, and broadcasts a message', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const student = await inviteAndRegister(admin, { email: 'student@example.com', role: 'Student' });
    await request(app)
      .post(`/api/v1/cohorts/${cohortId}/enrollments`)
      .set('Cookie', admin.cookie)
      .send({ studentIds: [student.userId] });
    const outsider = await inviteAndRegister(admin, { email: 'outsider@example.com', role: 'Instructor' });

    const studentClient = connectClient(cookieHeader(student.cookie));
    const instructorClient = connectClient(cookieHeader(instructor.cookie));
    const outsiderClient = connectClient(cookieHeader(outsider.cookie));
    await Promise.all([
      waitFor(studentClient, 'connect'),
      waitFor(instructorClient, 'connect'),
      waitFor(outsiderClient, 'connect')
    ]);

    const outsiderJoin = await emitAck(outsiderClient, 'join-cohort', cohortId);
    expect(outsiderJoin.status).toBe('error');

    const studentJoin = await emitAck(studentClient, 'join-cohort', cohortId);
    expect(studentJoin.status).toBe('ok');
    expect(studentJoin.history).toEqual([]);

    const instructorJoin = await emitAck(instructorClient, 'join-cohort', cohortId);
    expect(instructorJoin.status).toBe('ok');

    const broadcastPromise = waitFor(instructorClient, 'new-message');
    const sendResult = await emitAck(studentClient, 'send-message', { cohortId, content: 'Hello!' });
    expect(sendResult.status).toBe('ok');
    expect(sendResult.message.content).toBe('Hello!');

    const broadcast = await broadcastPromise;
    expect(broadcast.content).toBe('Hello!');
    expect(broadcast.senderName).toBeDefined();

    studentClient.close();
    instructorClient.close();
    outsiderClient.close();
  }, 15000);

  it('blocks sending a message without joining the room first', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const client = connectClient(cookieHeader(instructor.cookie));
    await waitFor(client, 'connect');

    const res = await emitAck(client, 'send-message', { cohortId, content: 'Hi' });
    expect(res.status).toBe('error');

    client.close();
  });

  it('returns joined messages as history on a later join', async () => {
    const admin = await createVerifiedOrgAdmin();
    const { cohortId, instructor } = await createCohortWithInstructor(admin);
    const firstClient = connectClient(cookieHeader(instructor.cookie));
    await waitFor(firstClient, 'connect');
    await emitAck(firstClient, 'join-cohort', cohortId);
    await emitAck(firstClient, 'send-message', { cohortId, content: 'First message' });
    firstClient.close();

    const secondClient = connectClient(cookieHeader(instructor.cookie));
    await waitFor(secondClient, 'connect');
    const joinResult = await emitAck(secondClient, 'join-cohort', cohortId);
    expect(joinResult.history).toHaveLength(1);
    expect(joinResult.history[0].content).toBe('First message');

    secondClient.close();
  }, 15000);
});
