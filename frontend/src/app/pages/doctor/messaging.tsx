import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useAuth } from '@/app/lib/auth-context';
import {
  getMyConnections,
  getPendingRequests,
  respondToConnection,
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
import { ArrowLeft, Check, X, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export function DoctorMessaging() {
  const { user, token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ConnectionInfo[]>([]);
  const [activeConnection, setActiveConnection] = useState<ConnectionInfo | null>(null);
  const [messages, setMessages] = useState<MessageInfo[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const prevConnectionRef = useRef<number | null>(null);
  const initialConnectionIdRef = useRef<number | null>(Number(searchParams.get('connectionId')) || null);

  const currentUserId = user ? Number(user.id) : 0;

  // Load connections and pending requests
  useEffect(() => {
    const loadData = async () => {
      try {
        const [connectionsData, requestsData] = await Promise.all([
          getMyConnections(token),
          getPendingRequests(token),
        ]);
        setConnections(connectionsData.connections);
        setPendingRequests(requestsData.requests);

        if (initialConnectionIdRef.current) {
          const match = connectionsData.connections.find(
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

  const handleRespond = async (connectionId: number, status: 'accepted' | 'rejected') => {
    setRespondingId(connectionId);
    try {
      await respondToConnection(token, connectionId, status);

      setPendingRequests((prev) => prev.filter((r) => r.id !== connectionId));

      if (status === 'accepted') {
        const data = await getMyConnections(token);
        setConnections(data.connections);
        toast.success('Connection accepted!');
      } else {
        toast.success('Connection rejected.');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRespondingId(null);
    }
  };

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
        {/* Sidebar */}
        <Card className="w-80 flex-shrink-0 flex flex-col">
          <Tabs defaultValue="conversations" className="flex flex-col h-full">
            <div className="border-b px-2 pt-2">
              <TabsList className="w-full">
                <TabsTrigger value="conversations" className="flex-1">
                  Chats
                </TabsTrigger>
                <TabsTrigger value="requests" className="flex-1">
                  Requests
                  {pendingRequests.length > 0 && (
                    <Badge variant="destructive" className="ml-2 text-xs px-1.5">
                      {pendingRequests.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="conversations" className="flex-1 m-0">
              <ConversationList
                connections={acceptedConnections}
                activeConnectionId={activeConnection?.id ?? null}
                onSelect={setActiveConnection}
                contactRole="patient"
                emptyMessage="No conversations yet. Accept a patient's connect request to start chatting."
              />
            </TabsContent>

            <TabsContent value="requests" className="flex-1 m-0">
              <ScrollArea className="h-full">
                {pendingRequests.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No pending requests.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {pendingRequests.map((req) => {
                      const patientName = req.patient?.full_name || 'Patient';
                      const isResponding = respondingId === req.id;
                      return (
                        <div key={req.id} className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <Avatar className="h-10 w-10 flex-shrink-0">
                              <AvatarFallback>{patientName[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{patientName}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(req.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => handleRespond(req.id, 'accepted')}
                              disabled={isResponding}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => handleRespond(req.id, 'rejected')}
                              disabled={isResponding}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
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
