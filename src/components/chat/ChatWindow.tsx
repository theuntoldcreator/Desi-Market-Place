import { useEffect, useRef } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Message, Chat, ChatStatus } from '@/types';
import { MessageInput } from './MessageInput';
import { MessageBubble } from './MessageBubble';
import { Button } from '../ui/button';
import { Loader2, Check, X, LogOut, Info } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

const MESSAGES_PER_PAGE = 20;

const ChatHeader = ({ chat, currentUserId }: { chat: Chat, currentUserId: string }) => {
  const queryClient = useQueryClient();
  const supabase = useSupabaseClient();
  const { toast } = useToast();

  const otherUser = chat.buyer.id === currentUserId ? chat.seller : chat.buyer;

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: ChatStatus) => {
      const { error } = await supabase.from('chats').update({ status: newStatus }).eq('id', chat.id);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus) => {
      toast({ title: `Conversation ${newStatus === 'active' ? 'accepted' : newStatus}` });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['chatInfo', String(chat.id)] });
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  return (
    <header className="p-4 border-b flex items-center justify-between gap-4 bg-white">
      <div className="flex items-center gap-4">
        <Avatar><AvatarImage src={otherUser.avatar_url} /><AvatarFallback>{otherUser.full_name?.[0]}</AvatarFallback></Avatar>
        <div className="flex-1 truncate">
          <h3 className="text-lg font-semibold truncate">{otherUser.full_name}</h3>
          <p className="text-sm text-muted-foreground truncate">{chat.listing.title}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {chat.status === 'pending' && chat.seller.id === currentUserId && (
          <>
            <Button size="sm" variant="destructive" onClick={() => updateStatusMutation.mutate('declined')}><X className="w-4 h-4 mr-2" />Decline</Button>
            <Button size="sm" onClick={() => updateStatusMutation.mutate('active')}><Check className="w-4 h-4 mr-2" />Accept</Button>
          </>
        )}
        {chat.status === 'active' && (
          <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate('ended')}><LogOut className="w-4 h-4 mr-2" />End Chat</Button>
        )}
      </div>
    </header>
  );
};

const ChatStatusAlert = ({ status, isSeller }: { status: ChatStatus, isSeller: boolean }) => {
  const messages = {
    pending: isSeller ? "Awaiting your response. Accept to start chatting." : "Your request is pending. The seller will be notified.",
    declined: "This chat request was declined.",
    ended: "This conversation has ended. To start a new one, please ping the seller again from the listing.",
  };
  const message = messages[status as keyof typeof messages];
  if (!message) return null;

  return (
    <div className="p-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Notice</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  );
};

export function ChatWindow({ chatId }: { chatId: string }) {
  const session = useSession();
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: chatInfo, isLoading: isChatInfoLoading } = useQuery({
    queryKey: ['chatInfo', chatId],
    queryFn: async () => {
      const { data, error } = await supabase.from('chats').select('*, buyer:profiles!chats_buyer_id_fkey(*), seller:profiles!chats_seller_id_fkey(*), listing:listings(title, image_urls)').eq('id', chatId).single();
      if (error) throw error;
      return data as Chat;
    },
  });

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: areMessagesLoading } = useInfiniteQuery({
    queryKey: ['messages', chatId],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase.from('messages').select('*, sender:profiles(id, full_name, avatar_url)').eq('chat_id', chatId).order('created_at', { ascending: false }).range(pageParam, pageParam + MESSAGES_PER_PAGE - 1);
      if (error) throw error;
      return data.reverse();
    },
    getNextPageParam: (lastPage) => lastPage.length < MESSAGES_PER_PAGE ? undefined : (data?.pages.length || 0) * MESSAGES_PER_PAGE,
    enabled: !!chatInfo && chatInfo.status === 'active',
  });

  useEffect(() => {
    if (chatInfo?.status === 'active') messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data, chatInfo]);

  useEffect(() => {
    const channel = supabase.channel(`chat:${chatId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'chats', filter: `id=eq.${chatId}` }, () => {
      queryClient.invalidateQueries({ queryKey: ['chatInfo', chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    }).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, async (payload) => {
      const { data: senderProfile } = await supabase.from('profiles').select('*').eq('id', payload.new.sender_id).single();
      queryClient.setQueryData(['messages', chatId], (old: any) => ({ ...old, pages: old.pages.map((p: any, i: number) => i === old.pages.length - 1 ? [...p, { ...payload.new, sender: senderProfile }] : p) }));
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatId, supabase, queryClient]);

  if (isChatInfoLoading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!chatInfo || !session) return <div className="flex-1 flex items-center justify-center">Could not load chat.</div>;

  const messages = data?.pages.flatMap((page) => page) ?? [];
  const isSeller = chatInfo.seller.id === session.user.id;

  return (
    <div className="flex-1 flex flex-col bg-white">
      <ChatHeader chat={chatInfo} currentUserId={session.user.id} />
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {hasNextPage && <div className="text-center"><Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} variant="outline" size="sm">{isFetchingNextPage ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load More'}</Button></div>}
        {areMessagesLoading && <div className="flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}
        {chatInfo.status === 'active' && messages.map((message: Message) => <MessageBubble key={message.id} message={message} />)}
        <div ref={messagesEndRef} />
      </div>
      {chatInfo.status !== 'active' ? <ChatStatusAlert status={chatInfo.status} isSeller={isSeller} /> : <MessageInput chatId={chatId} receiverId={isSeller ? chatInfo.buyer.id : chatInfo.seller.id} />}
    </div>
  );
}