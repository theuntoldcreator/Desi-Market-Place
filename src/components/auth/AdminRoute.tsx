import { useSessionContext, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const AdminRoute = () => {
  const { session, isLoading } = useSessionContext();
  const supabase = useSupabaseClient();

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile', session?.user.id],
    queryFn: async () => {
      if (!session?.user.id) return null;
      const { data, error } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !isLoading && !!session,
  });

  if (isLoading || isLoadingProfile) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';

  if (!session || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;