import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MessageProps {
  message: {
    id: number;
    content: string;
    created_at: string;
    sender: {
      avatar_url?: string;
      first_name?: string;
      last_name?: string;
    } | null;
  };
  isSender: boolean;
}

export function Message({ message, isSender }: MessageProps) {
  const fullName = `${message.sender?.first_name || ''} ${message.sender?.last_name || ''}`.trim();
  const fallback = fullName ? fullName[0].toUpperCase() : 'U';

  return (
    <div
      className={cn(
        "flex items-start gap-3",
        isSender ? "flex-row-reverse" : ""
      )}
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={message.sender?.avatar_url} alt={fullName} />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "rounded-lg p-3 text-sm",
          isSender
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        <p>{message.content}</p>
      </div>
    </div>
  );
}