import { useQuery } from '@tanstack/react-query';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { MarketplaceHeader } from '@/components/marketplace/MarketplaceHeader';
import { Loader2, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { CreateListing } from '@/components/marketplace/CreateListing';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

type Conversation = {
  id: string;
  updated_at: string;
  listing_id: number;
  listing_title: string;
  listing_image_url: string;
  other_user_id: string;
  other_user_first_name: string | null;
  other_user_last_name: string | null;
  other_user_avatar_url: string | null;
  last_message_body: string | null;
  last_message_created_at: string | null;
  last_message_sender_id: string | null;
};

const fetchConversations = async (userId: string): Promise<Conversation[]> => {
  const { data, error } = await supabase.rpc('get_user_conversations', { p_user_id: userId });
  if (error) throw new Error(error.message);
  return data as Conversation[];
};

export default function Messages() {
  const session = useSession();
  const userId = session?.user.id;
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: conversations = [], isLoading, isError } = useQuery<Conversation[]>({
    queryKey: ['conversations', userId],
    queryFn: () => fetchConversations(userId!),
    enabled: !!userId,
  });

  const renderContent = () => {
    if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (isError) return <div className="text-center py-16 text-destructive">Failed to load conversations.</div>;
    if (conversations.length === 0) return (
      <div className="text-center py-16 border-2 border-dashed rounded-lg">
        <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold">No messages yet</h3>
        <p className="mt-2">When you start a conversation with a seller, it will appear here.</p>
        <Link to="/" className="mt-6 inline-block bg-primary text-primary-foreground px-4 py-2 rounded-md">Browse Listings</Link>
      </div>
    );

    return (
      <div className="space-y-2">
        {conversations.map((convo) => {
          const fullName = `${convo.other_user_first_name || ''} ${convo.other_user_last_name || ''}`.trim();
          const fallback = fullName ? fullName[0].toUpperCase() : '?';
          const lastMessagePrefix = convo.last_message_sender_id === userId ? 'You: ' : '';

          return (
            <Link key={convo.id} to={`/chat/${convo.id}`} className="block">
              <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={convo.other_user_avatar_url || undefined} />
                  <AvatarFallback>{fallback}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between">
                    <p className="font-semibold truncate">{fullName}</p>
                    {convo.last_message_created_at && (
                      <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {formatDistanceToNow(new Date(convo.last_message_created_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  <p className={cn("text-sm truncate", convo.last_message_body ? "text-muted-foreground" : "text-muted-foreground/50 italic")}>
                    {convo.last_message_body 
                      ? <>{lastMessagePrefix}{convo.last_message_body}</>
                      : `Chat about "${convo.listing_title}"`
                    }
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full">
      <MarketplaceHeader
        onCreateListing={() => setShowCreateListing(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <main className="container mx-auto px-4 sm:px-6 py-8 space-y-8 max-w-screen-md">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Messages</h2>
          <p className="text-muted-foreground mt-1">{conversations.length} conversations</p>
        </div>
        {renderContent()}
      </main>
      <CreateListing isOpen={showCreateListing} onClose={() => setShowCreateListing(false)} />
    </div>
  );
}