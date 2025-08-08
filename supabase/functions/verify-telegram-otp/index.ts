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
    const { phoneNumber, otp } = await req.json();
    if (!phoneNumber || !otp) {
      throw new Error("Phone number and OTP are required.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone_number', phoneNumber)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'User not found.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();
    const { data: otpEntry, error: otpError } = await supabaseAdmin
      .from('one_time_passwords')
      .select('*')
      .eq('user_id', profile.id)
      .eq('otp_code', otp)
      .gte('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpEntry) {
      return new Response(JSON.stringify({ error: 'Invalid or expired OTP.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabaseAdmin.from('one_time_passwords').delete().eq('id', otpEntry.id);

    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    if (userError || !user) {
        throw new Error("Could not retrieve user details.");
    }

    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
    });

    if (linkError) throw linkError;

    return new Response(JSON.stringify(data.session), {
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