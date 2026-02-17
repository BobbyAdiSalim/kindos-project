import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
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
import { Send, ArrowLeft, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

export function Messaging() {
  const { user, token } = useAuth();
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [activeConnection, setActiveConnection] = useState<ConnectionInfo | null>(null);
  const [messages, setMessages] = useState<MessageInfo[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

    // Leave previous conversation room
    if (prevConnectionRef.current && prevConnectionRef.current !== activeConnection.id) {
      leaveConversation(prevConnectionRef.current);
    }

    const loadMessages = async () => {
      try {
        const data = await getConversation(token, activeConnection.id);
        setMessages(data.messages);
        await markMessagesRead(token, activeConnection.id);

        // Update unread count in sidebar
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
      // Mark as read since we're viewing the conversation
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
          <ScrollArea className="flex-1">
            {acceptedConnections.length === 0 && pendingConnections.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No conversations yet.</p>
                <p className="mt-1">Connect with a doctor from their profile to start messaging.</p>
              </div>
            ) : (
              <div className="divide-y">
                {acceptedConnections.map((conn) => {
                  const doctorName = conn.doctor?.full_name || 'Doctor';
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
                          <AvatarFallback>{doctorName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">{doctorName}</p>
                            {(conn.unreadCount ?? 0) > 0 && (
                              <Badge variant="default" className="ml-2 text-xs">
                                {conn.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {conn.doctor?.specialty || ''}
                          </p>
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
            )}
          </ScrollArea>
        </Card>

        {/* Chat panel */}
        <Card className="flex-1 flex flex-col">
          {activeConnection ? (
            <>
              <CardContent className="p-4 border-b">
                <h2 className="font-semibold text-lg">
                  {activeConnection.doctor?.full_name || 'Doctor'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {activeConnection.doctor?.specialty || ''}
                </p>
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
                <p className="text-sm mt-1">Choose a doctor from the sidebar to start chatting</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
