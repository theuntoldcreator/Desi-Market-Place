import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

const fetchChats = async (userId: string) => {
  const { data: chats, error: chatsError } = await supabase
    .from('chats')
    .select('*, listings(title, user_id)')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (chatsError) throw new Error(chatsError.message);
  if (!chats) return [];

  const otherUserIds = chats.map(chat => chat.buyer_id === userId ? chat.seller_id : chat.buyer_id);
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, avatar_url')
    .in('id', otherUserIds);
  
  if (profilesError) throw new Error(profilesError.message);

  const profilesById = profiles.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {} as any);

  return chats.map(chat => {
    const otherUserId = chat.buyer_id === userId ? chat.seller_id : chat.buyer_id;
    return {
      ...chat,
      other_user: profilesById[otherUserId],
    };
  });
};

export function ChatList({ selectedChatId }: { selectedChatId?: string }) {
  const session = useSession();
  const queryClient = useQueryClient();
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
        {
          event: '*',
          schema: 'public',
          table: 'chats',
          filter: `or(buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id})`,
        },
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
    return <div className="p-2 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  if (!chats || chats.length === 0) {
    return <div className="p-4 text-center text-sm text-muted-foreground">No conversations yet.</div>;
  }

  return (
    <div className="p-2 space-y-1">
      {chats?.map(chat => {
        const fullName = `${chat.other_user?.first_name || ''} ${chat.other_user?.last_name || ''}`.trim();
        const fallback = fullName ? fullName[0].toUpperCase() : '?';
        return (
          <Link
            key={chat.id}
            to={`/chats/${chat.id}`}
            className={cn(
              "block p-3 rounded-lg hover:bg-muted",
              selectedChatId === chat.id.toString() && "bg-secondary"
            )}
          >
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={chat.other_user?.avatar_url} />
                <AvatarFallback>{fallback}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="font-semibold truncate">{fullName || "User"}</p>
                <p className="text-sm text-muted-foreground truncate">Re: {chat.listings?.title}</p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}