import { useSession } from '@supabase/auth-helpers-react';
import Marketplace from './Marketplace';
import Login from './Login';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const session = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        navigate(0); // Refresh page on sign out
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!session) {
    return <Login />;
  }

  return <Marketplace />;
};

export default Index;