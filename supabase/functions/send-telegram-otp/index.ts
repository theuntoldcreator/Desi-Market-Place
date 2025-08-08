import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber } = await req.json();
    if (!phoneNumber) {
      throw new Error("Phone number is required.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, telegram_id')
      .eq('phone_number', phoneNumber)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'User with this phone number not found.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!profile.telegram_id) {
        return new Response(JSON.stringify({ error: 'User has not linked their Telegram account.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: otpError } = await supabaseAdmin
      .from('one_time_passwords')
      .insert({ user_id: profile.id, otp_code: otp, expires_at: expires_at });

    if (otpError) throw otpError;

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is not set.");

    const message = `Your NRI's Marketplace login code is: ${otp}. This code will expire in 5 minutes.`;
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: profile.telegram_id, text: message }),
    });

    if (!response.ok) {
      console.error("Telegram API error:", await response.json());
      throw new Error("Failed to send OTP via Telegram.");
    }

    return new Response(JSON.stringify({ success: true, message: "OTP sent to your Telegram." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});