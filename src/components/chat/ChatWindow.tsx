import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', chatId],
    queryFn: () => fetchMessages(chatId),
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!session) throw new Error("Not authenticated");
      const { data: chatData } = await supabase.from('chats').select('buyer_id, seller_id').eq('id', chatId).single();
      if (!chatData) throw new Error("Chat not found");
      const receiverId = session.user.id === chatData.buyer_id ? chatData.seller_id : chatData.buyer_id;

      const { error } = await supabase.from('messages').insert({
        chat_id: parseInt(chatId),
        sender_id: session.user.id,
        receiver_id: receiverId,
        content,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setNewMessage('');
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, queryClient]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messages.map(message => {
          const isSender = message.sender_id === session?.user.id;
          const senderProfile = message.sender as any;
          const fullName = `${senderProfile?.first_name || ''} ${senderProfile?.last_name || ''}`.trim();
          const fallback = fullName ? fullName[0].toUpperCase() : '?';
          return (
            <div key={message.id} className={cn("flex items-end gap-2", isSender && "justify-end")}>
              {!isSender && (
                <Avatar className="w-8 h-8">
                  <AvatarImage src={senderProfile?.avatar_url} />
                  <AvatarFallback>{fallback}</AvatarFallback>
                </Avatar>
              )}
              <div className={cn(
                "max-w-xs md:max-w-md p-3 rounded-lg",
                isSender ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted rounded-bl-none"
              )}>
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t bg-white">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            autoComplete="off"
          />
          <Button type="submit" size="icon" disabled={sendMessageMutation.isPending}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}