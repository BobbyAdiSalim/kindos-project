import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { useAuth } from '@/app/lib/auth-context';
import {
  getMyConnections,
  getConversation,
  sendMessageApi,
  markMessagesRead,
  type ConnectionInfo,
  type MessageInfo,
} from '@/app/lib/chat-api';
import {
  getSocket,
  joinConversation,
  leaveConversation,
  emitMessage,
  onNewMessage,
} from '@/app/lib/socket';
import { ConversationList } from '@/app/components/chat/conversation-list';
import { ChatPanel, EmptyChatPanel } from '@/app/components/chat/chat-panel';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export function DoctorMessaging() {
  const { user, token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [activeConnection, setActiveConnection] = useState<ConnectionInfo | null>(null);
  const [messages, setMessages] = useState<MessageInfo[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const prevConnectionRef = useRef<number | null>(null);
  const initialConnectionIdRef = useRef<number | null>(Number(searchParams.get('connectionId')) || null);

  const currentUserId = user ? Number(user.id) : 0;

  // Load connections
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getMyConnections(token);
        setConnections(data.connections);

        if (initialConnectionIdRef.current) {
          const match = data.connections.find(
            (c) => c.id === initialConnectionIdRef.current && c.status === 'accepted'
          );
          if (match) setActiveConnection(match);
        }
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  // Connect socket
  useEffect(() => {
    if (!token) return;
    getSocket(token);
  }, [token]);

  // Sync active connection id to URL
  useEffect(() => {
    if (activeConnection) {
      setSearchParams((prev) => {
        prev.set('connectionId', String(activeConnection.id));
        return prev;
      }, { replace: true });
    }
  }, [activeConnection]);

  // Load messages when active connection changes
  useEffect(() => {
    if (!activeConnection || activeConnection.status !== 'accepted') return;

    if (prevConnectionRef.current && prevConnectionRef.current !== activeConnection.id) {
      leaveConversation(prevConnectionRef.current);
    }

    const loadMessages = async () => {
      try {
        const data = await getConversation(token, activeConnection.id);
        setMessages(data.messages);
        await markMessagesRead(token, activeConnection.id);

        setConnections((prev) =>
          prev.map((c) =>
            c.id === activeConnection.id ? { ...c, unreadCount: 0 } : c
          )
        );
      } catch (err: any) {
        toast.error(err.message);
      }
    };

    loadMessages();
    joinConversation(activeConnection.id);
    prevConnectionRef.current = activeConnection.id;

    const s = getSocket(token);
    const handleReconnect = () => joinConversation(activeConnection.id);
    s.on('connect', handleReconnect);
    return () => {
      s.off('connect', handleReconnect);
    };
  }, [activeConnection, token]);

  // Listen for real-time messages
  useEffect(() => {
    if (!activeConnection) return;

    const cleanup = onNewMessage((message: MessageInfo) => {
      setMessages((prev) => [...prev, message]);
      markMessagesRead(token, activeConnection.id).catch(() => {});
    });

    return cleanup;
  }, [activeConnection, token]);

  const handleSend = useCallback(async () => {
    if (!messageInput.trim() || !activeConnection || sending) return;

    setSending(true);
    try {
      const data = await sendMessageApi(token, activeConnection.id, messageInput.trim());
      setMessages((prev) => [...prev, data.message]);
      emitMessage(activeConnection.id, data.message);
      setMessageInput('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  }, [messageInput, activeConnection, token, sending]);

  const acceptedConnections = connections.filter((c) => c.status === 'accepted');

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p>Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link to="/doctor/dashboard">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </Link>

      <h1 className="text-2xl font-semibold mb-6">Messages</h1>

      <div className="flex gap-4 h-[600px]">
        {/* Sidebar — conversation list */}
        <Card className="w-80 flex-shrink-0 flex flex-col">
          <CardContent className="p-4 border-b">
            <h2 className="font-semibold">Conversations</h2>
          </CardContent>
          <ConversationList
            connections={acceptedConnections}
            activeConnectionId={activeConnection?.id ?? null}
            onSelect={setActiveConnection}
            contactRole="patient"
            emptyMessage="No conversations yet. Conversations are created automatically when a patient books an appointment."
          />
        </Card>

        {/* Chat panel */}
        <Card className="flex-1 flex flex-col">
          {activeConnection ? (
            <ChatPanel
              contactName={activeConnection.patient?.full_name || 'Patient'}
              messages={messages}
              currentUserId={currentUserId}
              messageInput={messageInput}
              onMessageInputChange={setMessageInput}
              onSend={handleSend}
              sending={sending}
            />
          ) : (
            <EmptyChatPanel />
          )}
        </Card>
      </div>
    </div>
  );
}
