import { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MessageBubbleProps {
  message: Message;
  isSender: boolean;
}

export function MessageBubble({ message, isSender }: MessageBubbleProps) {
  const senderName = `${message.profiles?.first_name || ''} ${message.profiles?.last_name || ''}`.trim();
  const senderInitials = (message.profiles?.first_name?.[0] || '') + (message.profiles?.last_name?.[0] || '');

  return (
    <div className={cn('flex items-end gap-2', isSender ? 'justify-end' : 'justify-start')}>
      {!isSender && (
        <Avatar className="h-8 w-8 border">
          <AvatarImage src={message.profiles?.avatar_url || undefined} alt={senderName} />
          <AvatarFallback>{senderInitials.toUpperCase()}</AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-2xl',
          isSender
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-muted rounded-bl-none'
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <p className={cn('text-xs mt-1 text-right', isSender ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
          {format(new Date(message.created_at), 'p')}
        </p>
      </div>
    </div>
  );
}