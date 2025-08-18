import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMessages, useSendMessage } from '@/hooks/use-messaging';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChat } from '@/components/messaging/RealtimeChat';
import { ChatMessage, Message } from '@/lib/types';

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

const transformDbMessageToChatMessage = (msg: Message): ChatMessage => {
  const userName = `${msg.profiles?.first_name || ''} ${msg.profiles?.last_name || ''}`.trim() || 'User';
  return {
    id: msg.id,
    content: msg.body,
    user: { name: userName },
    createdAt: msg.created_at,
  };
};

export default function Conversation() {
  const { id: conversationId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, session, loading: authLoading } = useAuth();

  const { data: initialDbMessages = [], isLoading: messagesLoading } = useMessages(conversationId!);
  const sendMessageMutation = useSendMessage();

  const { data: conversationDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['conversationDetails', conversationId, user?.id],
    queryFn: () => fetchConversationDetails(conversationId!, user!.id),
    enabled: !!conversationId && !!user,
  });

  const initialChatMessages = useMemo(() => {
    return initialDbMessages.map(transformDbMessageToChatMessage);
  }, [initialDbMessages]);

  if (!authLoading && !session) {
    navigate('/login');
    return null;
  }

  const currentUsername = user ? `${user.user_metadata.first_name || ''} ${user.user_metadata.last_name || ''}`.trim() || 'You' : '';

  const handleSendMessage = async (content: string): Promise<ChatMessage | null> => {
    if (!conversationId || !user) return null;
    try {
      const persistedMessage = await sendMessageMutation.mutateAsync({ conversationId, body: content });
      // The persistedMessage doesn't have profile info, so we construct the ChatMessage manually for broadcast
      return {
        id: persistedMessage.id,
        content: persistedMessage.body,
        user: { name: currentUsername },
        createdAt: persistedMessage.created_at,
      };
    } catch (error) {
      console.error("Failed to send message:", error);
      // You could add a toast notification here for the user
      return null;
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
            <div className="flex-grow overflow-hidden">
              <p className="font-bold truncate">{otherUserName}</p>
              {conversationDetails?.listing && (
                <Link to={`/?openListing=${conversationDetails.listing.id}`} className="text-sm text-muted-foreground hover:underline truncate block">
                  {conversationDetails.listing.title}
                </Link>
              )}
            </div>
            {conversationDetails?.listing && (
              <img src={conversationDetails.listing.image_urls[0]} alt={conversationDetails.listing.title} className="w-12 h-12 object-cover rounded-md flex-shrink-0" />
            )}
          </div>
        )}

        {messagesLoading ? (
          <div className="flex-grow flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : (
          <RealtimeChat
            roomName={conversationId!}
            username={currentUsername}
            initialMessages={initialChatMessages}
            onMessage={handleSendMessage}
          />
        )}
      </div>
    </div>
  );
}