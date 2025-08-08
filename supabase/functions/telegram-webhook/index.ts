import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const WEB_APP_URL = "https://nrimarketplace.vercel.app";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    if (body.message && body.message.text === '/start') {
      const chatId = body.message.chat.id;
      const responseText = "Welcome to NRI's Marketplace! Click the button below to start shopping and selling with the community.";

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: responseText,
          reply_markup: {
            inline_keyboard: [
              [{ text: "🚀 Open Marketplace", web_app: { url: WEB_APP_URL } }],
            ],
          },
        }),
      });
    }

    return new Response("ok", { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

serve(handler);