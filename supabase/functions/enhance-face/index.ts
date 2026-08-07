import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { imageData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const MAX_RETRIES = 20;
    let lastError = "unknown";
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-pro-image-preview",
            messages: [{ role: "user", content: [
              { type: "text", text: "Enhance this face photo to be ultra HD and photorealistic. Improve clarity, skin detail, lighting, and sharpness while keeping the person's exact facial features, skin tone, eye color, and identity perfectly intact. Make it look like a professional high-resolution portrait photograph. Do not change the person's appearance, only enhance quality and realism." },
              { type: "image_url", image_url: { url: imageData } }
            ] }],
            modalities: ["image", "text"],
          }),
        });
        if (!response.ok) {
          if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          if (response.status === 402) return new Response(JSON.stringify({ error: "Usage credits exhausted. Please add credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          lastError = `${response.status} ${await response.text()}`;
          console.error(`enhance-face attempt ${attempt}/${MAX_RETRIES}:`, lastError);
          await new Promise((r) => setTimeout(r, Math.min(1000 * attempt, 5000)));
          continue;
        }
        const data = await response.json();
        const enhancedUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (!enhancedUrl) {
          lastError = "No image returned";
          console.error(`enhance-face attempt ${attempt}/${MAX_RETRIES}: no image`);
          await new Promise((r) => setTimeout(r, Math.min(1000 * attempt, 5000)));
          continue;
        }
        return new Response(JSON.stringify({ imageUrl: enhancedUrl, attempts: attempt }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (err) {
        lastError = err instanceof Error ? err.message : "fetch failed";
        console.error(`enhance-face attempt ${attempt}/${MAX_RETRIES} threw:`, lastError);
        await new Promise((r) => setTimeout(r, Math.min(1000 * attempt, 5000)));
      }
    }
    return new Response(JSON.stringify({ error: `Failed after ${MAX_RETRIES} attempts. Last error: ${lastError}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("enhance-face error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
