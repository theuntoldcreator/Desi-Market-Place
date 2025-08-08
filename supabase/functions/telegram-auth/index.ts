import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { createHmac } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to verify the data received from Telegram
async function verifyTelegramAuth(data: Record<string, string>, botToken: string): Promise<boolean> {
  const { hash, ...rest } = data;
  if (!hash) return false;

  const checkString = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join('\n');

  const secretKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('WebAppData'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const hmac = await crypto.subtle.sign('HMAC', secretKey, new TextEncoder().encode(botToken));

  const finalKey = await crypto.subtle.importKey(
    'raw',
    hmac,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const finalHmac = await crypto.subtle.sign('HMAC', finalKey, new TextEncoder().encode(checkString));

  const hex = Array.from(new Uint8Array(finalHmac)).map(b => b.toString(16).padStart(2, '0')).join('');

  return hex === hash;
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const telegramUserData = await req.json();
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');

    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables.');
    }

    // 1. Verify the hash
    const isVerified = await verifyTelegramAuth(telegramUserData, botToken);
    if (!isVerified) {
      return new Response(JSON.stringify({ error: 'Invalid hash. Authentication failed.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Create a Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 3. Find or create the user
    const { id, first_name, last_name, username, photo_url } = telegramUserData;
    const email = `${username || id}@telegram.user`;

    let { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('telegram_id', id)
      .single();

    let userId = existingProfile?.id;

    if (!userId) {
      // User does not exist, create them
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: crypto.randomUUID(),
        email_confirm: true,
      });

      if (createError && createError.message !== 'User already registered') {
         throw createError;
      }
      
      const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(email);
      userId = existingUser.user.id;

      const { error: newProfileError } = await supabaseAdmin
        .from('profiles')
        .update({
          telegram_id: id,
          first_name: first_name,
          last_name: last_name,
          telegram_username: username,
          avatar_url: photo_url,
        })
        .eq('id', userId);

      if (newProfileError) throw newProfileError;
    }

    // 4. Generate a session for the user
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (error) throw error;

    // 5. Return the session to the client
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