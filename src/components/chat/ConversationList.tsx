import { useQuery } from '@tanstack/react-query';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Link, useParams } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Profile } from '@/types';

interface ChatWithUsers extends App.Chat {
  user1: Profile;
  user2: Profile;
}

export function ConversationList({ selectedChatId }: { selectedChatId?: string }) {
  const session = useSession();
  const supabase = useSupabaseClient();

  const { data: chats, isLoading } = useQuery({
    queryKey: ['chats', session?.user?.id],
    queryFn: async () => {
      if (!session) return [];
      const { data, error } = await supabase
        .from('chats')
        .select('*, user1:profiles!chats_user1_id_fkey(*), user2:profiles!chats_user2_id_fkey(*)')
        .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ChatWithUsers[];
    },
    enabled: !!session,
  });

  return (
    <aside className="w-80 border-r bg-white overflow-y-auto">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold">Conversations</h2>
      </div>
      <nav className="p-2 space-y-1">
        {isLoading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        {chats?.map((chat) => {
          const otherUser = chat.user1.id === session?.user?.id ? chat.user2 : chat.user1;
          return (
            <Link
              key={chat.id}
              to={`/messages/${chat.id}`}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors',
                selectedChatId === String(chat.id) && 'bg-primary/10 text-primary'
              )}
            >
              <Avatar>
                <AvatarImage src={otherUser.avatar_url} alt={otherUser.full_name} />
                <AvatarFallback>{otherUser.full_name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 truncate">
                <p className="font-semibold truncate">{otherUser.full_name}</p>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}