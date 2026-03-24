import React, { useState } from 'react';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { FileText, Download, Image, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface MessageBubbleProps {
  content: string | null;
  timestamp: string;
  senderInitial: string;
  isMine: boolean;
  fileName?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  fileDownloadUrl?: string | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileAttachment({
  fileName,
  fileSize,
  fileType,
  fileDownloadUrl,
  isMine,
}: {
  fileName: string;
  fileSize?: number | null;
  fileType?: string | null;
  fileDownloadUrl?: string | null;
  isMine: boolean;
}) {
  const [downloading, setDownloading] = useState(false);
  const isImage = fileType?.startsWith('image/');
  const Icon = isImage ? Image : FileText;

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!fileDownloadUrl || downloading) return;

    setDownloading(true);
    try {
      const response = await fetch(fileDownloadUrl, { credentials: 'include' });
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download document');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className={`flex items-center gap-3 rounded-md p-2 mt-1 w-full text-left transition-colors cursor-pointer ${
        isMine
          ? 'bg-primary-foreground/15 hover:bg-primary-foreground/25'
          : 'bg-background/60 hover:bg-background/80'
      }`}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{fileName}</p>
        {fileSize != null && (
          <p className="text-xs opacity-70">{formatFileSize(fileSize)}</p>
        )}
      </div>
      {downloading ? (
        <Loader2 className="h-4 w-4 flex-shrink-0 opacity-70 animate-spin" />
      ) : (
        <Download className="h-4 w-4 flex-shrink-0 opacity-70" />
      )}
    </button>
  );
}

export function MessageBubble({
  content,
  timestamp,
  senderInitial,
  isMine,
  fileName,
  fileSize,
  fileType,
  fileDownloadUrl,
}: MessageBubbleProps) {
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
            {content && <p>{content}</p>}
            {fileName && (
              <FileAttachment
                fileName={fileName}
                fileSize={fileSize}
                fileType={fileType}
                fileDownloadUrl={fileDownloadUrl}
                isMine={isMine}
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(timestamp).toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}
