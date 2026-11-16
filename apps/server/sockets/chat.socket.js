import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { parseCookie } from 'cookie';
import { resolveUserFromToken } from '../middlewares/auth.middleware.js';
import Message from '../models/message.model.js';
import { findCohortOrFail, assertCanViewCohort } from '../services/cohort.service.js';

const HISTORY_LIMIT = 50;
const roomName = (cohortId) => `cohort:${cohortId}`;

const shapeMessage = (message) => ({
  id: message._id,
  cohortId: message.cohortId,
  senderId: message.senderId._id ?? message.senderId,
  senderName: message.senderId.name,
  content: message.content,
  createdAt: message.createdAt
});

export const initChatSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const cookies = parseCookie(socket.handshake.headers.cookie || '');
      const user = await resolveUserFromToken(cookies.jwt);
      socket.user = {
        id: user._id.toString(),
        organizationId: user.organizationId.toString(),
        role: user.role
      };
      next();
    } catch (err) {
      next(new Error(err.message || 'Authentication required.'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join-cohort', async (cohortId, callback) => {
      const ack = typeof callback === 'function' ? callback : () => {};
      try {
        if (!mongoose.isValidObjectId(cohortId)) {
          throw new Error('A valid cohortId is required.');
        }

        const cohort = await findCohortOrFail({ cohortId, organizationId: socket.user.organizationId });
        await assertCanViewCohort(cohort, socket.user);

        socket.join(roomName(cohortId));

        const history = await Message.find({ cohortId: cohort._id })
          .sort({ createdAt: -1 })
          .limit(HISTORY_LIMIT)
          .populate('senderId', 'name');

        ack({ status: 'ok', history: history.reverse().map(shapeMessage) });
      } catch (err) {
        ack({ status: 'error', message: err.message });
      }
    });

    socket.on('send-message', async ({ cohortId, content } = {}, callback) => {
      const ack = typeof callback === 'function' ? callback : () => {};
      try {
        if (!mongoose.isValidObjectId(cohortId)) {
          throw new Error('A valid cohortId is required.');
        }
        // Authorization was already checked on join-cohort; requiring room
        // membership here (rather than re-checking the cohort on every
        // message) is the standard, accepted tradeoff for a chat feature -
        // a mid-session suspension takes effect on the socket's next
        // reconnect, not mid-room.
        if (!socket.rooms.has(roomName(cohortId))) {
          throw new Error('Join the cohort room before sending messages.');
        }
        if (!content || !content.trim()) {
          throw new Error('content is required.');
        }

        const message = await Message.create({
          organizationId: socket.user.organizationId,
          cohortId,
          senderId: socket.user.id,
          content: content.trim()
        });
        await message.populate('senderId', 'name');

        const payload = shapeMessage(message);
        io.to(roomName(cohortId)).emit('new-message', payload);
        ack({ status: 'ok', message: payload });
      } catch (err) {
        ack({ status: 'error', message: err.message });
      }
    });
  });

  return io;
};
