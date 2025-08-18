import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { initializeApp, cert } from 'npm:firebase-admin@12.0.0/app'
import { getAuth } from 'npm:firebase-admin@12.0.0/auth'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// IMPORTANT: Set these secrets in your Supabase project dashboard
// Project Settings > Edge Functions > Add New Secret
// 1. FIREBASE_SERVICE_ACCOUNT_KEY: Your Firebase service account JSON key
const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY')!)

// Initialize Firebase Admin SDK
try {
  initializeApp({
    credential: cert(serviceAccount),
  })
} catch (e) {
  // Ignore "already initialized" error during hot-reloads
  if (e.code !== 'app/duplicate-app') {
    console.error('Firebase Admin initialization error:', e)
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Get Supabase token from request header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }
    const supabaseToken = authHeader.replace('Bearer ', '')

    // 2. Verify the token and get the user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${supabaseToken}` } } }
    )
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Invalid Supabase token')
    }

    // 3. Mint a custom Firebase token with the Supabase user ID
    const firebaseToken = await getAuth().createCustomToken(user.id)

    return new Response(JSON.stringify({ firebaseToken }), {
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