import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Login = () => {
  return (
    <div className="min-h-screen bg-marketplace-bg flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid lg:grid-cols-2 gap-12 items-center">
        {/* Left side - Welcome content */}
        <div className="space-y-6 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center shadow-lg">
              <img src="/logofile.png" alt="Desi Market Place Logo" className="w-10 h-10" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Desi Market Place
            </h1>
          </div>
          <p className="text-lg sm:text-xl text-muted-foreground">
            Your trusted platform for student-to-student marketplace. Sign in or create an account to start buying and selling.
          </p>
        </div>

        {/* Right side - Sign in card */}
        <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-gradient-card">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold">Welcome!</CardTitle>
            <CardDescription className="text-base">
              Sign in to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Auth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              providers={['google', 'github']}
              theme="light"
              socialLayout="horizontal"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;