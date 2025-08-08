import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// This component will render the Telegram Login button
const TelegramLoginButton = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useEffect(() => {
    // IMPORTANT: You must replace 'YOUR_BOT_USERNAME' with your actual bot's username.
    const botUsername = "YOUR_BOT_USERNAME";

    // Define the callback function that Telegram will call
    (window as any).onTelegramAuth = async (user: any) => {
      const toastId = toast({
        title: "Authenticating...",
        description: "Please wait while we log you in.",
        duration: Infinity,
      });

      try {
        const { data: session, error } = await supabase.functions.invoke('telegram-auth', {
          body: user,
        });

        if (error) throw error;
        if (!session.access_token) throw new Error("Authentication failed, no session returned.");

        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        
        toastId.update({
            title: "Login Successful!",
            description: `Welcome, ${user.first_name}!`,
            duration: 5000,
        });

        navigate('/');
        setTimeout(() => window.location.reload(), 500);
      } catch (err: any) {
        console.error("Telegram auth error:", err);
        toastId.update({
          title: "Login Failed",
          description: err.message || "An unknown error occurred.",
          variant: "destructive",
          duration: 5000,
        });
      }
    };

    // Create the script element for the Telegram widget
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');

    document.getElementById('telegram-login-container')?.appendChild(script);

    return () => {
      const container = document.getElementById('telegram-login-container');
      if (container) container.innerHTML = '';
      delete (window as any).onTelegramAuth;
    };
  }, [navigate, toast]);

  return <div id="telegram-login-container" />;
};


const Login = () => {
  const logoUrl = 'https://res.cloudinary.com/dlzvthxf5/image/upload/v1754093530/eaglelogo_otceda.png';
  return (
    <div className="min-h-screen bg-marketplace-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-gradient-card">
        <CardHeader className="text-center space-y-2">
          <img src={logoUrl} alt="NRI's Marketplace Logo" className="w-12 h-12 rounded-lg mx-auto" />
          <CardTitle className="text-2xl font-bold">Welcome to NRI's Marketplace</CardTitle>
          <CardDescription className="text-base">
            Sign in with Telegram to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center">
          <TelegramLoginButton />
           <p className="text-center text-xs text-muted-foreground mt-4">
            By signing in, you agree to our terms and conditions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;