import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Function to normalize phone numbers to a consistent format
const normalizePhone = (phone: string) => phone.replace(/[^\d]/g, '');

// Function to create a SHA-256 hash of the OTP
async function hashOtp(otp: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone } = await req.json();
    if (!phone) {
      return new Response(JSON.stringify({ error: 'Phone is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const normalizedPhone = normalizePhone(phone);

    // Find user profile by phone number to get their Telegram ID
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('telegram_id')
      .eq('phone_number', `+${normalizedPhone}`) // Assuming E.164 format with '+'
      .single();

    if (profileError || !profile || !profile.telegram_id) {
      console.warn(`No Telegram ID found for phone: ${normalizedPhone}`);
      return new Response(JSON.stringify({ 
        ok: true, 
        delivered: 'none',
        hint: 'Please message @UNTeverything_bot, press Start, then resend.' 
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await hashOtp(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes expiry

    // Store the hashed OTP
    const { error: otpError } = await supabaseAdmin
      .from('one_time_passwords')
      .insert({ phone: normalizedPhone, otp_hash: otpHash, expires_at: expiresAt });

    if (otpError) throw new Error(`Failed to store OTP: ${otpError.message}`);

    // Send the plaintext OTP via Telegram
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN is not set');

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: profile.telegram_id,
        text: `Your NRI's Marketplace login code is: ${code} (expires in 5 minutes)`,
      }),
    });

    return new Response(JSON.stringify({ ok: true, delivered: 'telegram' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in send-otp function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})