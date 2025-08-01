import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Function to get Supabase admin client, which can bypass RLS
function getSupabaseAdmin(): SupabaseClient {
    return createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    // 1. Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Get chatId from the request body
    const { chatId } = await req.json();
    if (!chatId) {
      return new Response(JSON.stringify({ error: 'chatId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. Verify the user is a participant in the chat
    const { data: chat, error: chatError } = await supabaseAdmin.from('chats').select('buyer_id, seller_id').eq('id', chatId).single();
    if (chatError || !chat) {
      return new Response(JSON.stringify({ error: 'Chat not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (user.id !== chat.buyer_id && user.id !== chat.seller_id) {
      return new Response(JSON.stringify({ error: 'Forbidden: You are not a participant in this chat.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 4. Delete all messages and the chat itself using the admin client
    await supabaseAdmin.from('messages').delete().eq('chat_id', chatId);
    await supabaseAdmin.from('chats').delete().eq('id', chatId);

    return new Response(JSON.stringify({ message: 'Chat deleted successfully' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error deleting chat:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})