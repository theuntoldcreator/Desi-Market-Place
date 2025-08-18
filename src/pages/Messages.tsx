import { useConversations } from '@/hooks/use-messaging';
import { Header } from '@/components/layout/Header';
import { Loader2, Inbox } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ConversationListItem } from '@/components/messaging/ConversationListItem';

export default function Messages() {
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: conversations = [], isLoading, isError } = useConversations();

  if (!authLoading && !session) {
    navigate('/login');
    return null;
  }

  const renderContent = () => {
    if (isLoading || authLoading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (isError) return <div className="text-center py-16 text-destructive">Failed to load conversations.</div>;
    if (conversations.length === 0) return (
      <div className="text-center py-16">
        <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold">No conversations yet</h3>
        <p className="mt-2 text-muted-foreground">When you message a seller, you'll see it here.</p>
      </div>
    );

    return (
      <div className="divide-y border-t">
        {conversations.map((convo) => (
          <ConversationListItem key={convo.id} conversation={convo} currentUserId={user!.id} />
        ))}
      </div>
    );
  };

  return (
    <div className="w-full">
      <Header />
      <main className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 space-y-8 pb-24 sm:pb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">My Messages</h2>
          <p className="text-muted-foreground mt-1">{conversations.length} conversations</p>
        </div>
        <div className="border rounded-lg overflow-hidden bg-card">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}