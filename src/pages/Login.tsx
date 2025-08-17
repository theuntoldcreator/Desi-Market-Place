import { supabase } from '@/integrations/supabase/client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useSession } from '@supabase/auth-helpers-react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';

const Login = () => {
  const session = useSession();

  if (session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-marketplace-bg flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-gradient-card">
        <CardContent className="p-8">
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={['google']}
            theme="light"
            socialLayout="horizontal"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;