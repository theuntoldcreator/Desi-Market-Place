import { useQuery } from '@tanstack/react-query';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Chat } from '@/types';
import { Badge } from '../ui/badge';

const ConversationItem = ({ chat, currentUserId, selectedChatId }: { chat: Chat, currentUserId: string, selectedChatId?: string }) => {
  const otherUser = chat.buyer.id === currentUserId ? chat.seller : chat.buyer;
  const isSelected = selectedChatId === String(chat.id);

  return (
    <Link
      to={`/messages/${chat.id}`}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors',
        isSelected && 'bg-primary/10'
      )}
    >
      <Avatar>
        <AvatarImage src={otherUser.avatar_url} alt={otherUser.full_name} />
        <AvatarFallback>{otherUser.full_name?.[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1 truncate">
        <div className="flex justify-between items-center">
          <p className={cn("font-semibold truncate", isSelected && "text-primary")}>{otherUser.full_name}</p>
          {chat.status === 'pending' && chat.seller.id === currentUserId && <Badge variant="default" className="bg-amber-500">New</Badge>}
        </div>
        <p className="text-sm text-muted-foreground truncate">{chat.listing.title}</p>
      </div>
    </Link>
  );
};

export function ConversationList({ selectedChatId }: { selectedChatId?: string }) {
  const session = useSession();
  const supabase = useSupabaseClient();

  const { data: chats, isLoading } = useQuery({
    queryKey: ['chats', session?.user?.id],
    queryFn: async () => {
      if (!session) return [];
      const { data, error } = await supabase
        .from('chats')
        .select('*, buyer:profiles!chats_buyer_id_fkey(*), seller:profiles!chats_seller_id_fkey(*), listing:listings(title, image_urls)')
        .or(`buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Chat[];
    },
    enabled: !!session,
  });

  const pendingRequests = chats?.filter(c => c.status === 'pending' && c.seller.id === session?.user?.id) || [];
  const activeChats = chats?.filter(c => c.status === 'active') || [];
  const otherChats = chats?.filter(c => !pendingRequests.includes(c) && !activeChats.includes(c)) || [];

  return (
    <aside className="hidden md:block w-96 border-r bg-white overflow-y-auto">
      <div className="p-4 border-b"><h2 className="text-xl font-bold">Conversations</h2></div>
      <nav className="p-2 space-y-4">
        {isLoading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        
        {pendingRequests.length > 0 && (
          <div>
            <h3 className="px-3 text-xs font-semibold uppercase text-muted-foreground">Pending Requests</h3>
            <div className="mt-1 space-y-1">
              {pendingRequests.map(chat => <ConversationItem key={chat.id} chat={chat} currentUserId={session!.user.id} selectedChatId={selectedChatId} />)}
            </div>
          </div>
        )}

        {activeChats.length > 0 && (
          <div>
            <h3 className="px-3 text-xs font-semibold uppercase text-muted-foreground">Active Chats</h3>
            <div className="mt-1 space-y-1">
              {activeChats.map(chat => <ConversationItem key={chat.id} chat={chat} currentUserId={session!.user.id} selectedChatId={selectedChatId} />)}
            </div>
          </div>
        )}

        {otherChats.length > 0 && (
           <div>
            <h3 className="px-3 text-xs font-semibold uppercase text-muted-foreground">Archived</h3>
            <div className="mt-1 space-y-1">
              {otherChats.map(chat => <ConversationItem key={chat.id} chat={chat} currentUserId={session!.user.id} selectedChatId={selectedChatId} />)}
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}