import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import MyListings from "./pages/MyListings";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import Admin from "./pages/Admin";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useEffect } from "react";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AuthLayout from "./components/auth/AuthLayout";
import AdminRoute from "./components/auth/AdminRoute";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const supabase = useSupabaseClient();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        // After sign-in, check if the user is an admin and redirect accordingly
        const checkRole = async () => {
          if (session) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single();
            
            if (profile?.role === 'admin') {
              navigate('/admin', { replace: true });
            } else {
              navigate('/', { replace: true });
            }
          }
        };
        checkRole();
      }
      if (event === 'SIGNED_OUT') {
        navigate('/login', { replace: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, navigate]);

  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Navigate to="/login" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />
      </Route>
      
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Index />} />
        <Route path="/my-listings" element={<MyListings />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<Admin />} />
      </Route>

      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;