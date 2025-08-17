import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner, toast as sonnerToast } from "@/components/ui/sonner";
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
import Messages from "./pages/Messages";
import Chat from "./pages/Chat";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useEffect } from "react";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AuthLayout from "./components/auth/AuthLayout";
import AdminRoute from "./components/auth/AdminRoute";
import { XmppProvider } from "./hooks/XmppProvider";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const supabase = useSupabaseClient();
  const navigate = useNavigate();
  const session = useSession();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        const checkAndProvisionXmpp = async () => {
          if (session) {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('role, jid')
              .eq('id', session.user.id)
              .single();

            if (error) {
              console.error("Error fetching profile:", error);
              return;
            }

            if (profile?.role === 'admin') {
              navigate('/admin', { replace: true });
              return;
            }

            if (profile && !profile.jid) {
              const toastId = sonnerToast.loading("Setting up your chat account...");
              try {
                console.log('User has no JID, provisioning XMPP account...');
                const { error: invokeError } = await supabase.functions.invoke('create-xmpp-user');
                if (invokeError) throw invokeError;
                console.log('XMPP account provisioned successfully.');
                sonnerToast.success("Chat account created!", { id: toastId, description: "You can now message other users." });
                queryClient.invalidateQueries({ queryKey: ['profile', session.user.id] });
              } catch (e) {
                console.error("Failed to provision XMPP account:", e);
                sonnerToast.error("Chat setup failed", { id: toastId, description: "Could not create your chat account." });
              }
            }

            if (event === 'SIGNED_IN' && profile?.role !== 'admin') {
              navigate('/', { replace: true });
            }
          }
        };
        checkAndProvisionXmpp();
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
        <Route path="/messages" element={<Messages />} />
        <Route path="/chat/:conversationId" element={<Chat />} />
      </Route>

      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<Admin />} />
      </Route>

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
        <XmppProvider>
          <AppRoutes />
        </XmppProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;