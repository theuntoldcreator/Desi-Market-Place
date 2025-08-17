import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import MyListings from "./pages/MyListings";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Messages from "./pages/Messages";
import Chat from "./pages/Chat";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { supabase } from "./integrations/supabase/client";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AuthLayout from "./components/auth/AuthLayout";
import AdminRoute from "./components/auth/AdminRoute";

const queryClient = new QueryClient();

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
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

const App = () => {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppRoutes />
        </TooltipProvider>
      </QueryClientProvider>
    </SessionContextProvider>
  );
};

const Root = () => (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

export default Root;