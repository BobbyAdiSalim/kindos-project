import React from 'react';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { MessageSquare } from 'lucide-react';
import type { ConnectionInfo } from '@/app/lib/chat-api';

interface ConversationListProps {
  connections: ConnectionInfo[];
  activeConnectionId: number | null;
  onSelect: (connection: ConnectionInfo) => void;
  /** Which field to display as the contact name: 'doctor' or 'patient' */
  contactRole: 'doctor' | 'patient';
  emptyMessage?: string;
}

export function ConversationList({
  connections,
  activeConnectionId,
  onSelect,
  contactRole,
  emptyMessage = 'No conversations yet.',
}: ConversationListProps) {
  if (connections.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y">
        {connections.map((conn) => {
          const name =
            contactRole === 'doctor'
              ? conn.doctor?.full_name || 'Doctor'
              : conn.patient?.full_name || 'Patient';
          const subtitle =
            contactRole === 'doctor' ? conn.doctor?.specialty || '' : '';
          const isActive = activeConnectionId === conn.id;

          return (
            <button
              key={conn.id}
              onClick={() => onSelect(conn)}
              className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${
                isActive ? 'bg-muted' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarFallback>{name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">{name}</p>
                    {(conn.unreadCount ?? 0) > 0 && (
                      <Badge variant="default" className="ml-2 text-xs">
                        {conn.unreadCount}
                      </Badge>
                    )}
                  </div>
                  {subtitle && (
                    <p className="text-sm text-muted-foreground truncate">
                      {subtitle}
                    </p>
                  )}
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
    </ScrollArea>
  );
}
