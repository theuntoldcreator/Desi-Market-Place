import { useSessionContext } from '@supabase/auth-helpers-react';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { MobileNavbar } from '@/components/layout/MobileNavbar'; // Import the new component

const ProtectedRoute = () => {
  const { session, isLoading } = useSessionContext();

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
      <MobileNavbar /> {/* Render the mobile navbar */}
    </div>
  );
};

export default ProtectedRoute;