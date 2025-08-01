import { useState } from 'react';
import { MarketplaceHeader } from '@/components/marketplace/MarketplaceHeader';
import { CreateListing } from '@/components/marketplace/CreateListing';
import { ChatLayout } from '@/components/chat/ChatLayout';

export default function Chats() {
  const [showCreateListing, setShowCreateListing] = useState(false);

  return (
    <div className="h-screen w-full flex flex-col">
      <MarketplaceHeader onCreateListing={() => setShowCreateListing(true)} />
      <main className="flex-1 flex overflow-hidden">
        <ChatLayout />
      </main>
      <CreateListing isOpen={showCreateListing} onClose={() => setShowCreateListing(false)} />
    </div>
  );
}