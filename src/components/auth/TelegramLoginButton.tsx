import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const TELEGRAM_BOT_NAME = "UNTeverything_bot";

declare global {
  interface Window {
    onTelegramAuth: (user: any) => void;
  }
}

export function TelegramLoginButton() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const scriptContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Define the callback function on the window object
    window.onTelegramAuth = async (user) => {
      setIsLoading(true);
      setStatusMessage('Verifying your identity...');
      try {
        // The user object from Telegram contains the hash we need to verify
        const { error } = await supabase.functions.invoke('telegram-auth', {
          body: user,
        });

        if (error) throw new Error(error.message);
        
        setStatusMessage('Verification successful! Please check your Telegram for a login link.');
        toast({
          title: "Check Your Telegram!",
          description: "We've sent a magic link to your Telegram account to complete the login.",
          duration: 10000, // Give user time to see it
        });

      } catch (error: any) {
        toast({
          title: 'Login Failed',
          description: error.message || 'An unexpected error occurred. Please try again.',
          variant: 'destructive',
        });
        // Reset state on failure to allow retry
        setIsLoading(false);
        setStatusMessage('');
      }
    };

    // Create and append the script to the container
    if (scriptContainerRef.current) {
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.async = true;
      script.setAttribute('data-telegram-login', TELEGRAM_BOT_NAME);
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      script.setAttribute('data-request-access', 'write');
      
      // Clear previous script if any and append new one
      scriptContainerRef.current.innerHTML = '';
      scriptContainerRef.current.appendChild(script);
    }

    // Cleanup function to remove the global callback
    return () => {
      // It's safer not to remove the function if the component might unmount/remount quickly
      // delete window.onTelegramAuth;
    };
  }, [toast]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60px]">
      {isLoading ? (
        <div className="text-center p-2 space-y-2">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          <p className="font-semibold text-sm">{statusMessage}</p>
        </div>
      ) : (
        // This container will hold the Telegram button rendered by the script
        <div ref={scriptContainerRef} />
      )}
    </div>
  );
}