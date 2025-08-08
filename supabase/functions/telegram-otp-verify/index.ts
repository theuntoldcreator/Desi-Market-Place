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
    const { phone_number, otp } = await req.json();
    if (!phone_number || !otp) {
      throw new Error("Phone number and OTP are required.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: profileData, error: profileDataError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone_number', phone_number)
      .single();

    if (profileDataError || !profileData) {
      throw new Error("Invalid phone number.");
    }
    const userId = profileData.id;

    // Verify OTP
    const now = new Date().toISOString();
    const { data: otpData, error: otpError } = await supabaseAdmin
      .from('one_time_passwords')
      .select('id')
      .eq('user_id', userId)
      .eq('otp_code', otp)
      .gte('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpData) {
      return new Response(JSON.stringify({ error: 'Invalid or expired OTP.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabaseAdmin.from('one_time_passwords').delete().eq('id', otpData.id);

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !userData.user) throw new Error("Could not find user.");
    const email = userData.user.email;

    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (sessionError) throw sessionError;

    return new Response(JSON.stringify(sessionData.session), {
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