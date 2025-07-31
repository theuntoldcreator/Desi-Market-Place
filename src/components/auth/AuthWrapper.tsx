import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag, Users, Shield, Star } from 'lucide-react';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  return (
    <>
      <SignedOut>
        <div className="min-h-screen bg-marketplace-bg flex items-center justify-center p-4">
          <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-8 items-center">
            {/* Left side - Welcome content */}
            <div className="space-y-8">
              <div className="text-center lg:text-left">
                <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
                  Desi Market Place
                </h1>
                <p className="text-xl text-muted-foreground mb-8">
                  Your trusted platform for student-to-student marketplace
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">Safe Trading</h3>
                  <p className="text-sm text-muted-foreground">Secure marketplace for students</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6 text-success" />
                  </div>
                  <h3 className="font-semibold">Community</h3>
                  <p className="text-sm text-muted-foreground">Connect with fellow students</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto">
                    <Shield className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="font-semibold">Verified</h3>
                  <p className="text-sm text-muted-foreground">Email & phone verified users</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                    <Star className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">Quality</h3>
                  <p className="text-sm text-muted-foreground">Best deals and items</p>
                </div>
              </div>
            </div>

            {/* Right side - Sign in card */}
            <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-gradient-card">
              <CardHeader className="text-center space-y-4">
                <CardTitle className="text-2xl font-bold">Welcome Back!</CardTitle>
                <CardDescription className="text-base">
                  Sign in to start buying and selling with fellow students
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <SignInButton mode="modal" fallbackRedirectUrl="/" forceRedirectUrl="/">
                  <Button 
                    size="lg" 
                    className="w-full bg-gradient-primary hover:opacity-90 transition-opacity shadow-lg"
                  >
                    Sign In / Sign Up
                  </Button>
                </SignInButton>
                
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    New to Desi Market Place?{' '}
                    <span className="text-primary font-medium">Create your account instantly!</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        {children}
      </SignedIn>
    </>
  );
}

export function AuthButton() {
  return (
    <SignedIn>
      <UserButton 
        appearance={{
          elements: {
            avatarBox: "w-10 h-10"
          }
        }}
      />
    </SignedIn>
  );
}