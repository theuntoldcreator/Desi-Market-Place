import { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
  isSender: boolean;
}

export function MessageBubble({ message, isSender }: MessageBubbleProps) {
  return (
    <div className={cn('flex items-end gap-2', isSender ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-2xl',
          isSender
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-muted rounded-bl-none'
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <p className={cn('text-xs mt-1', isSender ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
          {format(new Date(message.created_at), 'p')}
        </p>
      </div>
    </div>
  );
}