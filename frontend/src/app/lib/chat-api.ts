const API_BASE = '/api';

const withAuth = (token: string | null) => {
  if (!token) {
    throw new Error('Authentication required.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

export interface ConnectionInfo {
  id: number;
  patient_id: number;
  doctor_id: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
  doctor?: {
    id: number;
    full_name: string;
    specialty: string;
    user_id: number;
    user?: { id: number; username: string };
  };
  patient?: {
    id: number;
    full_name: string;
    user_id: number;
    user?: { id: number; username: string; email?: string };
  };
  lastMessage?: MessageInfo | null;
  unreadCount?: number;
}

export interface MessageInfo {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  read: boolean;
  read_at: string | null;
  created_at: string;
  sender?: {
    id: number;
    username: string;
    role: string;
  };
}

export const sendConnectRequest = async (
  token: string | null,
  doctorId: number
): Promise<{ message: string; connection: ConnectionInfo }> => {
  const response = await fetch(`${API_BASE}/chat/connect`, {
    method: 'POST',
    headers: withAuth(token),
    body: JSON.stringify({ doctorId }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to send connect request.');
  }

  return data;
};

export const getMyConnections = async (
  token: string | null
): Promise<{ connections: ConnectionInfo[] }> => {
  const response = await fetch(`${API_BASE}/chat/connections`, {
    headers: withAuth(token),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to load connections.');
  }

  return data;
};

export const getPendingRequests = async (
  token: string | null
): Promise<{ requests: ConnectionInfo[] }> => {
  const response = await fetch(`${API_BASE}/chat/requests/pending`, {
    headers: withAuth(token),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to load pending requests.');
  }

  return data;
};

export const respondToConnection = async (
  token: string | null,
  connectionId: number,
  status: 'accepted' | 'rejected'
): Promise<{ message: string; connection: ConnectionInfo }> => {
  const response = await fetch(`${API_BASE}/chat/connections/${connectionId}`, {
    method: 'PATCH',
    headers: withAuth(token),
    body: JSON.stringify({ status }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to respond to connection.');
  }

  return data;
};

export const getConversation = async (
  token: string | null,
  connectionId: number,
  options?: { limit?: number; before?: number }
): Promise<{
  messages: MessageInfo[];
  connection: {
    id: number;
    patient: { id: number; full_name: string; user_id: number };
    doctor: { id: number; full_name: string; user_id: number };
    status: string;
  };
}> => {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.before) params.set('before', String(options.before));

  const qs = params.toString();
  const url = `${API_BASE}/chat/messages/${connectionId}${qs ? `?${qs}` : ''}`;

  const response = await fetch(url, {
    headers: withAuth(token),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to load messages.');
  }

  return data;
};

export const sendMessageApi = async (
  token: string | null,
  connectionId: number,
  content: string
): Promise<{ message: MessageInfo }> => {
  const response = await fetch(`${API_BASE}/chat/messages/${connectionId}`, {
    method: 'POST',
    headers: withAuth(token),
    body: JSON.stringify({ content }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to send message.');
  }

  return data;
};

export const markMessagesRead = async (
  token: string | null,
  connectionId: number
): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE}/chat/messages/${connectionId}/read`, {
    method: 'PATCH',
    headers: withAuth(token),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to mark messages as read.');
  }

  return data;
};
