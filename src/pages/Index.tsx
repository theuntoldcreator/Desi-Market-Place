import { useSession } from '@supabase/auth-helpers-react';
import Marketplace from './Marketplace';
import Login from './Login';

const Index = () => {
  const session = useSession();

  if (!session) {
    return <Login />;
  }

  return <Marketplace />;
};

export default Index;