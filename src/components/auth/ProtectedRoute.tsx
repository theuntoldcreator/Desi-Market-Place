import { useSessionContext } from '@supabase/auth-helpers-react';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { MobileNavbar } from '@/components/layout/MobileNavbar'; // Import the new component
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

const ProtectedRoute = () => {
  const { session, isLoading } = useSessionContext();
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

  // Online users count
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: session.user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        setOnlineCount(Object.keys(presenceState).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && session) {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

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
    <div className="flex flex-col min-h-screen">
      <div className="flex-grow pb-16 sm:pb-0"> {/* Add padding-bottom for mobile navbar */}
        <Outlet />
      </div>
      <MobileNavbar 
        selectedCategory={selectedCategory} 
        onCategoryChange={setSelectedCategory} 
        onlineCount={onlineCount}
        totalUsersCount={totalUsersCount ?? undefined}
      />
    </div>
  );
};

export default ProtectedRoute;