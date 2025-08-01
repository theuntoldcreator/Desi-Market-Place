import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { Link, useParams } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

const fetchChats = async (userId: string) => {
  const { data: chats, error: chatsError } = await supabase
    .from('chats')
    .select('*, listings(title), buyer:profiles!chats_buyer_id_fkey(id, first_name, last_name, avatar_url), seller:profiles!chats_seller_id_fkey(id, first_name, last_name, avatar_url)')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (chatsError) throw new Error(chatsError.message);
  if (!chats) return [];

  return chats.map(chat => {
    const otherUser = chat.buyer_id === userId ? chat.seller : chat.buyer;
    return { ...chat, other_user: otherUser };
  });
};

export function ChatList() {
  const session = useSession();
  const queryClient = useQueryClient();
  const { chatId } = useParams<{ chatId?: string }>();

  const { data: chats, isLoading } = useQuery({
    queryKey: ['chats', session?.user?.id],
    queryFn: () => fetchChats(session!.user.id),
    enabled: !!session,
  });

  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel('public:chats')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chats', filter: `or(buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id})` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chats', session.user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, queryClient]);

  if (isLoading) {
    return <div className="p-2 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  if (!chats || chats.length === 0) {
    return <div className="p-4 text-center text-sm text-muted-foreground">No conversations yet.</div>;
  }

  return (
    <nav className="p-2 space-y-1">
      {chats.map(chat => {
        const fullName = `${chat.other_user?.first_name || ''} ${chat.other_user?.last_name || ''}`.trim();
        const fallback = fullName ? fullName[0].toUpperCase() : '?';
        return (
          <Link
            key={chat.id}
            to={`/chats/${chat.id}`}
            className={cn(
              "flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted",
              chatId === String(chat.id) && "bg-muted"
            )}
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={chat.other_user?.avatar_url} />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="font-semibold truncate text-sm">{fullName || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">Re: {chat.listings?.title}</p>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}