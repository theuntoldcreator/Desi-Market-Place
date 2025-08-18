import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ChatMessage } from '@/lib/types';

export const useRealtimeChat = (roomName: string, initialMessages: ChatMessage[] = []) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    const channel = supabase.channel(roomName, {
      config: {
        broadcast: {
          self: true, // Receive our own broadcasts to ensure UI consistency
        },
      },
    });

    channel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        setMessages((prevMessages) => {
          // Avoid adding duplicate messages
          if (prevMessages.find((msg) => msg.id === payload.id)) {
            return prevMessages;
          }
          return [...prevMessages, payload];
        });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomName]);

  const broadcastMessage = (message: ChatMessage) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'message',
      payload: message,
    });
  };

  return { messages, broadcastMessage };
};