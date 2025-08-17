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
    // 1. Check for all required environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const prosodyAdminUrl = Deno.env.get('PROSODY_ADMIN_URL');
    const prosodyAdminToken = Deno.env.get('PROSODY_ADMIN_TOKEN');

    if (!supabaseUrl || !serviceRoleKey || !anonKey || !prosodyAdminUrl || !prosodyAdminToken) {
      console.error('Missing one or more required environment variables for create-xmpp-user function.');
      throw new Error('Server is not configured correctly for chat setup.');
    }

    // Use the service role key to update user profiles securely
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Get the user from their authentication token
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
        supabaseUrl,
        anonKey,
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
    console.log(`Attempting to create XMPP user for ${userId} at ${prosodyAdminUrl}`);
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
        console.error(`Failed to create XMPP user in Prosody. Status: ${prosodyResponse.status}. Body: ${errorBody}`);
        // If user already exists, we can consider it a success and proceed to update our DB.
        if (prosodyResponse.status === 409) { // 409 Conflict
             console.warn(`XMPP user ${userId} already exists in Prosody. Proceeding to update profile.`);
        } else {
            throw new Error(`Could not create chat account due to a server communication error.`);
        }
    } else {
        console.log(`Successfully created XMPP user for ${userId} in Prosody.`);
    }
    // --- End Prosody API call ---

    // Update the user's profile in Supabase with the new JID and password
    console.log(`Updating profile for user ${userId} with JID.`);
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ jid, jid_password: password })
      .eq('id', userId);

    if (updateError) {
      console.error(`Failed to update profile for user ${userId} with JID:`, updateError);
      // In a production scenario, you might want to delete the user from Prosody if this DB update fails
      throw new Error('Could not save chat account details.');
    }
    console.log(`Successfully updated profile for user ${userId}.`);

    return new Response(JSON.stringify({ success: true, jid }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in create-xmpp-user function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})