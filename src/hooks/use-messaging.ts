import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Message } from '@/lib/types';

// Hook to get all conversations for the current user
export const useConversations = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.rpc('get_user_conversations', { p_user_id: user.id });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user,
  });
};

const MESSAGES_PER_PAGE = 30;

// Hook to get paginated messages for a specific conversation
export const useInfiniteMessages = (conversationId: string) => {
  return useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * MESSAGES_PER_PAGE;
      const to = from + MESSAGES_PER_PAGE - 1;

      const { data, error } = await supabase
        .from('messages')
        .select('*, profiles(first_name, last_name, avatar_url)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false }) // Fetch newest first for pagination logic
        .range(from, to);

      if (error) throw new Error(error.message);
      
      // Reverse to show oldest first in the UI
      return data.reverse();
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < MESSAGES_PER_PAGE) {
        return undefined;
      }
      return allPages.length;
    },
    enabled: !!conversationId,
  });
};


// Hook to send and persist a message, returning the created record
export const useSendMessage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, body }: { conversationId: string; body: string }) => {
      if (!user) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          body,
        })
        .select()
        .single();
        
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (newMessage, { conversationId }) => {
      // Invalidate conversations list to show recent activity
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });

      // Optimistically update the messages list for the sender for an instant UI update.
      const profileData = {
        first_name: user?.user_metadata.first_name || '',
        last_name: user?.user_metadata.last_name || '',
        avatar_url: user?.user_metadata.avatar_url || null,
      };
      const messageWithProfile = { ...newMessage, profiles: profileData };

      queryClient.setQueryData(['messages', conversationId], (oldData: any) => {
        if (!oldData) return { pages: [[messageWithProfile]], pageParams: [0] };

        const lastPageIndex = oldData.pages.length - 1;
        const lastPage = oldData.pages[lastPageIndex];
        
        const newPages = [...oldData.pages];
        newPages[lastPageIndex] = [...lastPage, messageWithProfile];

        return {
          ...oldData,
          pages: newPages,
        };
      });
    },
  });
};

// Hook to start a new conversation
export const useStartConversation = () => {
  return useMutation({
    mutationFn: async ({ listingId, sellerId }: { listingId: number; sellerId: string }) => {
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        p_listing_id: listingId,
        p_seller_id: sellerId,
      });
      if (error) throw new Error(error.message);
      return data[0].id;
    },
  });
};