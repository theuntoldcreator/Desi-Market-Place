import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ConversationPreview } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ConversationListItemProps {
  conversation: ConversationPreview;
  currentUserId: string;
}

export function ConversationListItem({ conversation, currentUserId }: ConversationListItemProps) {
  const {
    id,
    listing_title,
    listing_image_url,
    other_user_first_name,
    other_user_last_name,
    other_user_avatar_url,
    last_message_body,
    last_message_created_at,
    last_message_sender_id,
  } = conversation;

  const otherUserName = `${other_user_first_name || ''} ${other_user_last_name || ''}`.trim();
  const isLastMessageUnread = last_message_sender_id !== currentUserId;

  return (
    <Link to={`/messages/${id}`} className="flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors">
      <Avatar className="h-12 w-12 border">
        <AvatarImage src={other_user_avatar_url || undefined} alt={otherUserName} />
        <AvatarFallback>{otherUserName.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-grow overflow-hidden">
        <div className="flex justify-between items-baseline">
          <p className="font-semibold truncate">{otherUserName}</p>
          {last_message_created_at && (
            <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">
              {formatDistanceToNow(new Date(last_message_created_at), { addSuffix: true })}
            </p>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{listing_title}</p>
        <p className={cn("text-sm truncate", isLastMessageUnread && last_message_body ? "font-bold text-foreground" : "text-muted-foreground")}>
          {last_message_body || 'No messages yet.'}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <img src={listing_image_url} alt={listing_title} className="w-12 h-12 object-cover rounded-md" />
        {isLastMessageUnread && last_message_body && <span className="w-2.5 h-2.5 bg-primary rounded-full"></span>}
      </div>
    </Link>
  );
}