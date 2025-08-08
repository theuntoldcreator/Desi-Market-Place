import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const Login = () => {
  const logoUrl = 'https://res.cloudinary.com/dlzvthxf5/image/upload/v1754093530/eaglelogo_otceda.png';
  return (
    <div className="min-h-screen bg-marketplace-bg flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid lg:grid-cols-2 gap-12 items-center">
        {/* Left side - Welcome content */}
        <div className="space-y-6 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-4">
            <img src={logoUrl} alt="UNT | MARKETPLACE Logo" className="w-12 h-12 rounded-lg" />
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-[#00853E] to-accent bg-clip-text text-transparent bg-[size:200%_auto] animate-gradient-move">
              UNT | MARKETPLACE
            </h1>
          </div>
          <p className="text-lg sm:text-xl text-muted-foreground">
            Your trusted local marketplace. Sign in or create an account to start buying and selling.
          </p>
        </div>

        {/* Right side - Sign in card */}
        <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-gradient-card">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold">Welcome Back!</CardTitle>
            <CardDescription className="text-base">
              Sign in to continue
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
                      brand: 'hsl(214 84% 56%)',
                      brandAccent: 'hsl(214 84% 50%)',
                    },
                  },
                },
              }}
              providers={[]}
              view="sign_in"
              theme="light"
            />
            <p className="text-center text-sm text-muted-foreground mt-4">
              Don't have an account?{' '}
              <Link to="/signup" className="font-semibold text-primary hover:underline">
                Sign Up
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;