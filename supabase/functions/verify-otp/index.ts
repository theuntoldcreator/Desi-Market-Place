import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { randomBytes } from 'https://deno.land/std@0.110.0/node/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const normalizePhone = (phone: string) => phone.replace(/[^\d]/g, '');

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
    const { phone, code } = await req.json();
    if (!phone || !code) {
      return new Response(JSON.stringify({ error: 'Phone and code are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const normalizedPhone = normalizePhone(phone);

    // Find the latest OTP for this phone number
    const { data: record, error: fetchError } = await supabaseAdmin
      .from('one_time_passwords')
      .select('*')
      .eq('phone', normalizedPhone)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !record) {
      return new Response(JSON.stringify({ error: 'Invalid or expired code' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Clean up the used record regardless of outcome
    await supabaseAdmin.from('one_time_passwords').delete().eq('id', record.id);

    if (new Date() > new Date(record.expires_at)) {
      return new Response(JSON.stringify({ error: 'Invalid or expired code' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const providedOtpHash = await hashOtp(code);
    if (providedOtpHash !== record.otp_hash) {
      return new Response(JSON.stringify({ error: 'Invalid code' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // OTP is valid. Generate a session token as requested.
    const token = randomBytes(32).toString('hex');

    return new Response(JSON.stringify({ ok: true, token }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in verify-otp function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})