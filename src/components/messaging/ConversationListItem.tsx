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
    listingTitle,
    listingImageUrl,
    otherUser,
    lastMessage,
  } = conversation;

  const otherUserName = `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim();
  const isLastMessageUnread = lastMessage ? lastMessage.senderId !== currentUserId && !lastMessage.read : false;

  return (
    <Link to={`/messages/${id}`} className="flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors">
      <Avatar className="h-12 w-12 border">
        <AvatarImage src={otherUser.avatarUrl || undefined} alt={otherUserName} />
        <AvatarFallback>{otherUserName.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-grow overflow-hidden">
        <div className="flex justify-between items-baseline">
          <p className="font-semibold truncate">{otherUserName}</p>
          {lastMessage?.createdAt && (
            <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">
              {formatDistanceToNow(lastMessage.createdAt.toDate(), { addSuffix: true })}
            </p>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{listingTitle}</p>
        <p className={cn("text-sm truncate", isLastMessageUnread && lastMessage?.text ? "font-bold text-foreground" : "text-muted-foreground")}>
          {lastMessage?.text || 'No messages yet.'}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <img src={listingImageUrl} alt={listingTitle} className="w-12 h-12 object-cover rounded-md" />
        {isLastMessageUnread && <span className="w-2.5 h-2.5 bg-primary rounded-full"></span>}
      </div>
    </Link>
  );
}