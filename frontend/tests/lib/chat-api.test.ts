import {
  getChatDocumentUrl,
  getConversation,
  getMyConnections,
  markMessagesRead,
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

  it('loads connections', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ connections: [{ id: 1 }] }));

    const connections = await getMyConnections('cookie-session');

    expect(connections.connections[0].id).toBe(1);
  });

  it('sends messages and marks as read', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: { id: 9 } }))
      .mockResolvedValueOnce(jsonResponse({ message: 'read' }));

    const sent = await sendMessageApi('cookie-session', 3, 'Hello');
    const read = await markMessagesRead('cookie-session', 3);

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

  it('builds document download url', () => {
    expect(getChatDocumentUrl(11, 22)).toBe('/api/chat/messages/11/document/22');
  });
});
