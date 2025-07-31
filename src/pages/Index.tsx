import { AuthWrapper } from '@/components/auth/AuthWrapper';
import Marketplace from './Marketplace';

const Index = () => {
  return (
    <AuthWrapper>
      <Marketplace />
    </AuthWrapper>
  );
};

export default Index;
