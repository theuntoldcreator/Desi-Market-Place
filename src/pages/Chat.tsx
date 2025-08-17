import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowLeft, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';

type ProfileStub = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

type ConversationDetails = {
  id: string;
  buyer: ProfileStub;
  seller: ProfileStub;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

const fetchConversationDetails = async (conversationId: string, userId: string): Promise<ConversationDetails> => {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      buyer:public_profiles!buyer_id(id, first_name, last_name, avatar_url),
      seller:public_profiles!seller_id(id, first_name, last_name, avatar_url)
    `)
    .eq('id', conversationId)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as ConversationDetails;
};

const fetchMessages = async (conversationId: string): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

export default function Chat() {
  const { conversationId } = useParams();
  const session = useSession();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState('');
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversation, isLoading: isLoadingConversation, isError: isErrorConversation } = useQuery<ConversationDetails>({
    queryKey: ['conversation', conversationId],
    queryFn: () => fetchConversationDetails(conversationId!, session!.user.id),
    enabled: !!session && !!conversationId,
  });

  const { data: initialMessages, isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: ['messages', conversationId],
    queryFn: () => fetchMessages(conversationId!),
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (initialMessages) {
      setChatMessages(initialMessages);
    }
  }, [initialMessages]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on<Message>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setChatMessages((prevMessages) => {
            if (prevMessages.some(msg => msg.id === payload.new.id)) {
              return prevMessages;
            }
            return [...prevMessages, payload.new];
          });
          queryClient.invalidateQueries({ queryKey: ['conversations', session?.user?.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient, session?.user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = async () => {
    if (messageText.trim() && session) {
      const textToSend = messageText.trim();
      setMessageText('');
      
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: session.user.id,
        body: textToSend,
      });
    }
  };

  const otherUser = conversation 
    ? (conversation.buyer.id === session?.user?.id ? conversation.seller : conversation.buyer)
    : null;

  if (isLoadingConversation || isLoadingMessages) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (isErrorConversation || !conversation || !otherUser) return <div className="flex h-screen w-full items-center justify-center text-destructive">Conversation not found or access denied.</div>;

  const fullName = `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim();
  const fallback = fullName ? fullName[0].toUpperCase() : '?';

  return (
    <div className="flex flex-col h-screen bg-muted">
      <header className="flex items-center gap-4 p-3 border-b bg-background sticky top-0 z-10">
        <Button asChild variant="ghost" size="icon" className="sm:hidden">
          <Link to="/messages"><ArrowLeft /></Link>
        </Button>
        <Avatar>
          <AvatarImage src={otherUser.avatar_url || undefined} />
          <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold">{fullName}</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender_id === session?.user?.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md p-3 rounded-2xl ${msg.sender_id === session?.user?.id ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-background rounded-bl-none'}`}>
              <p className="text-sm">{msg.body}</p>
              <p className={`text-xs mt-1 ${msg.sender_id === session?.user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'} text-right`}>
                {format(new Date(msg.created_at), 'p')}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>

      <footer className="p-3 border-t bg-background sticky bottom-0">
        <div className="flex items-center gap-2">
          <Input 
            placeholder="Type a message..." 
            className="flex-1" 
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button onClick={handleSend} disabled={!messageText.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
}