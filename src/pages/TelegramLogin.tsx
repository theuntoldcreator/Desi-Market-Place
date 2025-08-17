import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import marketplaceLogo from '@/assets/marketplace.jpg';

/**
 * Phone-based login via Telegram.
 * Users enter their phone, get a code in Telegram, then verify it.
 */
export default function TelegramLogin() {
  const [phone, setPhone] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const sendCode = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { phone },
      });

      if (error) throw new Error(error.message);

      if (data.delivered === 'telegram') {
        toast({ title: 'Code sent', description: 'Check your Telegram DM for the 6-digit code.' });
        setCodeSent(true);
      } else {
        toast({ title: 'Link Telegram', description: data.hint ?? 'Please start the bot and try again.', duration: 10000 });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message ?? 'Failed to send code.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { phone, code },
      });

      if (error) throw new Error(error.message);
      
      if (data.ok) {
        // This is a non-Supabase token, as per the design.
        localStorage.setItem('sessionToken', data.token);
        toast({ title: 'Success', description: 'You are now logged in.' });
        // Note: This does not create a Supabase session.
        // You would need to redirect to a page that handles this custom session.
        // For now, redirecting to home.
        navigate('/');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message ?? 'Failed to verify code.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-marketplace-bg">
      <Card className="w-full max-w-md shadow-xl border-0 bg-gradient-card">
        <CardHeader className="text-center space-y-2">
          <img src={marketplaceLogo} alt="Logo" className="w-16 h-16 mx-auto rounded-lg" />
          <CardTitle className="text-2xl font-bold">Telegram Login</CardTitle>
          <CardDescription className="text-base">
            {!codeSent ? 'Enter your phone to get a login code.' : 'Check Telegram for your code.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!codeSent ? (
            <div className="space-y-4">
              <Input
                type="tel"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-center text-lg p-6"
              />
              <Button onClick={sendCode} disabled={loading || !phone} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Sending...' : 'Send Code'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Enter the 6-digit code"
                value={code}
                maxLength={6}
                onChange={(e) => setCode(e.target.value)}
                className="text-center text-lg p-6 tracking-[1em]"
              />
              <Button onClick={verifyCode} disabled={loading || code.length !== 6} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Verifying...' : 'Verify & Login'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}