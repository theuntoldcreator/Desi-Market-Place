import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Trash2, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useDebouncedCallback } from 'use-debounce';
import { ChatHeader } from './ChatHeader';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from '../ui/skeleton';
import { format } from 'date-fns';

const fetchMessages = async (chatId: string) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:profiles(id, first_name, last_name, avatar_url)')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

export function ChatWindow({ chatId }: { chatId: string }) {
  const session = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', chatId],
    queryFn: () => fetchMessages(chatId),
  });

  const { data: chatDetails, isLoading: chatDetailsLoading } = useQuery({
    queryKey: ['chatDetails', chatId],
    queryFn: async () => {
      const { data, error } = await supabase.from('chats').select('*, buyer:profiles!chats_buyer_id_fkey(*), seller:profiles!chats_seller_id_fkey(*)').eq('id', chatId).single();
      if (error) throw new Error(error.message);
      return data;
    },
  });
  const otherUser = session?.user.id === chatDetails?.buyer_id ? chatDetails?.seller : chatDetails?.buyer;

  const { data: sessionProfile } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session) return null;
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      return data;
    },
    enabled: !!session,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!session) return;
      await supabase.from('messages').update({ is_read: true }).eq('chat_id', chatId).eq('receiver_id', session.user.id).eq('is_read', false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unreadMessagesCount', session?.user?.id] });
      queryClient.invalidateQueries({ queryKey: ['chats', session?.user?.id] });
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!session || !chatDetails || !otherUser) throw new Error("Chat is not ready.");
      const { error } = await supabase.from('messages').insert({ chat_id: parseInt(chatId), sender_id: session.user.id, receiver_id: otherUser.id, content });
      if (error) throw new Error(error.message);
    },
    onMutate: async (content: string) => {
      await queryClient.cancelQueries({ queryKey: ['messages', chatId] });
      const previousMessages = queryClient.getQueryData(['messages', chatId]);
      const optimisticMessage = {
        id: `optimistic-${Date.now()}`,
        created_at: new Date().toISOString(),
        content,
        chat_id: parseInt(chatId),
        sender_id: session!.user.id,
        receiver_id: otherUser!.id,
        is_read: false,
        sender: sessionProfile,
      };
      queryClient.setQueryData(['messages', chatId], (old: any[] | undefined) => old ? [...old, optimisticMessage] : [optimisticMessage]);
      setNewMessage('');
      return { previousMessages };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(['messages', chatId], context?.previousMessages);
      toast({ title: "Error", description: "Message failed to send.", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      await supabase.from('messages').delete().eq('id', messageId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages', chatId] })
  });

  const deleteChatMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('delete-chat', { body: { chatId: parseInt(chatId) } });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Chat Deleted", description: "The conversation has been removed." });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      navigate('/chats');
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `Could not delete chat: ${error.message}`, variant: "destructive" });
    },
    onSettled: () => setIsDeleteDialogOpen(false)
  });

  useEffect(() => {
    if (chatId && session && messages.length > 0) {
      const unreadMessagesExist = messages.some(m => !m.is_read && m.receiver_id === session.user.id);
      if (unreadMessagesExist) {
        markAsReadMutation.mutate();
      }
    }
  }, [chatId, session, messages, markAsReadMutation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const broadcastTyping = useDebouncedCallback(() => {
    if (channelRef.current) channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { senderId: session?.user.id } });
  }, 500);

  useEffect(() => {
    if (!chatId) return;
    const realtimeChannel = supabase.channel(`chat:${chatId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        () => queryClient.invalidateQueries({ queryKey: ['messages', chatId] })
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.senderId !== session?.user.id) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 3000);
        }
      })
      .subscribe();
    channelRef.current = realtimeChannel;
    return () => { supabase.removeChannel(realtimeChannel); };
  }, [chatId, queryClient, session?.user.id]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  if (chatDetailsLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="flex items-center p-3 border-b">
            <Link to="/chats" className="md:hidden mr-2"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
            <ChatHeader user={otherUser} onDeleteChat={() => setIsDeleteDialogOpen(true)} />
        </div>
        <div className="flex-1 p-4 space-y-1 overflow-y-auto">
          {messagesLoading ? <div className="space-y-4"><Skeleton className="h-12 w-3/5" /><Skeleton className="h-12 w-3/5 ml-auto" /><Skeleton className="h-12 w-2/5" /></div> :
            messages.map((message, index) => {
              const isSender = message.sender_id === session?.user.id;
              const prevMessage = messages[index - 1];
              const isFirstInGroup = !prevMessage || prevMessage.sender_id !== message.sender_id;
              return (
                <div key={message.id} className={cn("flex items-end gap-2 group", isSender ? "justify-end" : "justify-start")} onMouseEnter={() => setHoveredMessageId(message.id)} onMouseLeave={() => setHoveredMessageId(null)}>
                  {isSender && typeof message.id === 'number' && hoveredMessageId === message.id && <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground opacity-50 hover:opacity-100" onClick={() => deleteMessageMutation.mutate(message.id as number)}><Trash2 className="h-4 w-4" /></Button>}
                  <div className={cn("flex flex-col", isSender ? "items-end" : "items-start")}>
                    <div className={cn("flex items-end gap-2", isSender && "flex-row-reverse")}>
                      {!isSender && <Avatar className={cn("w-8 h-8", !isFirstInGroup && "invisible")}><AvatarImage src={message.sender?.avatar_url} /><AvatarFallback>{message.sender?.first_name?.[0]}</AvatarFallback></Avatar>}
                      <div className={cn("max-w-xs md:max-w-md p-3 rounded-2xl", isSender ? "bg-primary text-primary-foreground" : "bg-muted", isFirstInGroup && (isSender ? 'rounded-tr-md' : 'rounded-tl-md'))}>
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground px-2 pt-1">{format(new Date(message.created_at), 'p')}</p>
                  </div>
                </div>
              );
            })}
          <div ref={messagesEndRef} />
        </div>
        <div className="h-8 px-4">
          {isTyping && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Avatar className="w-8 h-8"><AvatarImage src={otherUser?.avatar_url} /><AvatarFallback>{otherUser?.first_name?.[0]}</AvatarFallback></Avatar><div className="bg-muted px-4 py-2 rounded-full"><div className="typing-indicator"><span /><span /><span /></div></div></div>}
        </div>
        <div className="p-4 border-t bg-background">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <Input value={newMessage} onChange={(e) => { setNewMessage(e.target.value); broadcastTyping(); }} placeholder="Type a message..." autoComplete="off" />
            <Button type="submit" size="icon" disabled={sendMessageMutation.isPending || !newMessage.trim()}>
              {sendMessageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </div>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this chat permanently?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. The entire conversation will be deleted for you and the other user.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteChatMutation.mutate()} disabled={deleteChatMutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{deleteChatMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete Chat</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}