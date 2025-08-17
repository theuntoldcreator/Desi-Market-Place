import { useSessionContext } from '@supabase/auth-helpers-react';
import { Navigate, Outlet } from 'react-router-dom';
import { MobileNavbar } from '@/components/layout/MobileNavbar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = () => {
  const { session, isLoading } = useSessionContext();
  const userId = session?.user.id;
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [onlineCount, setOnlineCount] = useState(0);

  const { data: totalUsersCount } = useQuery({
    queryKey: ['totalUsersCount'],
    queryFn: async () => {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      return count;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel('online-users', {
      config: { presence: { key: userId } },
    });
    channel
      .on('presence', { event: 'sync' }, () => {
        setOnlineCount(Object.keys(channel.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <div className="flex flex-col min-h-dvh bg-gray-50/50">
        <div className="flex-grow pb-16 sm:pb-0">
          <Outlet />
        </div>
        <MobileNavbar
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onlineCount={onlineCount}
          totalUsersCount={totalUsersCount ?? undefined}
        />
      </div>
    </>
  );
};

export default ProtectedRoute;