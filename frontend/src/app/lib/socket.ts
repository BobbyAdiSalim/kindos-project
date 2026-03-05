import { io, Socket } from 'socket.io-client';
import type { MessageInfo } from './chat-api';

let socket: Socket | null = null;

export const getSocket = (token: string): Socket => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(window.location.origin, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinConversation = (connectionId: number) => {
  socket?.emit('join_conversation', connectionId);
};

export const leaveConversation = (connectionId: number) => {
  socket?.emit('leave_conversation', connectionId);
};

export const emitMessage = (connectionId: number, message: MessageInfo) => {
  socket?.emit('send_message', { connectionId, message });
};

export const emitTyping = (connectionId: number) => {
  socket?.emit('typing', { connectionId });
};

export const emitStopTyping = (connectionId: number) => {
  socket?.emit('stop_typing', { connectionId });
};

export const onNewMessage = (callback: (message: MessageInfo) => void) => {
  socket?.on('new_message', callback);
  return () => {
    socket?.off('new_message', callback);
  };
};

export const onUserTyping = (callback: (data: { userId: number }) => void) => {
  socket?.on('user_typing', callback);
  return () => {
    socket?.off('user_typing', callback);
  };
};

export const onUserStopTyping = (callback: (data: { userId: number }) => void) => {
  socket?.on('user_stop_typing', callback);
  return () => {
    socket?.off('user_stop_typing', callback);
  };
};
