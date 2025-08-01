import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useDebouncedCallback } from 'use-debounce';

const fetchMessages = async (chatId: string) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:profiles(first_name, last_name, avatar_url)')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

export function ChatWindow({ chatId }: { chatId: string }) {
  const session = useSession();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', chatId],
    queryFn: () => fetchMessages(chatId),
  });

  const { data: chatDetails } = useQuery({
    queryKey: ['chatDetails', chatId],
    queryFn: async () => {
      const { data, error } = await supabase.from('chats').select('*, buyer:profiles!chats_buyer_id_fkey(*), seller:profiles!chats_seller_id_fkey(*)').eq('id', chatId).single();
      if (error) throw new Error(error.message);
      return data;
    },
  });
  const otherUser = session?.user.id === chatDetails?.buyer_id ? chatDetails?.seller : chatDetails?.buyer;

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!session) return;
      await supabase.from('messages').update({ is_read: true }).eq('chat_id', chatId).eq('receiver_id', session.user.id).eq('is_read', false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['unreadMessagesCount', session?.user?.id] })
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!session || !chatDetails) throw new Error("Not authenticated or chat not found");
      const receiverId = session.user.id === chatDetails.buyer_id ? chatDetails.seller_id : chatDetails.buyer_id;
      await supabase.from('messages').insert({ chat_id: parseInt(chatId), sender_id: session.user.id, receiver_id: receiverId, content });
    },
    onSuccess: () => setNewMessage(''),
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      await supabase.from('messages').delete().eq('id', messageId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages', chatId] })
  });

  useEffect(() => {
    if (chatId && session) markAsReadMutation.mutate();
  }, [chatId, session, messages.length, markAsReadMutation]);

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
    if (newMessage.trim()) sendMessageMutation.mutate(newMessage.trim());
  };

  if (isLoading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="flex-1 p-4 space-y-1 overflow-y-auto">
        {messages.map((message, index) => {
          const isSender = message.sender_id === session?.user.id;
          const prevMessage = messages[index - 1];
          const showAvatar = !isSender && (!prevMessage || prevMessage.sender_id !== message.sender_id);
          const senderProfile = message.sender as any;
          const fullName = `${senderProfile?.first_name || ''} ${senderProfile?.last_name || ''}`.trim();
          const fallback = fullName ? fullName[0].toUpperCase() : '?';
          return (
            <div key={message.id} className={cn("flex items-end gap-2 group", isSender && "justify-end")} onMouseEnter={() => setHoveredMessageId(message.id)} onMouseLeave={() => setHoveredMessageId(null)}>
              {isSender && hoveredMessageId === message.id && <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground opacity-50 hover:opacity-100" onClick={() => deleteMessageMutation.mutate(message.id)}><Trash2 className="h-4 w-4" /></Button>}
              <div className={cn("flex items-end gap-2", isSender && "flex-row-reverse")}>
                <Avatar className={cn("w-8 h-8", !showAvatar && "invisible")}><AvatarImage src={senderProfile?.avatar_url} /><AvatarFallback>{fallback}</AvatarFallback></Avatar>
                <div className={cn("max-w-xs md:max-w-md p-3 rounded-lg", isSender ? "bg-primary text-primary-foreground" : "bg-muted")}>
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <div className="h-8 px-4">
        {isTyping && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Avatar className="w-8 h-8"><AvatarImage src={otherUser?.avatar_url} /><AvatarFallback>{otherUser?.first_name?.[0]}</AvatarFallback></Avatar>
            <div className="bg-muted px-4 py-2 rounded-full"><div className="typing-indicator"><span /><span /><span /></div></div>
          </div>
        )}
      </div>
      <div className="p-4 border-t bg-white">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <Input value={newMessage} onChange={(e) => { setNewMessage(e.target.value); broadcastTyping(); }} placeholder="Type a message..." autoComplete="off" />
          <Button type="submit" size="icon" disabled={sendMessageMutation.isPending}><Send className="w-4 h-4" /></Button>
        </form>
      </div>
    </div>
  );
}