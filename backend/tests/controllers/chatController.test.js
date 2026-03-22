import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockReq, createMockRes } from '../helpers/mockReqRes.js';

const doctorFindOne = vi.fn();
const connectionFindOne = vi.fn();
const connectionFindAll = vi.fn();
const connectionFindByPk = vi.fn();
const messageFindOne = vi.fn();
const messageFindAll = vi.fn();
const messageCount = vi.fn();
const messageCreate = vi.fn();
const messageFindByPk = vi.fn();
const messageUpdate = vi.fn();
const getRoleStrategyMock = vi.fn();

vi.mock('../../models/index.js', () => ({
  User: {},
  Patient: {},
  Doctor: { findOne: doctorFindOne },
  Connection: {
    findOne: connectionFindOne,
    findAll: connectionFindAll,
    findByPk: connectionFindByPk,
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
    doctorFindOne.mockReset();
    connectionFindOne.mockReset();
    connectionFindAll.mockReset();
    connectionFindByPk.mockReset();
    messageFindOne.mockReset();
    messageFindAll.mockReset();
    messageCount.mockReset();
    messageCreate.mockReset();
    messageFindByPk.mockReset();
    messageUpdate.mockReset();
    getRoleStrategyMock.mockReset();
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

  it('getMyConnections forwards role strategy auth errors', async () => {
    const { getMyConnections } = await import('../../controllers/other/chatController.js');

    getRoleStrategyMock.mockReturnValue({
      getConnectionScope: vi.fn().mockRejectedValue({ status: 403, message: 'Forbidden role' }),
      getOtherConnectionUserId: vi.fn(),
    });

    const req = createMockReq({ auth: { userId: 3, role: 'patient' } });
    const res = createMockRes();

    await getMyConnections(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden role' });
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

  it('getConversation returns messages for a valid participant', async () => {
    const { getConversation } = await import('../../controllers/other/chatController.js');

    connectionFindByPk.mockResolvedValue({
      id: 1,
      patient: { user_id: 10, id: 1, full_name: 'Pat' },
      doctor: { user_id: 11, id: 2, full_name: 'Doc' },
    });
    messageFindAll.mockResolvedValue([
      { id: 2, content: 'new' },
      { id: 1, content: 'old' },
    ]);

    const req = createMockReq({ auth: { userId: 10, role: 'patient' }, params: { connectionId: '1' }, query: { limit: '20', before: '99' } });
    const res = createMockRes();

    await getConversation(req, res);

    expect(messageFindAll).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('getConversation returns 404 when connection is missing', async () => {
    const { getConversation } = await import('../../controllers/other/chatController.js');

    connectionFindByPk.mockResolvedValue(null);

    const req = createMockReq({ auth: { userId: 10, role: 'patient' }, params: { connectionId: '1' }, query: {} });
    const res = createMockRes();

    await getConversation(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
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

  it('sendMessage blocks patients until doctor initiates', async () => {
    const { sendMessage } = await import('../../controllers/other/chatController.js');

    connectionFindByPk.mockResolvedValue({
      id: 1,
      status: 'accepted',
      patient: { user_id: 10 },
      doctor: { user_id: 11 },
    });
    messageCount.mockResolvedValue(0);

    const req = createMockReq({
      auth: { userId: 10 },
      params: { connectionId: '1' },
      body: { content: 'hello' },
    });
    const res = createMockRes();

    await sendMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('sendMessage returns 404 when connection does not exist', async () => {
    const { sendMessage } = await import('../../controllers/other/chatController.js');

    connectionFindByPk.mockResolvedValue(null);

    const req = createMockReq({
      auth: { userId: 10 },
      params: { connectionId: '999' },
      body: { content: 'hello' },
    });
    const res = createMockRes();

    await sendMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('sendMessage returns 403 for users outside the connection', async () => {
    const { sendMessage } = await import('../../controllers/other/chatController.js');

    connectionFindByPk.mockResolvedValue({
      id: 1,
      patient: { user_id: 10 },
      doctor: { user_id: 11 },
    });

    const req = createMockReq({
      auth: { userId: 99 },
      params: { connectionId: '1' },
      body: { content: 'hello' },
    });
    const res = createMockRes();

    await sendMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('sendMessage validates doctor file type', async () => {
    const { sendMessage } = await import('../../controllers/other/chatController.js');

    connectionFindByPk.mockResolvedValue({
      id: 1,
      patient: { user_id: 10 },
      doctor: { user_id: 11 },
    });

    const req = createMockReq({
      auth: { userId: 11 },
      params: { connectionId: '1' },
      body: {
        file: { data: 'Zm9v', name: 'malware.exe', type: 'application/x-msdownload' },
      },
    });
    const res = createMockRes();

    await sendMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('sendMessage returns 503 when doctor uploads and file storage is not configured', async () => {
    const { sendMessage } = await import('../../controllers/other/chatController.js');

    connectionFindByPk.mockResolvedValue({
      id: 1,
      patient: { user_id: 10 },
      doctor: { user_id: 11 },
    });

    const req = createMockReq({
      auth: { userId: 11 },
      params: { connectionId: '1' },
      body: {
        file: { data: 'Zm9v', name: 'report.pdf', type: 'application/pdf' },
      },
    });
    const res = createMockRes();

    await sendMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
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

  it('downloadChatDocument enforces connection/message/storage guards', async () => {
    const { downloadChatDocument } = await import('../../controllers/other/chatController.js');

    const res404Conn = createMockRes();
    connectionFindByPk.mockResolvedValueOnce(null);
    await downloadChatDocument(
      createMockReq({ auth: { userId: 10 }, params: { connectionId: '1', messageId: '2' } }),
      res404Conn
    );
    expect(res404Conn.status).toHaveBeenCalledWith(404);

    const res403 = createMockRes();
    connectionFindByPk.mockResolvedValueOnce({
      patient: { user_id: 1 },
      doctor: { user_id: 2 },
    });
    await downloadChatDocument(
      createMockReq({ auth: { userId: 10 }, params: { connectionId: '1', messageId: '2' } }),
      res403
    );
    expect(res403.status).toHaveBeenCalledWith(403);

    const res404Doc = createMockRes();
    connectionFindByPk.mockResolvedValueOnce({
      patient: { user_id: 10 },
      doctor: { user_id: 11 },
    });
    messageFindByPk.mockResolvedValueOnce(null);
    await downloadChatDocument(
      createMockReq({ auth: { userId: 10 }, params: { connectionId: '1', messageId: '2' } }),
      res404Doc
    );
    expect(res404Doc.status).toHaveBeenCalledWith(404);

    const res503 = createMockRes();
    connectionFindByPk.mockResolvedValueOnce({
      patient: { user_id: 10 },
      doctor: { user_id: 11 },
    });
    messageFindByPk.mockResolvedValueOnce({
      sender_id: 10,
      receiver_id: 11,
      file_url: 'r2:some/key',
      file_name: 'doc.pdf',
      file_type: 'application/pdf',
    });
    await downloadChatDocument(
      createMockReq({ auth: { userId: 10 }, params: { connectionId: '1', messageId: '2' } }),
      res503
    );
    expect(res503.status).toHaveBeenCalledWith(503);

    const resWrongConversation = createMockRes();
    connectionFindByPk.mockResolvedValueOnce({
      patient: { user_id: 10 },
      doctor: { user_id: 11 },
    });
    messageFindByPk.mockResolvedValueOnce({
      sender_id: 777,
      receiver_id: 888,
      file_url: 'r2:some/key',
      file_name: 'doc.pdf',
      file_type: 'application/pdf',
    });
    await downloadChatDocument(
      createMockReq({ auth: { userId: 10 }, params: { connectionId: '1', messageId: '2' } }),
      resWrongConversation
    );
    expect(resWrongConversation.status).toHaveBeenCalledWith(403);
  });

  it('markMessagesRead returns 404/403 for invalid access', async () => {
    const { markMessagesRead } = await import('../../controllers/other/chatController.js');

    connectionFindByPk.mockResolvedValueOnce(null);
    const missingRes = createMockRes();
    await markMessagesRead(createMockReq({ auth: { userId: 1 }, params: { connectionId: '1' } }), missingRes);
    expect(missingRes.status).toHaveBeenCalledWith(404);

    connectionFindByPk.mockResolvedValueOnce({
      patient: { user_id: 5 },
      doctor: { user_id: 6 },
    });
    const forbiddenRes = createMockRes();
    await markMessagesRead(createMockReq({ auth: { userId: 1 }, params: { connectionId: '1' } }), forbiddenRes);
    expect(forbiddenRes.status).toHaveBeenCalledWith(403);
  });
});
