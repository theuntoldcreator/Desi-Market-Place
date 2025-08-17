import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import marketplaceLogo from '@/assets/marketplace.jpg';
import { TelegramLoginButton } from '@/components/auth/TelegramLoginButton';

const Login = () => {
  const logoUrl = marketplaceLogo;

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
            <TelegramLoginButton />
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