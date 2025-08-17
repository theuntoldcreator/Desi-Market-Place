import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { create, getNumericDate, verify as verifyJwt } from 'https://deno.land/x/djwt@v2.8/mod.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { compare } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const JWT_SECRET = Deno.env.get('JWT_SECRET');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const token = authHeader.split(' ')[1];
    const payload = await verifyJwt(token, new TextEncoder().encode(JWT_SECRET), 'HS256');
    const userId = payload.sub;

    const { code } = await req.json();
    if (!code || code.length !== 6) {
      return new Response(JSON.stringify({ error: 'Invalid OTP format' }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: otpRecord, error: otpError } = await supabase
      .from('one_time_passwords')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRecord) throw new Error('No OTP found. Please request a new one.');
    if (new Date(otpRecord.expires_at) < new Date()) throw new Error('OTP has expired.');
    if (otpRecord.attempts >= 5) throw new Error('Too many attempts. Please request a new code.');

    const isValid = await compare(code, otpRecord.otp_hash);

    if (!isValid) {
      await supabase.from('one_time_passwords').update({ attempts: otpRecord.attempts + 1 }).eq('id', otpRecord.id);
      throw new Error('Invalid OTP.');
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) throw updateError;

    const newPayload = {
      sub: updatedUser.id,
      aud: 'authenticated',
      role: 'authenticated',
      exp: getNumericDate(60 * 60 * 24 * 7), // 7 days
    };
    const newJwt = await create({ alg: 'HS256', typ: 'JWT' }, newPayload, new TextEncoder().encode(JWT_SECRET));

    return new Response(JSON.stringify({
      access_token: newJwt,
      user: updatedUser,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, // Use 400 for logical errors like invalid OTP
    });
  }
});