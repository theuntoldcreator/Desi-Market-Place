import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Button } from '../ui/button';

const TELEGRAM_BOT_NAME = "NRIsMarketplaceBot"; // Replace with your bot's username

declare global {
  interface Window {
    onTelegramAuth: (user: any) => void;
  }
}

export function TelegramLoginButton() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loginStatus, setLoginStatus] = useState('');

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', TELEGRAM_BOT_NAME);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');

    const container = document.getElementById('telegram-login-container');
    container?.appendChild(script);

    window.onTelegramAuth = async (user) => {
      setIsLoading(true);
      setLoginStatus('Verifying your identity...');
      try {
        const { data, error } = await supabase.functions.invoke('telegram-auth', {
          body: user,
        });

        if (error) throw new Error(error.message);
        
        setLoginStatus('Verification successful! Check your Telegram for a login link.');
        toast({
          title: "Check Your Telegram!",
          description: "We've sent a magic link to your Telegram account to complete the login.",
        });

      } catch (error: any) {
        toast({
          title: 'Login Failed',
          description: error.message || 'An unexpected error occurred.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    return () => {
      container?.removeChild(script);
    };
  }, [toast]);

  return (
    <div className="flex flex-col items-center gap-4">
      {isLoading || loginStatus ? (
        <div className="text-center p-4 border rounded-lg bg-muted">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="font-semibold">{loginStatus}</p>
        </div>
      ) : (
        <div id="telegram-login-container" />
      )}
    </div>
  );
}