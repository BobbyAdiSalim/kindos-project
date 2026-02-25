import React from 'react';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';

interface MessageBubbleProps {
  content: string;
  timestamp: string;
  senderInitial: string;
  isMine: boolean;
}

export function MessageBubble({ content, timestamp, senderInitial, isMine }: MessageBubbleProps) {
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex gap-2 max-w-[70%] ${isMine ? 'flex-row-reverse' : ''}`}>
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback>{senderInitial}</AvatarFallback>
        </Avatar>
        <div>
          <div
            className={`rounded-lg p-3 ${
              isMine ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}
          >
            {content}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(timestamp).toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}
