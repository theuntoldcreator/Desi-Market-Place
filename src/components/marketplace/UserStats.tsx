import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Users, Wifi } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const fetchTotalUsers = async () => {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error fetching total users:', error);
    return 0;
  }
  return count ?? 0;
};

export function UserStats() {
  const [onlineUsers, setOnlineUsers] = useState<number | null>(null);

  const { data: totalUsers, isLoading: isLoadingTotal } = useQuery({
    queryKey: ['totalUsers'],
    queryFn: fetchTotalUsers,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 50000,
  });

  useEffect(() => {
    const setupPresence = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userKey = session?.user?.id || `guest-${Math.random().toString(36).substring(2)}`;

      const channel = supabase.channel('online-users', {
        config: {
          presence: {
            key: userKey,
          },
        },
      });

      channel.on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const userCount = Object.keys(presenceState).length;
        setOnlineUsers(userCount > 0 ? userCount : 1); // Always show at least 1 user (self)
      });

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

      return channel;
    };

    let channel: ReturnType<typeof supabase.channel> | null = null;
    setupPresence().then(ch => channel = ch);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide">Community Stats</h3>
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>Total Users</span>
          </div>
          {isLoadingTotal ? (
            <Skeleton className="h-5 w-8 rounded-md" />
          ) : (
            <span className="font-semibold">{totalUsers?.toLocaleString()}</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Wifi className="w-4 h-4" />
            <span>Online Now</span>
          </div>
          {onlineUsers === null ? (
             <Skeleton className="h-5 w-8 rounded-md" />
          ) : (
            <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="font-semibold">{onlineUsers.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}