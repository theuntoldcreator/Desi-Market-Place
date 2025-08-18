import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMessages, useSendMessage } from '@/hooks/use-messaging';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, ArrowLeft } from 'lucide-react';
import { MessageBubble } from '@/components/messaging/MessageBubble';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const fetchConversationDetails = async (conversationId: string, currentUserId: string) => {
  const { data: fullData, error: fullError } = await supabase
    .from('conversations')
    .select('*, listing:listings(*), buyer:profiles!conversations_buyer_id_fkey(*), seller:profiles!conversations_seller_id_fkey(*)')
    .eq('id', conversationId)
    .single();

  if (fullError) throw new Error(fullError.message);

  const otherUser = fullData.buyer.id === currentUserId ? fullData.seller : fullData.buyer;

  return {
    listing: fullData.listing,
    otherUser: otherUser,
  };
};

export default function Conversation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, session, loading: authLoading } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading: messagesLoading } = useMessages(id!);
  const sendMessage = useSendMessage(id!);

  const { data: conversationDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['conversationDetails', id, user?.id],
    queryFn: () => fetchConversationDetails(id!, user!.id),
    enabled: !!id && !!user,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!authLoading && !session) {
    navigate('/login');
    return null;
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessage.mutate(newMessage.trim());
      setNewMessage('');
    }
  };

  const otherUserName = `${conversationDetails?.otherUser.first_name || ''} ${conversationDetails?.otherUser.last_name || ''}`.trim();

  return (
    <div className="w-full h-screen flex flex-col">
      <Header />
      <div className="flex-grow flex flex-col overflow-hidden">
        {detailsLoading ? (
          <div className="flex items-center justify-center h-20 border-b"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="border-b p-3 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/messages')} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-grow">
              <p className="font-bold">{otherUserName}</p>
              <Link to={`/?openListing=${conversationDetails?.listing.id}`} className="text-sm text-muted-foreground hover:underline truncate">
                {conversationDetails?.listing.title}
              </Link>
            </div>
            <img src={conversationDetails?.listing.image_urls[0]} alt={conversationDetails?.listing.title} className="w-12 h-12 object-cover rounded-md" />
          </div>
        )}

        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {messagesLoading && !messages.length ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            messages.map(msg => <MessageBubble key={msg.id} message={msg} isSender={msg.sender_id === user?.id} />)
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t bg-background">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              autoComplete="off"
            />
            <Button type="submit" size="icon" disabled={sendMessage.isPending}>
              {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}