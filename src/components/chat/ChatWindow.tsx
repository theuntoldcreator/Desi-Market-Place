import { useEffect, useRef } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Message } from '@/types';
import { MessageInput } from './MessageInput';
import { MessageBubble } from './MessageBubble';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const MESSAGES_PER_PAGE = 20;

export function ChatWindow({ chatId }: { chatId: string }) {
  const session = useSession();
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['messages', chatId],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles(id, full_name, avatar_url)')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + MESSAGES_PER_PAGE - 1);
      if (error) throw error;
      return data.reverse();
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < MESSAGES_PER_PAGE) return undefined;
      return allPages.length * MESSAGES_PER_PAGE;
    },
    staleTime: Infinity,
  });

  const { data: chatInfo } = useQuery({
    queryKey: ['chatInfo', chatId],
    queryFn: async () => {
      const { data } = await supabase.from('chats').select('*, user1:profiles(*), user2:profiles(*)').eq('id', chatId).single();
      return data;
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView();
  }, [data]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        async (payload) => {
          const { data: senderProfile } = await supabase.from('profiles').select('*').eq('id', payload.new.sender_id).single();
          const newMessage = { ...payload.new, sender: senderProfile };
          queryClient.setQueryData(['messages', chatId], (oldData: any) => {
            const lastPageIndex = oldData.pages.length - 1;
            const newPages = [...oldData.pages];
            newPages[lastPageIndex] = [...newPages[lastPageIndex], newMessage];
            return { ...oldData, pages: newPages };
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatId, supabase, queryClient]);

  const messages = data?.pages.flatMap((page) => page) ?? [];
  const otherUser = chatInfo && (chatInfo.user1.id === session?.user?.id ? chatInfo.user2 : chatInfo.user1);

  return (
    <div className="flex-1 flex flex-col bg-white">
      <header className="p-4 border-b flex items-center gap-4">
        {otherUser && <>
          <Avatar><AvatarImage src={otherUser.avatar_url} /><AvatarFallback>{otherUser.full_name?.[0]}</AvatarFallback></Avatar>
          <h3 className="text-lg font-semibold">{otherUser.full_name}</h3>
        </>}
      </header>
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {hasNextPage && (
          <div className="text-center">
            <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} variant="outline" size="sm">
              {isFetchingNextPage ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load More'}
            </Button>
          </div>
        )}
        {isLoading && <div className="flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}
        {messages.map((message: Message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput chatId={chatId} receiverId={otherUser?.id} />
    </div>
  );
}