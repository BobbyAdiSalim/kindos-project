import React, { useRef, useEffect } from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { MessageBubble } from './message-bubble';
import { Send, MessageSquare } from 'lucide-react';
import type { MessageInfo } from '@/app/lib/chat-api';

interface ChatPanelProps {
  contactName: string;
  contactSubtitle?: string;
  messages: MessageInfo[];
  currentUserId: number;
  messageInput: string;
  onMessageInputChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
}

export function ChatPanel({
  contactName,
  contactSubtitle,
  messages,
  currentUserId,
  messageInput,
  onMessageInputChange,
  onSend,
  sending,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <>
      <CardContent className="p-4 border-b">
        <h2 className="font-semibold text-lg">{contactName}</h2>
        {contactSubtitle && (
          <p className="text-sm text-muted-foreground">{contactSubtitle}</p>
        )}
      </CardContent>

      <ScrollArea className="flex-1 min-h-0 p-4">
        <div className="space-y-4">
          {messages.map((msg) => {
            const isMine = msg.sender_id === currentUserId;
            const initial = msg.sender?.username?.[0]?.toUpperCase() || '?';
            return (
              <MessageBubble
                key={msg.id}
                content={msg.content}
                timestamp={msg.created_at}
                senderInitial={initial}
                isMine={isMine}
              />
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
            onChange={(e) => onMessageInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            disabled={sending}
          />
          <Button size="icon" onClick={onSend} disabled={sending || !messageInput.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

export function EmptyChatPanel() {
  return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">Select a conversation</p>
        <p className="text-sm mt-1">Choose a contact from the sidebar to start chatting</p>
      </div>
    </div>
  );
}
