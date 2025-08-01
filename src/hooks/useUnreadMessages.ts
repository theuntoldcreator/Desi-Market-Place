import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

const fetchUnreadCount = async (userId: string) => {
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
  return count || 0;
};

export function useUnreadMessages() {
  const session = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const queryKey = ['unreadMessagesCount', userId];

  const { data: unreadCount } = useQuery({
    queryKey,
    queryFn: () => fetchUnreadCount(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('public:messages:unread')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload: any) => {
          const isInsertForUser = payload.eventType === 'INSERT' && payload.new.receiver_id === userId;
          const isUpdateToRead = payload.eventType === 'UPDATE' && payload.new.receiver_id === userId;

          if (isInsertForUser || isUpdateToRead) {
            queryClient.invalidateQueries({ queryKey });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient, queryKey]);

  return unreadCount || 0;
}