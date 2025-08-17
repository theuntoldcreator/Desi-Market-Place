import { useEffect } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import OtpVerification from '@/pages/OtpVerification';

// Safely get initData from the Telegram WebApp object
const getInitData = (): string | null => {
  if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
    return window.Telegram.WebApp.initData;
  }
  return null;
};

const TelegramAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { isLoading, user, requiresOtp, setSession, setOtpRequired } = useAuth();

  useEffect(() => {
    const authenticate = async () => {
      const initData = getInitData();

      if (!initData) {
        // In a real app, you might want to show an error page
        // For development, we can bypass this if needed.
        if (import.meta.env.DEV) {
          console.warn("Telegram initData not found. Bypassing auth for development.");
          setOtpRequired(false); // Effectively sets isLoading to false
        } else {
          console.error("Authentication failed: Telegram initData not available.");
          // Handle error state, maybe show a message to open in Telegram
        }
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('telegram-auth', {
          body: { initData },
        });

        if (error) throw error;

        setSession(data.user, data.access_token);
        if (data.requiresOtp) {
          setOtpRequired(true);
        }
      } catch (err) {
        console.error('Authentication error:', err);
        // Handle auth failure
      }
    };

    authenticate();
  }, [setSession, setOtpRequired]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">Authorizing...</p>
        </div>
      </div>
    );
  }

  if (requiresOtp && !user?.verified_at) {
    return <OtpVerification />;
  }

  return <>{children}</>;
};

export default TelegramAuthProvider;