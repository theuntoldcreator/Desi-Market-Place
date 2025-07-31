import { useState } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import logo from '@/assets/logofile.png';

const Login = () => {
  const [view, setView] = useState<'sign_in' | 'sign_up'>('sign_in');
  return (
    <div className="min-h-screen bg-marketplace-bg flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center shadow-lg">
              <img src={logo} alt="Desi Market Place Logo" className="w-10 h-10" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Desi Market Place</h1>
          </div>
          <p className="text-lg sm:text-xl text-muted-foreground">Your trusted platform for student-to-student marketplace. Sign in or create an account to start buying and selling.</p>
        </div>
        <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-gradient-card">
          {view === 'sign_in' ? <SignInView setView={setView} /> : <SignUpView setView={setView} />}
        </Card>
      </div>
    </div>
  );
};

const SignInView = ({ setView }: { setView: (v: 'sign_in' | 'sign_up') => void }) => (
  <>
    <CardHeader className="text-center space-y-2">
      <CardTitle className="text-2xl font-bold">Welcome Back!</CardTitle>
      <CardDescription className="text-base">Sign in to continue</CardDescription>
    </CardHeader>
    <CardContent>
      <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa, variables: { default: { colors: { brand: 'hsl(214 84% 56%)', brandAccent: 'hsl(214 84% 50%)' } } } }} providers={[]} theme="light" view="sign_in" />
      <p className="mt-4 text-center text-sm">Don't have an account? <Button variant="link" className="p-0 h-auto" onClick={() => setView('sign_up')}>Sign up</Button></p>
    </CardContent>
  </>
);

const SignUpView = ({ setView }: { setView: (v: 'sign_in' | 'sign_up') => void }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', first_name: '', last_name: '' });

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: { data: { first_name: formData.first_name, last_name: formData.last_name } }
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success!', description: 'Please check your email to verify your account.' });
      setView('sign_in');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  return (
    <>
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
        <CardDescription className="text-base">Join our marketplace today!</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="first_name">First Name</Label><Input id="first_name" value={formData.first_name} onChange={handleChange} required /></div>
            <div className="space-y-2"><Label htmlFor="last_name">Last Name</Label><Input id="last_name" value={formData.last_name} onChange={handleChange} required /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={formData.email} onChange={handleChange} required /></div>
          <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" value={formData.password} onChange={handleChange} required /></div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign Up
          </Button>
        </form>
        <p className="mt-4 text-center text-sm">Already have an account? <Button variant="link" className="p-0 h-auto" onClick={() => setView('sign_in')}>Sign in</Button></p>
      </CardContent>
    </>
  );
};

export default Login;