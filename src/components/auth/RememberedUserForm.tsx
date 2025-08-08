import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';

interface RememberedUser {
  email: string;
  fullName: string;
  avatarUrl: string | null;
}

interface RememberedUserFormProps {
  user: RememberedUser;
  onSwitchAccount: () => void;
}

const loginSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export function RememberedUserForm({ user, onSwitchAccount }: RememberedUserFormProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { password: '' },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: values.password,
    });

    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      localStorage.removeItem('rememberedUser'); // Clean up on successful login
      toast({ title: "Login successful!", description: "Welcome back." });
      navigate('/');
    }
  }

  const fallback = user.fullName ? user.fullName[0].toUpperCase() : user.email[0].toUpperCase();
  const logoUrl = 'https://res.cloudinary.com/dlzvthxf5/image/upload/v1754093530/eaglelogo_otceda.png';

  return (
    <div className="min-h-screen bg-marketplace-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-gradient-card">
        <CardHeader className="text-center space-y-4">
          <img src={logoUrl} alt="Logo" className="w-12 h-12 mx-auto" />
          <div className="flex flex-col items-center gap-2">
            <Avatar className="w-20 h-20">
              <AvatarImage src={user.avatarUrl || undefined} alt={user.fullName} />
              <AvatarFallback className="text-3xl">{fallback}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-xl font-bold">Welcome back, {user.fullName || user.email}!</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                name="password"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} autoFocus />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Log In
              </Button>
            </form>
          </Form>
          <div className="text-center mt-4">
            <Button variant="link" onClick={onSwitchAccount} className="text-sm text-muted-foreground">
              Not you? Sign in with a different account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}