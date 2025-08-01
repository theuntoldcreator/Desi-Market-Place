import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { Skeleton } from '../ui/skeleton';

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
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!session || !chatDetails || !otherUser) throw new Error("Chat is not ready.");
      const { error } = await supabase.from('messages').insert({ chat_id: parseInt(chatId), sender_id: session.user.id, receiver_id: otherUser.id, content });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setNewMessage('');
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `Message failed to send: ${error.message}`, variant: "destructive" });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView();
  }, [messages]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat-room:${chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatId, queryClient]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  if (chatDetailsLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  const fullName = `${otherUser?.first_name || ''} ${otherUser?.last_name || ''}`.trim();
  const fallback = fullName ? fullName[0].toUpperCase() : '?';

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center p-3 border-b">
        <Link to="/chats" className="md:hidden mr-2">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Avatar>
          <AvatarImage src={otherUser?.avatar_url} alt={fullName} />
          <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
        <div className="ml-3">
          <p className="font-semibold">{fullName}</p>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messagesLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/5" />
            <Skeleton className="h-12 w-3/5 ml-auto" />
            <Skeleton className="h-12 w-2/5" />
          </div>
        ) : (
          messages.map((message) => {
            const isSender = message.sender_id === session?.user.id;
            return (
              <div key={message.id} className={cn("flex items-end gap-2", isSender ? "justify-end" : "justify-start")}>
                {!isSender && (
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={message.sender?.avatar_url} />
                    <AvatarFallback>{message.sender?.first_name?.[0]}</AvatarFallback>
                  </Avatar>
                )}
                <div className={cn("max-w-xs md:max-w-md p-3 rounded-lg", isSender ? "bg-primary text-primary-foreground" : "bg-muted")}>
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t bg-background">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." autoComplete="off" />
          <Button type="submit" size="icon" disabled={sendMessageMutation.isPending || !newMessage.trim()}>
            {sendMessageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}