import { useSession } from '@supabase/auth-helpers-react';
import { Message } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';

export function MessageBubble({ message }: { message: Message }) {
  const session = useSession();
  const isSender = message.sender_id === session?.user?.id;

  return (
    <div className={cn('flex items-end gap-2', isSender ? 'justify-end' : 'justify-start')}>
      {!isSender && (
        <Avatar className="w-8 h-8">
          <AvatarImage src={message.sender?.avatar_url} />
          <AvatarFallback>{message.sender?.full_name?.[0]}</AvatarFallback>
        </Avatar>
      )}
      <div className={cn('max-w-md p-3 rounded-2xl', isSender ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none')}>
        <p>{message.content}</p>
        <p className={cn('text-xs mt-1', isSender ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
          {format(new Date(message.created_at), 'p')}
        </p>
      </div>
    </div>
  );
}