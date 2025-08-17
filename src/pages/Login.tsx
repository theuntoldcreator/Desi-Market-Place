import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import marketplaceLogo from '@/assets/marketplace.jpg';
import { TelegramLoginButton } from '@/components/auth/TelegramLoginButton';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// Add Telegram WebApp types for TypeScript
declare global {
  interface Window {
    Telegram: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: any;
          hash?: string;
        };
        ready: () => void;
      }
    }
  }
}

const Login = () => {
  const logoUrl = marketplaceLogo;
  const { toast } = useToast();
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(true); // Start true to check for mini app
  const [statusMessage, setStatusMessage] = useState('Checking for Telegram session...');

  useEffect(() => {
    const handleTelegramAuth = async (user: any, hash: string) => {
      setIsAutoLoggingIn(true);
      setStatusMessage('Verifying your identity...');
      try {
        const authData = { ...user, hash };
        const { error } = await supabase.functions.invoke('telegram-auth', {
          body: authData,
        });

        if (error) throw new Error(error.message);
        
        setStatusMessage('Verification successful! Check your Telegram for a login link.');
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
        setIsAutoLoggingIn(false); // Allow fallback to widget
      }
    };

    // Check if running inside a Telegram Mini App
    if (window.Telegram?.WebApp?.initData) {
      window.Telegram.WebApp.ready();
      const initData = window.Telegram.WebApp.initDataUnsafe;
      if (initData.user && initData.hash) {
        handleTelegramAuth(initData.user, initData.hash);
      } else {
        // No user data, probably not logged into Telegram
        setIsAutoLoggingIn(false);
      }
    } else {
      // Not in a mini app, show login widget
      setIsAutoLoggingIn(false);
    }
  }, [toast]);

  const renderLoginContent = () => {
    if (isAutoLoggingIn) {
      return (
        <div className="text-center p-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
          <p className="font-semibold text-lg">{statusMessage}</p>
        </div>
      );
    }
    return <TelegramLoginButton />;
  };

  return (
    <div className="min-h-screen bg-marketplace-bg flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full grid lg:grid-cols-2 gap-12 items-center">
        {/* Left side - Welcome content */}
        <div className="space-y-6 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-4">
            <img src={logoUrl} alt="NRI's Marketplace Logo" className="w-12 h-12 rounded-lg" />
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent bg-[size:200%_auto] animate-gradient-move">
              NRI's Marketplace
            </h1>
          </div>
          <p className="text-lg sm:text-xl text-muted-foreground">
            Your trusted local marketplace. Sign in or create an account to start buying and selling.
          </p>
        </div>

        {/* Right side - Sign in card */}
        <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-gradient-card">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold">Welcome!</CardTitle>
            <CardDescription className="text-base">
              Sign in or create an account with one click.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderLoginContent()}
          </CardContent>
        </Card>
      </div>
      <div className="mt-8 text-center text-sm text-muted-foreground">
        Made with ❤️ by{' '}
        <Link to="/theuntoldcreator" className="font-semibold text-primary hover:underline">
          The Untold Creator
        </Link>
      </div>
    </div>
  );
};

export default Login;