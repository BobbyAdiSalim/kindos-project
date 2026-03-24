import React, { useRef, useEffect } from 'react';
import { CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { MessageBubble } from './message-bubble';
import { Send, MessageSquare, Paperclip, X, Info } from 'lucide-react';
import { toast } from 'sonner';
import { getChatDocumentUrl, type MessageInfo } from '@/app/lib/chat-api';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

interface ChatPanelProps {
  contactName: string;
  contactSubtitle?: string;
  messages: MessageInfo[];
  currentUserId: number;
  messageInput: string;
  onMessageInputChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  activeConnectionId: number;
  pendingFile?: { data: string; name: string; type: string } | null;
  onFileSelect?: (file: { data: string; name: string; type: string } | null) => void;
  allowFileUpload?: boolean;
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
  activeConnectionId,
  pendingFile = null,
  onFileSelect,
  allowFileUpload = false,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Unsupported file type', {
        description: 'Accepted formats: PDF, PNG, JPEG, WebP, DOC, DOCX.',
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large', {
        description: `Maximum file size is 10 MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)} MB.`,
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onFileSelect({
        data: reader.result as string,
        name: file.name,
        type: file.type,
      });
    };
    reader.readAsDataURL(file);

    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const canSend = !sending && (messageInput.trim() || pendingFile);

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
          {messages.length === 0 && allowFileUpload && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
              <Info className="h-4 w-4 flex-shrink-0" />
              <p>This patient cannot message you until you send the first message.</p>
            </div>
          )}
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
                fileName={msg.file_name}
                fileSize={msg.file_size}
                fileType={msg.file_type}
                fileDownloadUrl={
                  msg.file_url
                    ? getChatDocumentUrl(activeConnectionId, msg.id)
                    : null
                }
              />
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        {allowFileUpload && pendingFile && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded-md text-sm">
            <Paperclip className="h-4 w-4 flex-shrink-0" />
            <span className="truncate flex-1">{pendingFile.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onFileSelect?.(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          {allowFileUpload && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                title="Attach a document"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </>
          )}
          <Input
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => onMessageInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (canSend) onSend();
              }
            }}
            disabled={sending}
          />
          <Button size="icon" onClick={onSend} disabled={!canSend}>
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
