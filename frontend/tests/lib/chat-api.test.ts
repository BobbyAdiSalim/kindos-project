import {
  getConversation,
  getMyConnections,
  getPendingRequests,
  markMessagesRead,
  respondToConnection,
  sendConnectRequest,
  sendMessageApi,
} from '@/app/lib/chat-api';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('chat-api', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('requires auth token', async () => {
    await expect(getMyConnections(null)).rejects.toThrow('Authentication required.');
  });

  it('sends connection request', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'sent', connection: { id: 1 } }));

    const result = await sendConnectRequest('cookie-session', 8);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/chat/connect',
      expect.objectContaining({ method: 'POST' })
    );
    expect(result.connection.id).toBe(1);
  });

  it('loads connections and pending requests', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ connections: [{ id: 1 }] }))
      .mockResolvedValueOnce(jsonResponse({ requests: [{ id: 2 }] }));

    const connections = await getMyConnections('cookie-session');
    const requests = await getPendingRequests('cookie-session');

    expect(connections.connections[0].id).toBe(1);
    expect(requests.requests[0].id).toBe(2);
  });

  it('responds to connection and sends messages', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: 'ok', connection: { id: 3 } }))
      .mockResolvedValueOnce(jsonResponse({ message: { id: 9 } }))
      .mockResolvedValueOnce(jsonResponse({ message: 'read' }));

    const response = await respondToConnection('cookie-session', 3, 'accepted');
    const sent = await sendMessageApi('cookie-session', 3, 'Hello');
    const read = await markMessagesRead('cookie-session', 3);

    expect(response.connection.id).toBe(3);
    expect(sent.message.id).toBe(9);
    expect(read.message).toBe('read');
  });

  it('builds conversation query params with limit and before', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ messages: [], connection: { id: 1, status: 'accepted' } }));

    await getConversation('cookie-session', 1, { limit: 25, before: 90 });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/chat/messages/1?limit=25&before=90',
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('throws backend error messages', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Not allowed' }, 403));

    await expect(sendMessageApi('cookie-session', 1, 'x')).rejects.toThrow('Not allowed');
  });
});
