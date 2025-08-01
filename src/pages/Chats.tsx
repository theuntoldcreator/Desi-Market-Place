import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { MarketplaceHeader } from '@/components/marketplace/MarketplaceHeader';
import { CreateListing } from '@/components/marketplace/CreateListing';
import { ChatList } from '@/components/chat/ChatList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { MessageSquare } from 'lucide-react';

export default function Chats() {
  const [showCreateListing, setShowCreateListing] = useState(false);
  const { chatId } = useParams<{ chatId: string }>();

  return (
    <div className="min-h-screen w-full bg-gray-50/50 flex flex-col">
      <MarketplaceHeader onCreateListing={() => setShowCreateListing(true)} />
      <main className="flex-1 flex overflow-hidden">
        <div className="w-full md:w-1/3 lg:w-1/4 border-r overflow-y-auto bg-white">
          <ChatList selectedChatId={chatId} />
        </div>
        <div className="flex-1 flex flex-col">
          {chatId ? (
            <ChatWindow chatId={chatId} key={chatId} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground bg-white">
              <MessageSquare className="w-16 h-16 mb-4" />
              <h2 className="text-xl font-semibold">Select a conversation</h2>
              <p>Choose from your existing conversations to start chatting.</p>
            </div>
          )}
        </div>
      </main>
      <CreateListing isOpen={showCreateListing} onClose={() => setShowCreateListing(false)} />
    </div>
  );
}