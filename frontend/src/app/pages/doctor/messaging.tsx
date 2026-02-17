import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
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
import { Send, ArrowLeft, MessageSquare, Check, X, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export function DoctorMessaging() {
  const { user, token } = useAuth();
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ConnectionInfo[]>([]);
  const [activeConnection, setActiveConnection] = useState<ConnectionInfo | null>(null);
  const [messages, setMessages] = useState<MessageInfo[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevConnectionRef = useRef<number | null>(null);

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

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

      // Remove from pending
      setPendingRequests((prev) => prev.filter((r) => r.id !== connectionId));

      if (status === 'accepted') {
        // Refresh connections to include the newly accepted one
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
              <ScrollArea className="h-full">
                {acceptedConnections.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No conversations yet.</p>
                    <p className="mt-1">Accept a patient's connect request to start chatting.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {acceptedConnections.map((conn) => {
                      const patientName = conn.patient?.full_name || 'Patient';
                      const isActive = activeConnection?.id === conn.id;
                      return (
                        <button
                          key={conn.id}
                          onClick={() => setActiveConnection(conn)}
                          className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${
                            isActive ? 'bg-muted' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 flex-shrink-0">
                              <AvatarFallback>{patientName[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium truncate">{patientName}</p>
                                {(conn.unreadCount ?? 0) > 0 && (
                                  <Badge variant="default" className="ml-2 text-xs">
                                    {conn.unreadCount}
                                  </Badge>
                                )}
                              </div>
                              {conn.lastMessage && (
                                <p className="text-xs text-muted-foreground truncate mt-1">
                                  {conn.lastMessage.content}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
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
            <>
              <CardContent className="p-4 border-b">
                <h2 className="font-semibold text-lg">
                  {activeConnection.patient?.full_name || 'Patient'}
                </h2>
              </CardContent>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((msg) => {
                    const isMine = msg.sender_id === currentUserId;
                    const initial = msg.sender?.username?.[0]?.toUpperCase() || '?';
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`flex gap-2 max-w-[70%] ${
                            isMine ? 'flex-row-reverse' : ''
                          }`}
                        >
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback>{initial}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div
                              className={`rounded-lg p-3 ${
                                isMine
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              {msg.content}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(msg.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    disabled={sending}
                  />
                  <Button size="icon" onClick={handleSend} disabled={sending || !messageInput.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm mt-1">Choose a patient from the sidebar to start chatting</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
