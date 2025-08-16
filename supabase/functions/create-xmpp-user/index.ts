import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Function to generate a secure, random password
const generatePassword = (length = 16) => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
  let password = "";
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }
  return password;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Use the service role key to update user profiles securely
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the user from their authentication token
    const authHeader = req.headers.get('Authorization')!
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const userId = user.id;
    const jid = `${userId}@chat.nrimarketplace.icu`;
    const password = generatePassword();

    // --- Call Prosody Admin API to create user ---
    const prosodyAdminUrl = Deno.env.get('PROSODY_ADMIN_URL');
    const prosodyAdminToken = Deno.env.get('PROSODY_ADMIN_TOKEN');

    if (!prosodyAdminUrl || !prosodyAdminToken) {
        console.error('Prosody admin URL or token not configured in Supabase secrets.');
        throw new Error('Server configuration error for chat user creation.');
    }

    const prosodyResponse = await fetch(prosodyAdminUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${prosodyAdminToken}`
        },
        body: JSON.stringify({
            username: userId,
            password: password,
            domain: 'chat.nrimarketplace.icu'
        })
    });

    if (!prosodyResponse.ok) {
        const errorBody = await prosodyResponse.text();
        console.error(`Failed to create XMPP user: ${errorBody}`);
        throw new Error(`Could not create chat account. Status: ${prosodyResponse.status}`);
    }
    // --- End Prosody API call ---

    // Update the user's profile in Supabase with the new JID and password
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ jid, jid_password: password })
      .eq('id', userId);

    if (updateError) {
      // In a production scenario, you might want to delete the user from Prosody if this DB update fails
      console.error('Failed to update profile with JID:', updateError);
      throw updateError;
    }

    return new Response(JSON.stringify({ success: true, jid }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})