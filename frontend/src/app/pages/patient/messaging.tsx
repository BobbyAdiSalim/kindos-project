import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
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

export function Messaging() {
  const { user, token } = useAuth();
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [activeConnection, setActiveConnection] = useState<ConnectionInfo | null>(null);
  const [messages, setMessages] = useState<MessageInfo[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const prevConnectionRef = useRef<number | null>(null);

  const currentUserId = user ? Number(user.id) : 0;

  // Load connections
  useEffect(() => {
    const loadConnections = async () => {
      try {
        const data = await getMyConnections(token);
        setConnections(data.connections);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadConnections();
  }, [token]);

  // Connect socket
  useEffect(() => {
    if (!token) return;
    getSocket(token);
  }, [token]);

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
  const pendingConnections = connections.filter((c) => c.status === 'pending');

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p>Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link to="/patient/dashboard">
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
            contactRole="doctor"
            emptyMessage="No conversations yet. Connect with a doctor from their profile to start messaging."
          />
          {/* Pending connections shown below */}
          {pendingConnections.length > 0 && (
            <div className="border-t">
              <ScrollArea>
                <div className="divide-y">
                  {pendingConnections.map((conn) => {
                    const doctorName = conn.doctor?.full_name || 'Doctor';
                    return (
                      <div key={conn.id} className="p-4 opacity-60">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarFallback>{doctorName[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{doctorName}</p>
                            <Badge variant="outline" className="mt-1 text-xs">
                              Pending
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </Card>

        {/* Chat panel */}
        <Card className="flex-1 flex flex-col">
          {activeConnection ? (
            <ChatPanel
              contactName={activeConnection.doctor?.full_name || 'Doctor'}
              contactSubtitle={activeConnection.doctor?.specialty || ''}
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
