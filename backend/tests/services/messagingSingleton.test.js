import { beforeEach, describe, expect, it, vi } from 'vitest';

const socketServerCtor = vi.fn();
const jwtVerify = vi.fn();
const userFindByPk = vi.fn();
const connectionFindByPk = vi.fn();
let ioMockInstance;

vi.mock('socket.io', () => ({
  Server: class MockSocketIOServer {
    constructor(...args) {
      socketServerCtor(...args);
      return ioMockInstance;
    }
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: jwtVerify,
  },
}));

vi.mock('../../models/index.js', () => ({
  User: { findByPk: userFindByPk },
  Connection: { findByPk: connectionFindByPk },
  Patient: {},
  Doctor: {},
}));

const makeIoMock = () => ({
  use: vi.fn(),
  on: vi.fn(),
});

describe('messaging singleton service', () => {
  beforeEach(() => {
    vi.resetModules();
    socketServerCtor.mockReset();
    jwtVerify.mockReset();
    userFindByPk.mockReset();
    connectionFindByPk.mockReset();
  });

  it('getMessagingIO throws before initialization', async () => {
    const { getMessagingIO } = await import('../../services/messaging-singleton/index.js');

    expect(() => getMessagingIO()).toThrow('Messaging Socket.IO is not initialized');
  });

  it('initializes Socket.IO once and returns the same instance', async () => {
    const ioMock = makeIoMock();
    ioMockInstance = ioMock;

    const { initMessagingIO } = await import('../../services/messaging-singleton/index.js');

    const serverRef = { name: 'http' };
    const first = initMessagingIO(serverRef, { frontendUrl: 'http://localhost:5173', jwtSecret: 'secret' });
    const second = initMessagingIO(serverRef, { frontendUrl: 'http://localhost:5173', jwtSecret: 'secret' });

    expect(socketServerCtor).toHaveBeenCalledTimes(1);
    expect(socketServerCtor).toHaveBeenCalledWith(
      serverRef,
      expect.objectContaining({
        cors: expect.objectContaining({ origin: 'http://localhost:5173' }),
      })
    );
    expect(first).toBe(ioMock);
    expect(second).toBe(ioMock);
  });

  it('auth middleware accepts cookie token and sets socket auth', async () => {
    const ioMock = makeIoMock();
    ioMockInstance = ioMock;
    jwtVerify.mockReturnValue({ userId: 9 });
    userFindByPk.mockResolvedValue({ id: 9, role: 'patient' });

    const { initMessagingIO } = await import('../../services/messaging-singleton/index.js');
    initMessagingIO({}, { frontendUrl: 'http://localhost:5173', jwtSecret: 'secret' });

    const middleware = ioMock.use.mock.calls[0][0];
    const socket = {
      handshake: { headers: { cookie: 'foo=bar; utlwa_auth=cookie-token' }, auth: {} },
    };
    const next = vi.fn();

    await middleware(socket, next);

    expect(jwtVerify).toHaveBeenCalledWith('cookie-token', 'secret');
    expect(next).toHaveBeenCalledWith();
    expect(socket.auth).toEqual({ userId: 9, role: 'patient' });
  });

  it('registers connection handlers and processes room events', async () => {
    const ioMock = makeIoMock();
    ioMockInstance = ioMock;
    jwtVerify.mockReturnValue({ userId: 7 });
    userFindByPk.mockResolvedValue({ id: 7, role: 'patient' });
    connectionFindByPk.mockResolvedValue({
      patient: { user_id: 7 },
      doctor: { user_id: 11 },
    });

    const { initMessagingIO } = await import('../../services/messaging-singleton/index.js');
    initMessagingIO({}, { frontendUrl: 'http://localhost:5173', jwtSecret: 'secret' });

    const connectionHandler = ioMock.on.mock.calls.find((c) => c[0] === 'connection')[1];

    const socketHandlers = {};
    const emit = vi.fn();
    const socket = {
      auth: { userId: 7 },
      rooms: new Set(['connection_5']),
      join: vi.fn(),
      leave: vi.fn(),
      on: vi.fn((event, cb) => {
        socketHandlers[event] = cb;
      }),
      to: vi.fn(() => ({ emit })),
    };

    connectionHandler(socket);

    expect(socket.join).toHaveBeenCalledWith('user_7');

    await socketHandlers.join_conversation('5');
    expect(socket.join).toHaveBeenCalledWith('connection_5');

    socketHandlers.leave_conversation('5');
    expect(socket.leave).toHaveBeenCalledWith('connection_5');

    await socketHandlers.send_message({ connectionId: '5', message: { id: 55 } });
    expect(socket.to).toHaveBeenCalledWith('connection_5');
    expect(emit).toHaveBeenCalledWith('new_message', { id: 55 });

    socketHandlers.typing({ connectionId: '5' });
    expect(emit).toHaveBeenCalledWith('user_typing', { userId: 7 });

    socketHandlers.stop_typing({ connectionId: '5' });
    expect(emit).toHaveBeenCalledWith('user_stop_typing', { userId: 7 });
  });
});
