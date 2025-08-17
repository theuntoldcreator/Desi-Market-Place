import { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function OtpVerification() {
  const { token, setSession, setOtpRequired, updateUser } = useAuth();
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSendOtp = async () => {
    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-otp', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) throw error;
      toast({ title: 'Success', description: 'A new OTP has been sent to your Telegram.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to send OTP.', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast({ title: 'Invalid Code', description: 'Please enter a 6-digit code.', variant: 'destructive' });
      return;
    }
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        headers: { Authorization: `Bearer ${token}` },
        body: { code: otp },
      });
      if (error) throw error;
      
      // Update session with new token and verified user
      setSession(data.user, data.access_token);
      updateUser(data.user);
      setOtpRequired(false);
      toast({ title: 'Success!', description: 'Your account has been verified.' });
    } catch (error: any) {
      toast({ title: 'Verification Failed', description: error.message || 'An unknown error occurred.', variant: 'destructive' });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-marketplace-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verify Your Account</CardTitle>
          <CardDescription>
            We've sent a 6-digit code to your Telegram. Please enter it below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
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
          </div>
          <Button onClick={handleVerifyOtp} disabled={isVerifying || otp.length < 6} className="w-full">
            {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify
          </Button>
          <Button onClick={handleSendOtp} disabled={isSending} variant="link" className="w-full">
            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Didn't receive a code? Send again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}