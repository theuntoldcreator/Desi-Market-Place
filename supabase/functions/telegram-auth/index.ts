import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { create, getNumericDate } from 'https://deno.land/x/djwt@v2.8/mod.ts';
import { corsHeaders } from '../_shared/cors.ts';

const JWT_SECRET = Deno.env.get('JWT_SECRET');
const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');

async function verifyTelegramWebAppData(telegramInitData: string): Promise<boolean> {
  const encoded = new URLSearchParams(telegramInitData);
  const hash = encoded.get('hash');
  encoded.delete('hash');

  const dataToCheck: string[] = [];
  for (const [key, value] of Array.from(encoded.entries()).sort()) {
    dataToCheck.push(`${key}=${value}`);
  }

  const checkString = dataToCheck.join('\n');
  
  if (!BOT_TOKEN) {
    console.error("BOT_TOKEN is not set");
    return false;
  }

  const secretKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('WebAppData'),
    { name: 'HMAC', hash: 'SHA-256' },
    true,
    ['sign']
  );

  const secret = await crypto.subtle.sign('HMAC', secretKey, new TextEncoder().encode(BOT_TOKEN));

  const key = await crypto.subtle.importKey(
    'raw',
    secret,
    { name: 'HMAC', hash: 'SHA-256' },
    true,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(checkString));
  const hex = [...new Uint8Array(signature)].map(b => b.toString(16).padStart(2, '0')).join('');

  return hash === hex;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { initData } = await req.json();
    if (!initData) {
      return new Response(JSON.stringify({ error: 'initData is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const isValid = await verifyTelegramWebAppData(initData);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid Telegram signature' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get('user') || '{}');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Upsert user into profiles table
    const { data: profile, error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        tg_user_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        language_code: user.language_code,
        is_premium: user.is_premium || false,
        avatar_url: user.photo_url,
      }, { onConflict: 'tg_user_id', ignoreDuplicates: false })
      .select()
      .single();

    if (upsertError) throw upsertError;

    if (!JWT_SECRET) throw new Error('JWT_SECRET is not set!');

    const payload = {
      sub: profile.id,
      aud: 'authenticated',
      role: 'authenticated',
      exp: getNumericDate(60 * 60 * 24 * 7), // 7 days
    };
    const jwt = await create({ alg: 'HS256', typ: 'JWT' }, payload, new TextEncoder().encode(JWT_SECRET));

    return new Response(JSON.stringify({
      access_token: jwt,
      user: profile,
      requiresOtp: !profile.verified_at,
    }), {
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