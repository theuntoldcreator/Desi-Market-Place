import { useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMessages, useSendMessage, useConversations } from '@/hooks/use-firebase-messaging';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { RealtimeChat } from '@/realtime/components/realtime-chat';
import { ChatMessage, Message as FirebaseMessage } from '@/lib/types';

const transformFirebaseMessageToChatMessage = (msg: FirebaseMessage, profiles: Map<string, { name: string }>): ChatMessage => {
  const userProfile = profiles.get(msg.senderId) || { name: 'User' };
  return {
    id: msg.id,
    content: msg.text,
    imageUrl: msg.imageUrl,
    user: { name: userProfile.name },
    createdAt: msg.createdAt.toDate().toISOString(),
  };
};

export default function Conversation() {
  const { id: conversationId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, session, loading: authLoading } = useAuth();

  const { data: conversations, isLoading: conversationsLoading } = useConversations();
  const { messages, loading: messagesLoading } = useMessages(conversationId!);
  const sendMessageMutation = useSendMessage();

  const conversationDetails = useMemo(() => {
    return conversations?.find(c => c.id === conversationId);
  }, [conversations, conversationId]);

  const userProfiles = useMemo(() => {
    const profiles = new Map<string, { name: string }>();
    if (user && conversationDetails) {
      profiles.set(user.id, { name: `${user.user_metadata.first_name || ''} ${user.user_metadata.last_name || ''}`.trim() || 'You' });
      profiles.set(conversationDetails.otherUser.id, { name: `${conversationDetails.otherUser.firstName} ${conversationDetails.otherUser.lastName}`.trim() });
    }
    return profiles;
  }, [user, conversationDetails]);

  const chatMessages = useMemo(() => {
    return messages.map(msg => transformFirebaseMessageToChatMessage(msg, userProfiles));
  }, [messages, userProfiles]);

  useEffect(() => {
    if (!authLoading && !session) {
      navigate('/login');
    }
  }, [authLoading, session, navigate]);

  const currentUsername = user ? `${user.user_metadata.first_name || ''} ${user.user_metadata.last_name || ''}`.trim() || 'You' : '';

  const handleSendMessage = async (text: string | null, image: File | null) => {
    if (!conversationId || (!text && !image)) return;
    try {
      await sendMessageMutation.mutateAsync({ conversationId, text, image });
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  if (authLoading || conversationsLoading) {
    return <div className="w-full h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="w-full h-screen flex flex-col">
      <Header />
      <div className="flex-grow flex flex-col overflow-hidden">
        {!conversationDetails ? (
          <div className="flex items-center justify-center h-20 border-b"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="border-b p-3 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/messages')} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-grow overflow-hidden">
              <p className="font-bold truncate">{`${conversationDetails.otherUser.firstName} ${conversationDetails.otherUser.lastName}`.trim()}</p>
              <Link to={`/?openListing=${conversationDetails.listingId}`} className="text-sm text-muted-foreground hover:underline truncate block">
                {conversationDetails.listingTitle}
              </Link>
            </div>
            <img src={conversationDetails.listingImageUrl} alt={conversationDetails.listingTitle} className="w-12 h-12 object-cover rounded-md flex-shrink-0" />
          </div>
        )}

        {messagesLoading ? (
          <div className="flex-grow flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : (
          <RealtimeChat
            username={currentUsername}
            messages={chatMessages}
            onSend={handleSendMessage}
          />
        )}
      </div>
    </div>
  );
}