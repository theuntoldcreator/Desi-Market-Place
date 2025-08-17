import { Navigate, Outlet } from 'react-router-dom';
import { MobileNavbar } from '@/components/layout/MobileNavbar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/auth/AuthContext';

const ProtectedRoute = () => {
  const { user } = useAuth();
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

  // This logic can remain as it's for presence, not auth
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel('online-users', {
      config: { presence: { key: user.id } },
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
  }, [user?.id]);

  // If there's no user, they can't access protected routes.
  // In a real app, you might show a "Please open in Telegram" message.
  if (!user) {
     // For development, we allow access. In production, this would be more strict.
    if (import.meta.env.PROD) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Access Denied</h1>
            <p className="mt-2">Please open this app within Telegram.</p>
          </div>
        </div>
      );
    }
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