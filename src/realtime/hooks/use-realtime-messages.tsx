import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

export const useRealtimeMessages = (conversationId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-messages:${conversationId}`)
      .on<Message>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new;

          // Ignore updates triggered by the current user, as they are handled optimistically.
          if (newMessage.sender_id === user?.id) {
            return;
          }
          
          // Fetch the sender's profile info since it's not in the real-time payload.
          supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('id', newMessage.sender_id)
            .single()
            .then(({ data: profileData }) => {
              const messageWithProfile = { ...newMessage, profiles: profileData };

              // Update the TanStack Query cache with the new message.
              queryClient.setQueryData(['messages', conversationId], (oldData: any) => {
                if (!oldData) return { pages: [[messageWithProfile]], pageParams: [0] };

                const lastPageIndex = oldData.pages.length - 1;
                const lastPage = oldData.pages[lastPageIndex];

                // Avoid adding duplicate messages.
                if (lastPage.find((msg: Message) => msg.id === messageWithProfile.id)) {
                  return oldData;
                }

                const newPages = [...oldData.pages];
                newPages[lastPageIndex] = [...lastPage, messageWithProfile];

                return {
                  ...oldData,
                  pages: newPages,
                };
              });
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient, user?.id]);
};