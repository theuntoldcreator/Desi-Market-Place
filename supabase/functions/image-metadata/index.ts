import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decode } from 'https://deno.land/x/imagescript@1.2.15/mod.ts';
import { encode } from 'https://esm.sh/blurhash@2.0.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { path, listingId } = await req.json();
    if (!path || !listingId) {
      throw new Error('Missing required parameters: path, listingId');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: blob, error: downloadError } = await supabaseAdmin.storage
      .from('listing_images')
      .download(path);

    if (downloadError) throw downloadError;

    const buffer = await blob.arrayBuffer();
    const image = await decode(buffer);

    // 1. Compute Blurhash
    const pixels = new Uint8ClampedArray(image.bitmap);
    const blurhash = encode(pixels, image.width, image.height, 4, 4);

    // 2. Compute SHA256
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha256 = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    // 3. Get metadata
    const { width, height } = image;
    const mime_type = blob.type;
    const size_bytes = blob.size;

    // 4. Get user_id from the listing
    const { data: listingData, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('user_id')
      .eq('id', listingId)
      .single();
    
    if (listingError || !listingData) throw new Error('Could not find listing to associate image with.');

    // 5. Upsert metadata into the images table
    const { data: imageData, error: upsertError } = await supabaseAdmin
      .from('images')
      .insert({
        listing_id: listingId,
        user_id: listingData.user_id,
        path,
        sha256,
        blurhash,
        width,
        height,
        mime_type,
        size_bytes,
      })
      .select()
      .single();

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify(imageData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});