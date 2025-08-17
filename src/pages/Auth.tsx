import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import marketplaceLogo from '@/assets/marketplace.jpg';

const signUpSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type SignUpValues = z.infer<typeof signUpSchema>;
type SignInValues = z.infer<typeof signInSchema>;
type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

const Auth = () => {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [authView, setAuthView] = useState<'tabs' | 'forgotPassword'>('tabs');

  const {
    register: registerSignUp,
    handleSubmit: handleSignUpSubmit,
    formState: { errors: signUpErrors },
  } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) });

  const {
    register: registerSignIn,
    handleSubmit: handleSignInSubmit,
    formState: { errors: signInErrors },
  } = useForm<SignInValues>({ resolver: zodResolver(signInSchema) });

  const {
    register: registerForgot,
    handleSubmit: handleForgotSubmit,
    formState: { errors: forgotErrors },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSignUp = async (data: SignUpValues) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
        },
      },
    });
    setIsLoading(false);
    if (error) {
      toast({ title: 'Sign Up Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success!', description: 'Please check your email to verify your account.' });
    }
  };

  const onSignIn = async (data: SignInValues) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    setIsLoading(false);
    if (error) {
      toast({ title: 'Sign In Error', description: error.message, variant: 'destructive' });
    } else {
      const listingId = location.state?.listingId;
      const redirectPath = listingId ? `/?openListing=${listingId}` : '/';
      navigate(redirectPath, { replace: true });
    }
  };

  const onForgotPassword = async (data: ForgotPasswordValues) => {
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/`,
    });
    setIsLoading(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success!', description: 'Password reset link sent. Please check your email.' });
      setAuthView('tabs');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (session) {
    const listingId = new URLSearchParams(window.location.search).get('openListing');
    const redirectPath = listingId ? `/?openListing=${listingId}` : '/';
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="mb-8 text-center">
        <Link to="/" className="inline-flex items-center space-x-3 group">
          <img src={marketplaceLogo} alt="NRI's Marketplace Logo" className="w-12 h-12 rounded-lg border border-gray-200 group-hover:opacity-80 transition-opacity" />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground group-hover:text-primary transition-colors">
            NRI's Marketplace
          </h1>
        </Link>
      </div>
      {authView === 'tabs' ? (
        <Tabs defaultValue="sign-in" className="w-full max-w-md">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sign-in">Sign In</TabsTrigger>
            <TabsTrigger value="sign-up">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="sign-in">
            <Card>
              <CardHeader>
                <CardTitle>Sign In</CardTitle>
                <CardDescription>Enter your credentials to access your account.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignInSubmit(onSignIn)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signIn-email">Email</Label>
                    <Input id="signIn-email" type="email" {...registerSignIn('email')} />
                    {signInErrors.email && <p className="text-sm text-destructive">{signInErrors.email.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signIn-password">Password</Label>
                    <Input id="signIn-password" type="password" {...registerSignIn('password')} />
                    {signInErrors.password && <p className="text-sm text-destructive">{signInErrors.password.message}</p>}
                  </div>
                  <div className="text-right -mt-2">
                    <Button variant="link" type="button" onClick={() => setAuthView('forgotPassword')} className="px-0 h-auto text-sm font-normal">
                      Forgot Password?
                    </Button>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="sign-up">
            <Card>
              <CardHeader>
                <CardTitle>Sign Up</CardTitle>
                <CardDescription>Create an account to start buying and selling.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignUpSubmit(onSignUp)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" {...registerSignUp('firstName')} />
                      {signUpErrors.firstName && <p className="text-sm text-destructive">{signUpErrors.firstName.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" {...registerSignUp('lastName')} />
                      {signUpErrors.lastName && <p className="text-sm text-destructive">{signUpErrors.lastName.message}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signUp-email">Email</Label>
                    <Input id="signUp-email" type="email" {...registerSignUp('email')} />
                    {signUpErrors.email && <p className="text-sm text-destructive">{signUpErrors.email.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signUp-password">Password</Label>
                    <Input id="signUp-password" type="password" {...registerSignUp('password')} />
                    {signUpErrors.password && <p className="text-sm text-destructive">{signUpErrors.password.message}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Forgot Password</CardTitle>
            <CardDescription>Enter your email to receive a password reset link.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotSubmit(onForgotPassword)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input id="forgot-email" type="email" {...registerForgot('email')} />
                {forgotErrors.email && <p className="text-sm text-destructive">{forgotErrors.email.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>
              <Button variant="link" type="button" onClick={() => setAuthView('tabs')} className="w-full font-normal">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Auth;