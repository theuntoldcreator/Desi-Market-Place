import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface ChatHeaderProps {
  user: any;
  onDeleteChat: () => void;
}

export function ChatHeader({ user, onDeleteChat }: ChatHeaderProps) {
  if (!user) return null;

  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  const fallback = fullName ? fullName[0].toUpperCase() : '?';

  return (
    <div className="flex items-center justify-between p-3 border-b w-full">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={user.avatar_url} alt={fullName} />
          <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{fullName}</p>
          {/* This could be a future enhancement with presence */}
          <p className="text-xs text-muted-foreground">Active now</p>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onDeleteChat}>
        <Trash2 className="w-5 h-5 text-destructive" />
      </Button>
    </div>
  );
}