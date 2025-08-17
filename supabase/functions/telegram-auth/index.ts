import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Securely generate a random password for new users.
const generatePassword = (length = 20) => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
  let password = "";
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }
  return password;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const telegramUserData = await req.json()
    
    // --- Step 1: Verify Environment Variables ---
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!botToken) {
      console.error('FATAL: TELEGRAM_BOT_TOKEN is not set in environment variables.');
      throw new Error('Server configuration error: Missing bot token.');
    }
    if (!Deno.env.get('SUPABASE_URL') || !Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
      console.error('FATAL: Supabase environment variables are not set.');
      throw new Error('Server configuration error: Missing Supabase credentials.');
    }

    // --- Step 2: Telegram Hash Validation ---
    const { hash, ...userData } = telegramUserData
    const dataCheckString = Object.keys(userData)
      .sort()
      .map((key) => `${key}=${userData[key]}`)
      .join('\n')

    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest()
    const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

    if (calculatedHash !== hash) {
      console.warn('Hash validation failed. Incoming hash:', hash, 'Calculated hash:', calculatedHash);
      return new Response(JSON.stringify({ error: 'Invalid hash. Authentication failed.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    // --- Step 3: Initialize Supabase Admin Client ---
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const userEmail = `${userData.id}@telegram.user`;

    // --- Step 4: Check for existing user and create/update profile ---
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('telegram_id', userData.id)
      .single()

    if (existingProfile) {
      const { error: updateError } = await supabaseAdmin.from('profiles').update({
        first_name: userData.first_name,
        last_name: userData.last_name,
        avatar_url: userData.photo_url,
        telegram_username: userData.username,
      }).eq('id', existingProfile.id)
      if (updateError) throw new Error(`Failed to update profile: ${updateError.message}`);
    } else {
      const { error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        password: generatePassword(),
        email_confirm: true,
        user_metadata: {
          first_name: userData.first_name,
          last_name: userData.last_name,
          avatar_url: userData.photo_url,
          telegram_id: userData.id,
          username: userData.username,
        },
      })
      if (userError && !userError.message.includes('already exists')) {
        throw new Error(`Failed to create user: ${userError.message}`);
      }
    }

    // --- Step 5: Generate Magic Link ---
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: userEmail,
    });
    if (linkError) throw new Error(`Failed to generate magic link: ${linkError.message}`);

    // --- Step 6: Send Magic Link via Telegram Bot ---
    const magicLink = linkData.properties.action_link;
    const messageText = `Click this link to log in to NRI's Marketplace: ${magicLink}`;
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const telegramResponse = await fetch(telegramApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: userData.id,
            text: messageText,
        }),
    });

    if (!telegramResponse.ok) {
        const errorBody = await telegramResponse.json();
        console.error('Telegram API error:', errorBody);
        throw new Error(`Failed to send Telegram message: ${errorBody.description || 'Unknown error'}`);
    }

    // --- Success ---
    return new Response(JSON.stringify({ success: true, message: 'Login link sent to your Telegram.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    // --- Centralized Error Handling ---
    console.error('Critical error in telegram-auth function:', error.message);
    return new Response(JSON.stringify({ error: `An internal server error occurred. Details: ${error.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})