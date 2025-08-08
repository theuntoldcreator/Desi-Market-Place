import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Phone, KeyRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { countries, Country } from '@/lib/countries';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { FunctionsHttpError } from '@supabase/supabase-js';

const phoneSchema = z.object({
  countryCode: z.string().min(1, "Country code is required"),
  phoneNumber: z.string().min(5, "A valid phone number is required"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "Your OTP must be 6 digits"),
});

const Login = () => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [fullPhoneNumber, setFullPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const logoUrl = 'https://res.cloudinary.com/dlzvthxf5/image/upload/v1754093530/eaglelogo_otceda.png';

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { countryCode: '+1', phoneNumber: '' },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  const onPhoneSubmit = async (values: z.infer<typeof phoneSchema>) => {
    setIsLoading(true);
    const completeNumber = `${values.countryCode}${values.phoneNumber}`;
    setFullPhoneNumber(completeNumber);

    try {
      const { error } = await supabase.functions.invoke('send-telegram-otp', {
        body: { phoneNumber: completeNumber },
      });

      if (error) throw error;
      
      toast({ title: "OTP Sent!", description: "Check your Telegram for the login code." });
      setStep('otp');
    } catch (err: any) {
      let errorMessage = "Failed to send OTP. Please try again later.";
      if (err instanceof FunctionsHttpError) {
        try {
          const errorJson = await err.context.json();
          const serverError = errorJson.error || '';
          if (serverError.includes("not found")) {
            errorMessage = "This phone number is not registered. Please use a number linked to a Telegram account on our platform.";
          } else if (serverError.includes("not linked")) {
            errorMessage = "Your Telegram account isn't linked. Please start a chat with our bot on Telegram first.";
          }
        } catch (e) {
          // Context might not be valid JSON, fall back to generic message
        }
      }
      toast({ title: "Login Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const onOtpSubmit = async (values: z.infer<typeof otpSchema>) => {
    setIsLoading(true);
    try {
      const { data: session, error } = await supabase.functions.invoke('verify-telegram-otp', {
        body: { phoneNumber: fullPhoneNumber, otp: values.otp },
      });
      
      if (error) throw error;
      
      if (!session || !session.access_token) throw new Error("Authentication failed.");

      await supabase.auth.setSession(session);
      toast({ title: "Login Successful!", description: "Welcome back!" });
      navigate('/');
      setTimeout(() => window.location.reload(), 500);
    } catch (err: any) {
      let errorMessage = "Invalid or expired OTP. Please try again.";
      if (err instanceof FunctionsHttpError) {
        try {
          const errorJson = await err.context.json();
          if (errorJson.error) {
            errorMessage = errorJson.error;
          }
        } catch (e) {
          // Fall back to generic message
        }
      }
      toast({ title: "Login Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-marketplace-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-gradient-card">
        <CardHeader className="text-center space-y-2">
          <img src={logoUrl} alt="NRI's Marketplace Logo" className="w-12 h-12 rounded-lg mx-auto" />
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription className="text-base">
            {step === 'phone' ? 'Sign in with your Telegram phone number' : `Enter the code sent to ${fullPhoneNumber}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'phone' ? (
            <Form {...phoneForm}>
              <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <FormLabel>Phone Number</FormLabel>
                  <div className="flex gap-2">
                    <FormField name="countryCode" control={phoneForm.control} render={({ field }) => (<FormItem className="w-1/3"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{countries.map((c: Country) => <SelectItem key={c.code} value={c.dial_code}>{c.code} ({c.dial_code})</SelectItem>)}</SelectContent></Select></FormItem>)} />
                    <FormField name="phoneNumber" control={phoneForm.control} render={({ field }) => (<FormItem className="w-2/3"><FormControl><Input type="tel" placeholder="Phone number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}Send Code</Button>
              </form>
            </Form>
          ) : (
            <Form {...otpForm}>
              <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-6">
                <FormField
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>One-Time Passcode</FormLabel>
                      <FormControl><div className="flex justify-center"><InputOTP maxLength={6} {...field}><InputOTPGroup>{[...Array(6)].map((_, i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup></InputOTP></div></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}Verify & Sign In</Button>
                <Button variant="link" size="sm" className="w-full" onClick={() => setStep('phone')}>Use a different number</Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;