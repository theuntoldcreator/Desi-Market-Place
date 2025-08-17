import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowLeft, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useXmpp } from '@/hooks/XmppProvider';
import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type ProfileWithJid = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  jid: string | null;
};

type ListingStubForChat = {
  id: number;
  title: string;
  image_urls: string[];
};

type ConversationDetails = {
  id: string;
  listing: ListingStubForChat;
  buyer: ProfileWithJid;
  seller: ProfileWithJid;
};

const fetchConversationDetails = async (conversationId: string, userId: string): Promise<ConversationDetails> => {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      listing:listings(id, title, image_urls),
      buyer:public_profiles!buyer_id(id, first_name, last_name, avatar_url),
      seller:public_profiles!seller_id(id, first_name, last_name, avatar_url)
    `)
    .eq('id', conversationId)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .single();

  if (error) throw new Error(error.message);
  
  // We need the JID which is not in the public view, so we fetch the full profiles of both users.
  // RLS ensures we can only fetch our own full profile, but we need the other user's JID.
  // For now, we will fetch the JIDs separately. A better solution might be an RPC function.
  const { data: fullConversation, error: fullError } = await supabase
    .from('conversations')
    .select('buyer_id, seller_id')
    .eq('id', conversationId)
    .single();
  
  if (fullError) throw new Error(fullError.message);

  const { data: profilesWithJid, error: jidError } = await supabase
    .from('profiles')
    .select('id, jid')
    .in('id', [fullConversation.buyer_id, fullConversation.seller_id]);

  if (jidError) throw new Error(jidError.message);

  const jidMap = new Map(profilesWithJid.map(p => [p.id, p.jid]));

  return {
    ...data,
    buyer: { ...data.buyer, jid: jidMap.get(data.buyer.id) },
    seller: { ...data.seller, jid: jidMap.get(data.seller.id) },
  } as unknown as ConversationDetails;
};

export default function Chat() {
  const { conversationId } = useParams();
  const session = useSession();
  const { sendMessage, messages, connectionStatus, presences } = useXmpp();
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversation, isLoading, isError } = useQuery<ConversationDetails>({
    queryKey: ['conversation', conversationId],
    queryFn: () => fetchConversationDetails(conversationId!, session!.user.id),
    enabled: !!session && !!conversationId,
  });

  const otherUser = conversation 
    ? (conversation.buyer.id === session?.user?.id ? conversation.seller : conversation.buyer)
    : null;

  const chatPartnerJid = otherUser?.jid;
  const conversationMessages = chatPartnerJid ? messages.get(chatPartnerJid) || [] : [];
  const presence = chatPartnerJid ? presences.get(chatPartnerJid) : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  const handleSend = () => {
    if (messageText.trim() && chatPartnerJid) {
      sendMessage(chatPartnerJid, messageText.trim());
      setMessageText('');
    }
  };

  if (isLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (isError || !conversation) return <div className="flex h-screen w-full items-center justify-center text-destructive">Conversation not found or access denied.</div>;

  const fullName = `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim();
  const fallback = fullName ? fullName[0].toUpperCase() : '?';

  return (
    <div className="flex flex-col h-screen bg-muted">
      <header className="flex items-center gap-4 p-3 border-b bg-background sticky top-0 z-10">
        <Button asChild variant="ghost" size="icon" className="sm:hidden">
          <Link to="/messages"><ArrowLeft /></Link>
        </Button>
        <div className="relative">
          <Avatar>
            <AvatarImage src={otherUser.avatar_url || undefined} />
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
          {presence?.status === 'online' && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
          )}
        </div>
        <div className="flex-1">
          <p className="font-semibold">{fullName}</p>
          <p className={cn("text-xs", presence?.status === 'online' ? 'text-green-600' : 'text-muted-foreground')}>
            {presence?.status === 'online' ? 'Online' : 'Offline'}
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversationMessages.map((msg, index) => (
          <div key={msg.id || index} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md p-3 rounded-2xl ${msg.isMe ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-background rounded-bl-none'}`}>
              <p className="text-sm">{msg.body}</p>
              <p className={`text-xs mt-1 ${msg.isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'} text-right`}>
                {format(new Date(msg.timestamp), 'p')}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>

      <footer className="p-3 border-t bg-background sticky bottom-0">
        {connectionStatus !== 'connected' && (
          <div className="text-center text-xs text-destructive mb-2">
            {connectionStatus === 'connecting' ? 'Connecting to chat...' : connectionStatus === 'disconnected' ? 'Disconnected. Reconnecting...' : `Chat status: ${connectionStatus}`}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Input 
            placeholder="Type a message..." 
            className="flex-1" 
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={connectionStatus !== 'connected'}
          />
          <Button onClick={handleSend} disabled={!messageText.trim() || connectionStatus !== 'connected'}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
}