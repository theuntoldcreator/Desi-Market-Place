import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ChatHeader } from './ChatHeader';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', chatId],
    queryFn: () => fetchMessages(chatId),
    enabled: !!chatId,
  });

  const { data: chatDetails, isLoading: chatDetailsLoading } = useQuery({
    queryKey: ['chatDetails', chatId],
    queryFn: async () => {
      const { data, error } = await supabase.from('chats').select('*, buyer:profiles!chats_buyer_id_fkey(*), seller:profiles!chats_seller_id_fkey(*)').eq('id', chatId).single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!chatId,
  });

  const otherUser = session?.user.id === chatDetails?.buyer_id ? chatDetails?.seller : chatDetails?.buyer;

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!session || !otherUser) throw new Error("User or chat session not found.");
      const { error } = await supabase.from('messages').insert({
        chat_id: parseInt(chatId),
        sender_id: session.user.id,
        receiver_id: otherUser.id,
        content,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `Failed to send message: ${error.message}`, variant: "destructive" });
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('delete-chat', { body: { chatId } });
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!chatId || !session?.user.id) return;

    const handlePostgresChanges = (payload: any) => {
      if (payload.eventType === 'INSERT' && payload.new.sender_id === session.user.id) {
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
    };

    const channel = supabase.channel(`chat-window:${chatId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, handlePostgresChanges)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, session?.user.id, queryClient]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  const isComponentLoading = messagesLoading || chatDetailsLoading;
  if (isComponentLoading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <>
      <div className="flex-1 flex flex-col bg-white h-full">
        <ChatHeader user={otherUser} onDeleteChat={() => setIsDeleteDialogOpen(true)} />
        <div className="flex-1 p-4 space-y-1 overflow-y-auto">
          {messages.map((message, index) => {
            const isSender = message.sender_id === session?.user.id;
            const prevMessage = messages[index - 1];
            const isFirstInGroup = !prevMessage || prevMessage.sender_id !== message.sender_id;
            const isLastInGroup = !messages[index + 1] || messages[index + 1].sender_id !== message.sender_id;
            const showAvatar = !isSender && isLastInGroup;

            return (
              <div key={message.id} className={cn("flex items-end gap-2 group", isSender ? "justify-end" : "justify-start")}>
                <div className={cn("flex items-end gap-2", isSender && "flex-row-reverse")}>
                  <Avatar className={cn("w-8 h-8", !showAvatar && "invisible")}><AvatarImage src={message.sender?.avatar_url} /><AvatarFallback>{message.sender?.first_name?.[0]}</AvatarFallback></Avatar>
                  <div className={cn("max-w-xs md:max-w-md p-3 rounded-2xl", isSender ? "bg-primary text-primary-foreground" : "bg-muted", isFirstInGroup && (isSender ? 'rounded-tr-md' : 'rounded-tl-md'), isLastInGroup && (isSender ? 'rounded-br-md' : 'rounded-bl-md'))}>
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t bg-white">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." autoComplete="off" />
            <Button type="submit" size="icon" disabled={sendMessageMutation.isPending || !newMessage.trim()}>
              {sendMessageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </div>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat permanently?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The entire conversation will be deleted for you and the other user.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteChatMutation.mutate()} disabled={deleteChatMutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteChatMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}