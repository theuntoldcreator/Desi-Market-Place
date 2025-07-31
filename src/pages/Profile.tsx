import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MarketplaceHeader } from '@/components/marketplace/MarketplaceHeader';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Loader2, Upload } from 'lucide-react';
import { cn, formatFullName } from '@/lib/utils';
import { Profile } from '@/types';

const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  dob: z.date().optional(),
});

const passwordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function ProfilePage() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async (): Promise<Profile | null> => {
      if (!session) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!session,
  });

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: {
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      dob: profile?.dob ? new Date(profile.dob) : undefined,
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '' },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (values: z.infer<typeof profileSchema>) => {
      if (!session) throw new Error('Not authenticated');
      const { error } = await supabase.from('profiles').update(values).eq('id', session.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Profile updated successfully!' });
      queryClient.invalidateQueries({ queryKey: ['profile', session?.user?.id] });
    },
    onError: (error: Error) => toast({ title: 'Error updating profile', description: error.message, variant: 'destructive' }),
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (values: z.infer<typeof passwordSchema>) => {
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Password updated successfully!' });
      passwordForm.reset();
    },
    onError: (error: Error) => toast({ title: 'Error updating password', description: error.message, variant: 'destructive' }),
  });
  
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !session) return;

    const filePath = `${session.user.id}/avatar-${Date.now()}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
    if (uploadError) {
        toast({ title: 'Avatar Upload Failed', description: uploadError.message, variant: 'destructive' });
        return;
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id);
     if (updateError) {
        toast({ title: 'Failed to Update Profile', description: updateError.message, variant: 'destructive' });
        return;
    }
    
    toast({ title: 'Avatar updated!' });
    queryClient.invalidateQueries({ queryKey: ['profile', session?.user?.id] });
  };


  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <MarketplaceHeader onCreateListing={() => {}} />
      <main className="container mx-auto max-w-4xl py-8">
        <div className="mb-8 text-center">
          <div className="relative inline-block">
            <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
              <AvatarImage src={profile?.avatar_url ?? ''} alt={formatFullName(profile)} />
              <AvatarFallback className="text-4xl">{profile?.first_name?.[0]}{profile?.last_name?.[0]}</AvatarFallback>
            </Avatar>
            <label htmlFor="avatar-upload" className="absolute bottom-1 right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90">
                <Upload className="h-4 w-4" />
                <input id="avatar-upload" type="file" accept="image/*" className="sr-only" onChange={handleAvatarUpload} />
            </label>
          </div>
          <h1 className="mt-4 text-3xl font-bold">{formatFullName(profile)}</h1>
          <p className="text-muted-foreground">{session?.user.email}</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Edit Profile</CardTitle><CardDescription>Update your personal information.</CardDescription></CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
                  <FormField name="first_name" control={profileForm.control} render={({ field }) => (<FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField name="last_name" control={profileForm.control} render={({ field }) => (<FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField name="dob" control={profileForm.control} render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Date of Birth</FormLabel>
                      <Popover><PopoverTrigger asChild><FormControl>
                        <Button variant="outline" className={cn('pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl></PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                      </Popover><FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Change Password</CardTitle><CardDescription>Choose a new password.</CardDescription></CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit((data) => updatePasswordMutation.mutate(data))} className="space-y-4">
                  <FormField name="password" control={passwordForm.control} render={({ field }) => (<FormItem><FormLabel>New Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <Button type="submit" disabled={updatePasswordMutation.isPending}>
                    {updatePasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update Password
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}