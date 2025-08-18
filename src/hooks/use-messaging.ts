import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
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

// Hook to get messages for a specific conversation and subscribe to realtime updates
export const useMessages = (conversationId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on<Message>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          queryClient.setQueryData(['messages', conversationId], (oldData: Message[] | undefined) => {
            return oldData ? [...oldData, payload.new] : [payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*, profiles(first_name, last_name, avatar_url)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!conversationId,
  });
};

// Hook to send a message
export const useSendMessage = (conversationId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: string) => {
      if (!user) throw new Error('User not authenticated');
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        body,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
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