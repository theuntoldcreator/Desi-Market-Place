import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useRef } from 'react';
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
  // Initialize onlineUsers to 1, assuming the current user is always online.
  // This prevents the skeleton from showing indefinitely if presence sync is delayed.
  const [onlineUsers, setOnlineUsers] = useState<number>(1); 
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null); // Use useRef to hold channel instance

  const { data: totalUsers, isLoading: isLoadingTotal } = useQuery({
    queryKey: ['totalUsers'],
    queryFn: fetchTotalUsers,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 50000,
  });

  useEffect(() => {
    const setupPresence = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // Use a unique key for each user/guest to track presence
      const userKey = session?.user?.id || `guest-${Math.random().toString(36).substring(2)}`;

      const channel = supabase.channel('online-users', {
        config: {
          presence: {
            key: userKey,
          },
        },
      });
      channelRef.current = channel; // Store channel in ref

      channel.on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const userCount = Object.keys(presenceState).length;
        console.log('Supabase Presence Sync:', { presenceState, userCount }); // Debug log
        setOnlineUsers(userCount > 0 ? userCount : 1); 
      });

      channel.subscribe(async (status) => {
        console.log('Supabase Channel Status:', status); // Debug log
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
          console.log('Supabase Presence Tracked for key:', userKey); // Debug log
        }
      });
    };

    setupPresence();

    return () => {
      // Cleanup: remove the channel when the component unmounts
      if (channelRef.current) {
        console.log('Removing Supabase channel'); // Debug log
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []); // Empty dependency array means it runs once on mount and cleans up on unmount

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
          {/* No longer checking for null, as it's initialized to 1 */}
          <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="font-semibold">{onlineUsers.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}