import { supabase } from '@/integrations/supabase/client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Navigate } from 'react-router-dom';
import { useSession } from '@supabase/auth-helpers-react';
import marketplaceLogo from '@/assets/marketplace.jpg';

const Login = () => {
  const session = useSession();

  if (session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src={marketplaceLogo} alt="Logo" className="w-16 h-16 mx-auto rounded-lg mb-4" />
          <h1 className="text-2xl font-bold">Welcome to NRI's Marketplace</h1>
          <p className="text-muted-foreground">Sign in with Google to continue</p>
        </div>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google']}
          theme="light"
          socialLayout="horizontal"
        />
      </div>
    </div>
  );
};

export default Login;