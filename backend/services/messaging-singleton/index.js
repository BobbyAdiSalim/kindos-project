/* Singleton Pattern for Messaging Socket.IO Server

Singleton pattern is used here to ensure that only one instance of Socket.IO server exists
throughout the app, as clients has to connect to the same server where connection is initialized.
The purpose of this singleton is to manage the Socket.IO server instance and its connection
handlers in one place, ensuring consistency and preventing issues that may arise from multiple instances.

Extensibility and Maintainability:
- All Socket.IO functionalities is encapsulated in one singleton, making it easier to modify for future uses.
- Adding event handlers or modifying existing ones can be done by editing this file without affecting 
  other parts of the codebase.

Problem on current implementation:
- If server is running in multiple instances, singleton will not work as intended as each instance 
  will have its own socket.io server. However, that is out of scope for this current sprint.
  For now, assume server is running in single instance. 
*/

import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User, Connection, Patient, Doctor } from '../../models/index.js';

let ioInstance = null;

const cleanEnv = (value, fallback = undefined) => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).replace(/\r/g, '').trim();
};

const AUTH_COOKIE_NAME = cleanEnv(process.env.AUTH_COOKIE_NAME, '__session');

const getCookieValue = (cookieHeader, name) => {
  if (typeof cookieHeader !== 'string' || !cookieHeader.trim()) return null;

  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [rawKey, ...rawValueParts] = cookie.trim().split('=');
    if (rawKey !== name) continue;
    const rawValue = rawValueParts.join('=');
    return rawValue ? decodeURIComponent(rawValue) : null;
  }

  return null;
};

const verifyConnectionMembership = async (userId, connectionId) => {
  const id = Number(connectionId);
  if (!Number.isInteger(id) || id <= 0) return false;

  const connection = await Connection.findByPk(id, {
    include: [
      { model: Patient, as: 'patient', attributes: ['user_id'] },
      { model: Doctor, as: 'doctor', attributes: ['user_id'] },
    ],
  });

  if (!connection) return false;
  return connection.patient?.user_id === userId || connection.doctor?.user_id === userId;
};

const registerSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    const { userId } = socket.auth;

    socket.join(`user_${userId}`);

    socket.on('join_conversation', async (connectionId) => {
      if (await verifyConnectionMembership(userId, connectionId)) {
        socket.join(`connection_${connectionId}`);
      }
    });

    socket.on('leave_conversation', (connectionId) => {
      socket.leave(`connection_${connectionId}`);
    });

    socket.on('send_message', async (data) => {
      const { connectionId, message } = data;
      if (await verifyConnectionMembership(userId, connectionId)) {
        socket.to(`connection_${connectionId}`).emit('new_message', message);
      }
    });

    socket.on('typing', (data) => {
      const { connectionId } = data;
      if (socket.rooms.has(`connection_${connectionId}`)) {
        socket.to(`connection_${connectionId}`).emit('user_typing', { userId });
      }
    });

    socket.on('stop_typing', (data) => {
      const { connectionId } = data;
      if (socket.rooms.has(`connection_${connectionId}`)) {
        socket.to(`connection_${connectionId}`).emit('user_stop_typing', { userId });
      }
    });
  });
};

export const initMessagingIO = (httpServer, { frontendUrl, jwtSecret }) => {
  if (ioInstance) return ioInstance;

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token =
        getCookieValue(socket.handshake.headers.cookie, AUTH_COOKIE_NAME) ||
        socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required.'));
      }

      const payload = jwt.verify(token, jwtSecret);
      const user = await User.findByPk(payload.userId);
      if (!user) {
        return next(new Error('Authentication failed.'));
      }

      socket.auth = { userId: user.id, role: user.role };
      next();
    } catch {
      next(new Error('Invalid or expired token.'));
    }
  });

  registerSocketHandlers(io);
  ioInstance = io;
  return ioInstance;
};

export const getMessagingIO = () => {
  if (!ioInstance) {
    throw new Error('Messaging Socket.IO is not initialized. Call initMessagingIO first.');
  }
  return ioInstance;
};
