import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user: caller } } = await supabaseClient.auth.getUser()

    if (!caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized: No authenticated user.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // Check if the caller is an admin
    const { data: callerProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (profileError || callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Only administrators can perform this action.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // Parse the request body to get the userIdToUpdate and newRole
    const { userIdToUpdate, newRole } = await req.json();

    if (!userIdToUpdate || !newRole || !['user', 'admin'].includes(newRole)) {
      return new Response(JSON.stringify({ error: 'Bad Request: userIdToUpdate and a valid newRole (user/admin) are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Prevent admin from changing their own role via this portal
    if (userIdToUpdate === caller.id) {
      return new Response(JSON.stringify({ error: 'Forbidden: You cannot change your own role via this portal.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Update user's app_metadata role
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUser(userIdToUpdate, {
      app_metadata: { role: newRole }
    })

    if (authUpdateError) {
      throw authUpdateError
    }

    // Also update the public.profiles table to keep it in sync
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userIdToUpdate);

    if (profileUpdateError) {
      throw profileUpdateError;
    }

    return new Response(JSON.stringify({ message: `User ${userIdToUpdate} role updated to ${newRole} successfully` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})