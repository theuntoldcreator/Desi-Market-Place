import { useUser } from '@clerk/clerk-react';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const AdminRoute = () => {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check for admin role in Clerk's public metadata.
  // This is set by our `clerk-webhook` Edge Function when a user is created.
  const isAdmin = user?.publicMetadata?.role === 'admin';

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;