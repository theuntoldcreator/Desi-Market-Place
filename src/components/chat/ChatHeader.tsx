import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ChatHeaderProps {
  user: {
    id: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  } | null | undefined;
  onDeleteChat: () => void;
}

export function ChatHeader({ user, onDeleteChat }: ChatHeaderProps) {
  if (!user) {
    return (
      <div className="p-3 border-b flex items-center gap-3 h-[65px]">
        <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  const fallback = fullName ? fullName[0].toUpperCase() : '?';

  return (
    <div className="p-3 border-b flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Link to={`/user/${user.id}`}>
          <Avatar>
            <AvatarImage src={user.avatar_url} alt={fullName} />
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
        </Link>
        <div>
          <p className="font-semibold">{fullName}</p>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onDeleteChat} className="text-destructive focus:text-destructive focus:bg-destructive/10">
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete Chat</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}