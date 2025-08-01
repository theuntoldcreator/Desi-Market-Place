import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';

interface ChatHeaderProps {
  user: {
    id: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  } | null | undefined;
}

export function ChatHeader({ user }: ChatHeaderProps) {
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
    <div className="p-3 border-b flex items-center gap-3">
      <Link to={`/user/${user.id}`}>
        <Avatar>
          <AvatarImage src={user.avatar_url} alt={fullName} />
          <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
      </Link>
      <div>
        <p className="font-semibold">{fullName}</p>
        {/* Future enhancement: <p className="text-xs text-muted-foreground">Online</p> */}
      </div>
    </div>
  );
}