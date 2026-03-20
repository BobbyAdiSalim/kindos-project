import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockReq, createMockRes } from '../helpers/mockReqRes.js';

const patientFindOne = vi.fn();
const doctorFindByPk = vi.fn();
const doctorFindOne = vi.fn();
const connectionFindOne = vi.fn();
const connectionFindAll = vi.fn();
const connectionFindByPk = vi.fn();
const connectionCreate = vi.fn();
const messageFindOne = vi.fn();
const messageFindAll = vi.fn();
const messageCount = vi.fn();
const messageCreate = vi.fn();
const messageFindByPk = vi.fn();
const messageUpdate = vi.fn();
const getRoleStrategyMock = vi.fn();

vi.mock('../../models/index.js', () => ({
  User: {},
  Patient: { findOne: patientFindOne },
  Doctor: { findByPk: doctorFindByPk, findOne: doctorFindOne },
  Connection: {
    findOne: connectionFindOne,
    findAll: connectionFindAll,
    findByPk: connectionFindByPk,
    create: connectionCreate,
  },
  Message: {
    findOne: messageFindOne,
    findAll: messageFindAll,
    count: messageCount,
    create: messageCreate,
    findByPk: messageFindByPk,
    update: messageUpdate,
  },
}));

vi.mock('../../services/role-strategy/index.js', () => ({
  getRoleStrategy: getRoleStrategyMock,
}));

describe('chatController', () => {
  beforeEach(() => {
    vi.resetModules();
    patientFindOne.mockReset();
    doctorFindByPk.mockReset();
    doctorFindOne.mockReset();
    connectionFindOne.mockReset();
    connectionFindAll.mockReset();
    connectionFindByPk.mockReset();
    connectionCreate.mockReset();
    messageFindOne.mockReset();
    messageFindAll.mockReset();
    messageCount.mockReset();
    messageCreate.mockReset();
    messageFindByPk.mockReset();
    messageUpdate.mockReset();
    getRoleStrategyMock.mockReset();
  });

  it('sendConnectRequest rejects non-patient roles', async () => {
    const { sendConnectRequest } = await import('../../controllers/other/chatController.js');
    const req = createMockReq({ auth: { userId: 1, role: 'doctor' }, body: { doctorId: 2 } });
    const res = createMockRes();

    await sendConnectRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('sendConnectRequest creates a pending connection', async () => {
    const { sendConnectRequest } = await import('../../controllers/other/chatController.js');

    patientFindOne.mockResolvedValue({ id: 10 });
    doctorFindByPk.mockResolvedValue({ id: 20, verification_status: 'approved' });
    connectionFindOne.mockResolvedValue(null);
    connectionCreate.mockResolvedValue({ id: 99, status: 'pending' });

    const req = createMockReq({ auth: { userId: 1, role: 'patient' }, body: { doctorId: 20 } });
    const res = createMockRes();

    await sendConnectRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(connectionCreate).toHaveBeenCalled();
  });

  it('getMyConnections enriches accepted connections with message metadata', async () => {
    const { getMyConnections } = await import('../../controllers/other/chatController.js');

    getRoleStrategyMock.mockReturnValue({
      getConnectionScope: vi.fn().mockResolvedValue({ where: {}, include: [] }),
      getOtherConnectionUserId: vi.fn().mockReturnValue(8),
    });

    connectionFindAll.mockResolvedValue([
      {
        status: 'accepted',
        toJSON: () => ({ id: 1, status: 'accepted' }),
      },
    ]);

    messageFindOne.mockResolvedValue({ id: 5, content: 'hello' });
    messageCount.mockResolvedValue(2);

    const req = createMockReq({ auth: { userId: 3, role: 'patient' } });
    const res = createMockRes();

    await getMyConnections(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ connections: expect.any(Array) }));
  });

  it('respondToConnection validates status payload', async () => {
    const { respondToConnection } = await import('../../controllers/other/chatController.js');
    const req = createMockReq({
      auth: { userId: 1, role: 'doctor' },
      params: { connectionId: '2' },
      body: { status: 'pending' },
    });
    const res = createMockRes();

    await respondToConnection(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('respondToConnection updates a pending request', async () => {
    const { respondToConnection } = await import('../../controllers/other/chatController.js');

    doctorFindOne.mockResolvedValue({ id: 90 });
    const saveMock = vi.fn().mockResolvedValue(undefined);
    connectionFindOne.mockResolvedValue({ id: 6, status: 'pending', save: saveMock });

    const req = createMockReq({
      auth: { userId: 1, role: 'doctor' },
      params: { connectionId: '6' },
      body: { status: 'accepted' },
    });
    const res = createMockRes();

    await respondToConnection(req, res);

    expect(saveMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('getConversation rejects non-participants', async () => {
    const { getConversation } = await import('../../controllers/other/chatController.js');

    connectionFindByPk.mockResolvedValue({
      id: 1,
      status: 'accepted',
      patient: { user_id: 10 },
      doctor: { user_id: 11 },
    });

    const req = createMockReq({ auth: { userId: 99, role: 'patient' }, params: { connectionId: '1' }, query: {} });
    const res = createMockRes();

    await getConversation(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('sendMessage validates non-empty content', async () => {
    const { sendMessage } = await import('../../controllers/other/chatController.js');

    const req = createMockReq({ auth: { userId: 10 }, params: { connectionId: '1' }, body: { content: '  ' } });
    const res = createMockRes();

    await sendMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('sendMessage sends message for accepted connection participant', async () => {
    const { sendMessage } = await import('../../controllers/other/chatController.js');

    connectionFindByPk.mockResolvedValue({
      id: 1,
      status: 'accepted',
      patient: { user_id: 10 },
      doctor: { user_id: 11 },
    });
    messageCreate.mockResolvedValue({ id: 70 });
    messageFindByPk.mockResolvedValue({ id: 70, content: 'hello' });

    const req = createMockReq({
      auth: { userId: 10 },
      params: { connectionId: '1' },
      body: { content: ' hello ' },
    });
    const res = createMockRes();

    await sendMessage(req, res);

    expect(messageCreate).toHaveBeenCalledWith(expect.objectContaining({ sender_id: 10, receiver_id: 11, content: 'hello' }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('markMessagesRead updates unread count', async () => {
    const { markMessagesRead } = await import('../../controllers/other/chatController.js');

    connectionFindByPk.mockResolvedValue({
      patient: { user_id: 10 },
      doctor: { user_id: 11 },
    });
    messageUpdate.mockResolvedValue([3]);

    const req = createMockReq({ auth: { userId: 10 }, params: { connectionId: '1' } });
    const res = createMockRes();

    await markMessagesRead(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: '3 messages marked as read.' });
  });
});
