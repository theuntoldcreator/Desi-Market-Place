import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { useRealtimeChat } from '@/hooks/use-realtime-chat';
import { ChatMessage } from '@/lib/types';
import { ChatMessageItem } from './ChatMessageItem';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';

interface RealtimeChatProps {
  roomName: string;
  username: string;
  initialMessages: ChatMessage[];
  onMessage: (content: string) => Promise<ChatMessage | null>;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

export function RealtimeChat({ roomName, username, initialMessages, onMessage, fetchNextPage, hasNextPage, isFetchingNextPage }: RealtimeChatProps) {
  const { messages, broadcastMessage } = useRealtimeChat(roomName, initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { ref: loadMoreRef, inView } = useInView({ threshold: 0 });
  const scrollHeightBeforeLoad = useRef(0);
  const isAutoScrolling = useRef(true);

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      isAutoScrolling.current = false;
      if (chatContainerRef.current) {
        scrollHeightBeforeLoad.current = chatContainerRef.current.scrollHeight;
      }
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useLayoutEffect(() => {
    if (chatContainerRef.current && !isAutoScrolling.current && scrollHeightBeforeLoad.current > 0) {
      const newScrollHeight = chatContainerRef.current.scrollHeight;
      chatContainerRef.current.scrollTop += newScrollHeight - scrollHeightBeforeLoad.current;
      scrollHeightBeforeLoad.current = 0;
    }
  }, [messages]);

  useEffect(() => {
    if (chatContainerRef.current && isAutoScrolling.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    isAutoScrolling.current = true;
    setIsSending(true);
    const persistedMessage = await onMessage(newMessage.trim());
    if (persistedMessage) {
      broadcastMessage(persistedMessage);
      setNewMessage('');
    }
    setIsSending(false);
  };

  return (
    <div className="flex-grow flex flex-col overflow-hidden">
      <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-4 space-y-2">
        {hasNextPage && (
          <div ref={loadMoreRef} className="flex justify-center p-2">
            {isFetchingNextPage && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
          </div>
        )}
        {messages.map((msg, index) => {
          const prevMessage = messages[index - 1];
          const showHeader = !prevMessage || prevMessage.user.name !== msg.user.name || new Date(msg.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() > 5 * 60 * 1000;
          return (
            <ChatMessageItem
              key={msg.id}
              message={msg}
              isOwnMessage={msg.user.name === username}
              showHeader={showHeader}
            />
          );
        })}
      </div>
      <div className="p-4 border-t bg-background">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            autoComplete="off"
            disabled={isSending}
          />
          <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}