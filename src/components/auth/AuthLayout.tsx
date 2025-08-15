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
    // This was the problematic redirect. It's now handled in App.tsx
    // return <Navigate to="/" replace />; 
    // We will let the main router in App.tsx handle the redirect after checking the user's role.
    // For now, we can show a loading state while the redirect happens.
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <Outlet />;
};

export default AuthLayout;