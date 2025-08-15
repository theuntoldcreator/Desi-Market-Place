import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import marketplaceLogo from '@/assets/marketplace.jpg';

const AdminLogin = () => {
  return (
    <div className="min-h-screen bg-marketplace-bg flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-gradient-card">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center gap-4">
            <img src={marketplaceLogo} alt="NRI's Marketplace Logo" className="w-12 h-12 rounded-lg" />
            <h1 className="text-3xl font-bold">Admin Panel</h1>
          </div>
          <CardDescription className="text-base pt-2">
            Sign in with your administrator credentials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(151 100% 24%)',
                    brandAccent: 'hsl(151 100% 19%)',
                  },
                },
              },
            }}
            providers={[]}
            theme="light"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;