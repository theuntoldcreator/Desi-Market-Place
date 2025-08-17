import { useSessionContext } from '@supabase/auth-helpers-react';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const AuthLayout = () => {
  const { session, isLoading } = useSessionContext();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default AuthLayout;