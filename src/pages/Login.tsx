import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Bot } from 'lucide-react';
import { PhoneNumberInput } from '@/components/auth/PhoneNumberInput';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type LoginStep = 'phone' | 'otp';

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<LoginStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('telegram-otp-send', {
        body: { phone_number: phoneNumber },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "OTP Sent!",
        description: "Check your Telegram for the login code.",
      });
      setStep('otp');
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to send OTP.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setIsLoading(true);
    try {
      const { data: session, error } = await supabase.functions.invoke('telegram-otp-verify', {
        body: { phone_number: phoneNumber, otp },
      });

      if (error) throw error;
      if (session.error) throw new Error(session.error);
      if (!session.access_token) throw new Error("Authentication failed.");

      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      toast({
        title: "Login Successful!",
        description: "Welcome back!",
      });

      navigate('/');
      setTimeout(() => window.location.reload(), 500);

    } catch (err: any) {
      toast({
        title: "Verification Failed",
        description: err.message || "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logoUrl = 'https://res.cloudinary.com/dlzvthxf5/image/upload/v1754093530/eaglelogo_otceda.png';

  return (
    <div className="min-h-screen bg-marketplace-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-gradient-card">
        <CardHeader className="text-center space-y-2">
          <img src={logoUrl} alt="NRI's Marketplace Logo" className="w-12 h-12 rounded-lg mx-auto" />
          <CardTitle className="text-2xl font-bold">Welcome to NRI's Marketplace</CardTitle>
          <CardDescription className="text-base">
            {step === 'phone' ? 'Enter your phone number to get a login code.' : 'Enter the code sent to your Telegram.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'phone' ? (
            <div className="space-y-4">
              <PhoneNumberInput value={phoneNumber} onChange={setPhoneNumber} disabled={isLoading} />
              <Button onClick={handleSendOtp} disabled={isLoading || phoneNumber.length < 10} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Code
              </Button>
            </div>
          ) : (
            <div className="space-y-4 flex flex-col items-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              <Button onClick={handleVerifyOtp} disabled={isLoading || otp.length < 6} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify & Login
              </Button>
              <Button variant="link" onClick={() => setStep('phone')} disabled={isLoading}>
                Use a different phone number
              </Button>
            </div>
          )}
          <Alert>
            <Bot className="h-4 w-4" />
            <AlertDescription className="text-xs">
              First time? You must start a chat with our <a href="https://t.me/UNTeverything_bot" target="_blank" rel="noopener noreferrer" className="font-semibold underline">Telegram Bot</a> and share your contact info to enable phone login.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;