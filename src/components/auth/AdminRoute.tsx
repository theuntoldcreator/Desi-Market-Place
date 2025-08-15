import { useSessionContext } from '@supabase/auth-helpers-react';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const AdminRoute = () => {
  const { session, isLoading: isSessionLoading } = useSessionContext();

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session) return null;
      const { data, error } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!session,
  });

  const isLoading = isSessionLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session || profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;