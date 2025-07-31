import { useParams } from 'react-router-dom';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { MarketplaceHeader } from '@/components/marketplace/MarketplaceHeader';
import { MessageSquare } from 'lucide-react';

export default function Messages() {
  const { chatId } = useParams();

  return (
    <div className="flex flex-col h-screen bg-gray-50/50">
      <MarketplaceHeader onCreateListing={() => {}} />
      <div className="flex-1 flex overflow-hidden">
        <ConversationList selectedChatId={chatId} />
        <main className="flex-1 flex flex-col">
          {chatId ? (
            <ChatWindow key={chatId} chatId={chatId} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
              <div className="flex flex-col items-center gap-4">
                <MessageSquare className="w-16 h-16" />
                <h2 className="text-2xl font-semibold">Select a conversation</h2>
                <p>Choose from your existing conversations on the left to start chatting.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}