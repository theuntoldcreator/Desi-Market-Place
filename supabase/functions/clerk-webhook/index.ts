import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Webhook } from 'svix'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const CLERK_WEBHOOK_SECRET = Deno.env.get('CLERK_WEBHOOK_SECRET')
    if (!CLERK_WEBHOOK_SECRET) {
      throw new Error('CLERK_WEBHOOK_SECRET is not set in environment variables.')
    }

    const headers = req.headers
    const payload = await req.json()
    
    const wh = new Webhook(CLERK_WEBHOOK_SECRET)
    const svix_id = headers.get('svix-id')
    const svix_timestamp = headers.get('svix-timestamp')
    const svix_signature = headers.get('svix-signature')

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response('Error: Missing svix headers', { status: 400 })
    }

    const evt: { type: string; data: any } = wh.verify(JSON.stringify(payload), {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as { type: string; data: any };

    const { type, data } = evt
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    switch (type) {
      case 'user.created': {
        const { id, first_name, last_name, image_url } = data;
        const { error } = await supabaseAdmin.from('profiles').insert({
          id: id,
          first_name: first_name,
          last_name: last_name,
          avatar_url: image_url,
          role: 'user', // Default role
        });
        if (error) throw new Error(`Failed to create profile: ${error.message}`);
        
        // Set the role in Clerk's metadata for easy access on the client
        const clerkSecret = Deno.env.get('CLERK_SECRET_KEY');
        if (clerkSecret) {
            await fetch(`https://api.clerk.dev/v1/users/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${clerkSecret}`
                },
                body: JSON.stringify({ public_metadata: { role: 'user' } })
            });
        }
        break;
      }
      case 'user.updated': {
        const { id, first_name, last_name, image_url } = data;
        const { error } = await supabaseAdmin.from('profiles').update({
          first_name: first_name,
          last_name: last_name,
          avatar_url: image_url,
        }).eq('id', id);
        if (error) throw new Error(`Failed to update profile: ${error.message}`);
        break;
      }
      case 'user.deleted': {
        const { id } = data;
        if (id) {
            const { error } = await supabaseAdmin.from('profiles').delete().eq('id', id);
            if (error) throw new Error(`Failed to delete profile: ${error.message}`);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in Clerk webhook handler:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})