import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';
import { DobPicker } from '@/components/auth/DobPicker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import marketplaceLogo from '@/assets/marketplace.jpg';
import { countries } from '@/lib/countries'; // Import countries

const eighteenYearsAgo = new Date();
eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);

const signUpSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  gender: z.enum(['male', 'female'], { required_error: "Gender is required" }),
  countryCode: z.string().min(1, "Country code is required"), // Added countryCode
  phoneNumber: z.string().min(1, "Phone number is required").regex(/^\d+$/, "Phone number must contain only digits"), // Updated validation
  dob: z.date({ required_error: "Date of birth is required" }).max(eighteenYearsAgo, "You must be at least 18 years old"),
  location: z.string().min(1, "Location is required"),
});

export default function SignUp() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { 
      firstName: '', 
      lastName: '', 
      email: '', 
      password: '', 
      countryCode: '+1', // Default country code
      phoneNumber: '', 
      location: '' 
    },
  });

  async function onSubmit(values: z.infer<typeof signUpSchema>) {
    const avatar_url = values.gender === 'male'
      ? 'https://res.cloudinary.com/div5rg0md/image/upload/v1754059528/male-avatar_tpeqcf.png'
      : 'https://res.cloudinary.com/div5rg0md/image/upload/v1754059528/female-avatar_qba6zs.png';

    const fullPhoneNumber = `${values.countryCode}${values.phoneNumber.replace(/\D/g, '')}`; // Combine country code and local number

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          first_name: values.firstName,
          last_name: values.lastName,
          gender: values.gender,
          phone_number: fullPhoneNumber, // Save combined phone number
          dob: values.dob.toISOString().split('T')[0],
          avatar_url: avatar_url,
          location: values.location,
        }
      }
    });

    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success!", description: "Please check your email to confirm your account." });
      navigate('/');
    }
  }

  const logoUrl = marketplaceLogo;

  return (
    <div className="min-h-screen bg-marketplace-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-lg mx-auto shadow-xl border-0 bg-gradient-card">
        <CardHeader className="text-center space-y-2">
          <img src={logoUrl} alt="Logo" className="w-12 h-12 mx-auto" />
          <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
          <CardDescription className="text-base">Join our community to start buying and selling!</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField name="firstName" control={form.control} render={({ field }) => (<FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField name="lastName" control={form.control} render={({ field }) => (<FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField name="email" control={form.control} render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="you@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField name="password" control={form.control} render={({ field }) => (<FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField name="gender" control={form.control} render={({ field }) => (<FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField name="location" control={form.control} render={({ field }) => (<FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="Your City, State" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className="flex items-center gap-2">
                <FormField
                  name="countryCode"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {countries.map(c => <SelectItem key={c.code} value={c.dial_code}>{`${c.code} ${c.dial_code}`}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField name="phoneNumber" control={form.control} render={({ field }) => (<FormItem className="flex-1"><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="1234567890" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <Alert className="text-xs p-3">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Your number is used for WhatsApp chat on listings. Be respectful and avoid sharing sensitive info.
                </AlertDescription>
              </Alert>
              <FormField
                name="dob"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <DobPicker
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  You must be 18 or older to sign up. Your personal information is kept secure and is only used for verification purposes.
                </AlertDescription>
              </Alert>
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign Up
              </Button>
            </form>
          </Form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link to="/" className="font-semibold text-primary hover:underline">Sign In</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}