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
    const { phone_number } = await req.json();
    if (!phone_number) {
      throw new Error("Phone number is required.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find user by phone number
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, telegram_id')
      .eq('phone_number', phone_number)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Phone number not registered. Please interact with our Telegram bot first.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes expiry

    // Save OTP to the database
    const { error: otpError } = await supabaseAdmin
      .from('one_time_passwords')
      .insert({
        user_id: profile.id,
        otp_code: otp,
        expires_at: expires_at,
      });

    if (otpError) throw otpError;

    // Send OTP via Telegram bot
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is not set.");

    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const message = `Your NRI's Marketplace login code is: ${otp}. This code will expire in 5 minutes.`;

    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: profile.telegram_id,
        text: message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Telegram API error:", errorData);
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