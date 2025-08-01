import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@supabase/auth-helpers-react";
import { Link, useParams } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "@/lib/utils";
import { Skeleton } from "../ui/skeleton";

const fetchChats = async (userId: string) => {
    const { data, error } = await supabase
        .from('chats')
        .select('*, listings(title), buyer:profiles!chats_buyer_id_fkey(id, first_name, last_name, avatar_url), seller:profiles!chats_seller_id_fkey(id, first_name, last_name, avatar_url)')
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    
    return chats.map(chat => {
        const otherUser = chat.buyer_id === userId ? chat.seller : chat.buyer;
        return { ...chat, other_user: otherUser };
    });
};

export function UserList() {
  const session = useSession();
  const { chatId } = useParams<{ chatId: string }>();
  const { data: chats, isLoading } = useQuery({
    queryKey: ["chats", session?.user.id],
    queryFn: () => fetchChats(session!.user.id),
    enabled: !!session,
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg p-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!chats || chats.length === 0) {
      return <div className="p-4 text-center text-sm text-muted-foreground">No conversations yet.</div>
  }

  return (
    <nav className="grid gap-1 p-2">
      {chats.map((chat) => {
        const fullName = `${chat.other_user?.first_name || ''} ${chat.other_user?.last_name || ''}`.trim();
        const fallback = fullName ? fullName[0].toUpperCase() : '?';
        return (
          <Link
            key={chat.id}
            to={`/chats/${chat.id}`}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted",
              chatId === String(chat.id) && "bg-muted text-primary"
            )}
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={chat.other_user?.avatar_url} alt={fullName} />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="font-semibold truncate text-sm text-foreground">{fullName}</p>
              <p className="text-xs truncate">Re: {chat.listings?.title}</p>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}