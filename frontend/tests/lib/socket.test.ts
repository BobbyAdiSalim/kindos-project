import { beforeEach, describe, expect, it, vi } from 'vitest';

const ioMock = vi.fn();

vi.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => ioMock(...args),
}));

describe('socket lib', () => {
  beforeEach(() => {
    vi.resetModules();
    ioMock.mockReset();
  });

  it('creates and returns a socket connection', async () => {
    const socketMock = {
      connected: false,
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      disconnect: vi.fn(),
    };
    ioMock.mockReturnValue(socketMock);

    const { getSocket } = await import('@/app/lib/socket');
    const socket = getSocket();

    expect(socket).toBe(socketMock);
    expect(ioMock).toHaveBeenCalledWith(window.location.origin, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
  });

  it('reuses connected socket and disconnects cleanly', async () => {
    const socketMock = {
      connected: true,
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      disconnect: vi.fn(),
    };
    ioMock.mockReturnValue(socketMock);

    const { disconnectSocket, getSocket } = await import('@/app/lib/socket');

    const first = getSocket();
    const second = getSocket();

    expect(first).toBe(second);
    expect(ioMock).toHaveBeenCalledTimes(1);

    disconnectSocket();
    expect(socketMock.disconnect).toHaveBeenCalled();
  });

  it('emits conversation and typing events', async () => {
    const emit = vi.fn();
    ioMock.mockReturnValue({ connected: true, emit, on: vi.fn(), off: vi.fn(), disconnect: vi.fn() });

    const { emitMessage, emitStopTyping, emitTyping, getSocket, joinConversation, leaveConversation } = await import('@/app/lib/socket');

    getSocket();
    joinConversation(1);
    leaveConversation(1);
    emitMessage(1, { id: 9 } as any);
    emitTyping(1);
    emitStopTyping(1);

    expect(emit).toHaveBeenCalledWith('join_conversation', 1);
    expect(emit).toHaveBeenCalledWith('leave_conversation', 1);
    expect(emit).toHaveBeenCalledWith('send_message', { connectionId: 1, message: { id: 9 } });
    expect(emit).toHaveBeenCalledWith('typing', { connectionId: 1 });
    expect(emit).toHaveBeenCalledWith('stop_typing', { connectionId: 1 });
  });

  it('registers and unregisters event listeners', async () => {
    const on = vi.fn();
    const off = vi.fn();
    ioMock.mockReturnValue({ connected: true, emit: vi.fn(), on, off, disconnect: vi.fn() });

    const { getSocket, onNewMessage, onUserStopTyping, onUserTyping } = await import('@/app/lib/socket');

    getSocket();
    const messageCb = vi.fn();
    const typingCb = vi.fn();
    const stopTypingCb = vi.fn();

    const offMessage = onNewMessage(messageCb);
    const offTyping = onUserTyping(typingCb);
    const offStopTyping = onUserStopTyping(stopTypingCb);

    expect(on).toHaveBeenCalledWith('new_message', messageCb);
    expect(on).toHaveBeenCalledWith('user_typing', typingCb);
    expect(on).toHaveBeenCalledWith('user_stop_typing', stopTypingCb);

    offMessage();
    offTyping();
    offStopTyping();

    expect(off).toHaveBeenCalledWith('new_message', messageCb);
    expect(off).toHaveBeenCalledWith('user_typing', typingCb);
    expect(off).toHaveBeenCalledWith('user_stop_typing', stopTypingCb);
  });
});
