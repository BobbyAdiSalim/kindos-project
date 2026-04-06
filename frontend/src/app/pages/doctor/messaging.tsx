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
  const [pendingFile, setPendingFile] = useState<{ data: string; name: string; type: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const prevConnectionRef = useRef<number | null>(null);
  const initialConnectionIdRef = useRef<number | null>(Number(searchParams.get('connectionId')) || null);

  const currentUserId = user ? Number(user.id) : 0;

  const updateConnectionPreview = useCallback(
    (connectionId: number, message: MessageInfo, markRead: boolean) => {
      setConnections((prev) =>
        prev.map((c) => {
          if (c.id !== connectionId) return c;
          const unread = markRead ? 0 : (c.unreadCount ?? 0) + 1;
          return {
            ...c,
            lastMessage: message,
            unreadCount: unread,
          };
        })
      );
    },
    []
  );

  // Load connections
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getMyConnections(token);
        setConnections(data.connections);

        if (initialConnectionIdRef.current) {
          const match = data.connections.find(
            (c) => c.id === initialConnectionIdRef.current
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
    getSocket();
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
    if (!activeConnection) return;

    if (prevConnectionRef.current && prevConnectionRef.current !== activeConnection.id) {
      leaveConversation(prevConnectionRef.current);
    }

    const loadMessages = async () => {
      try {
        const data = await getConversation(token, activeConnection.id);
        setMessages(data.messages);
        const latestMessage = data.messages[data.messages.length - 1];
        if (latestMessage) {
          updateConnectionPreview(activeConnection.id, latestMessage, true);
        }
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

    const s = getSocket();
    const handleReconnect = () => joinConversation(activeConnection.id);
    s.on('connect', handleReconnect);
    return () => {
      s.off('connect', handleReconnect);
    };
  }, [activeConnection, token, updateConnectionPreview]);

  // Listen for real-time messages
  useEffect(() => {
    if (!activeConnection) return;

    const cleanup = onNewMessage((message: MessageInfo) => {
      setMessages((prev) => [...prev, message]);
      const isIncoming = message.sender_id !== currentUserId;
      updateConnectionPreview(activeConnection.id, message, !isIncoming);
      markMessagesRead(token, activeConnection.id).catch(() => {});
    });

    return cleanup;
  }, [activeConnection, token, currentUserId, updateConnectionPreview]);

  const handleSend = useCallback(async () => {
    if ((!messageInput.trim() && !pendingFile) || !activeConnection || sending) return;

    setSending(true);
    try {
      const data = await sendMessageApi(token, activeConnection.id, messageInput.trim(), pendingFile);
      setMessages((prev) => [...prev, data.message]);
      updateConnectionPreview(activeConnection.id, data.message, true);
      setMessageInput('');
      setPendingFile(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  }, [messageInput, pendingFile, activeConnection, token, sending, updateConnectionPreview]);

  const acceptedConnections = connections;

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
              activeConnectionId={activeConnection.id}
              pendingFile={pendingFile}
              onFileSelect={setPendingFile}
              allowFileUpload
            />
          ) : (
            <EmptyChatPanel />
          )}
        </Card>
      </div>
    </div>
  );
}
