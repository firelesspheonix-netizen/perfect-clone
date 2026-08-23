import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const normalizeModel = (m?: string) =>
  (m || "google/gemini-3-pro-image").replace(/-preview$/, "");

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { imageData, maskData, model } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const content: any[] = [
      {
        type: "text",
        text: maskData
          ? "Look at the second image — it is a black and white mask. The WHITE areas indicate the regions that need retouching on the first image. ONLY retouch those specific white-masked areas: remove blemishes, acne, spots, scars, dark circles, and skin imperfections in those regions. Keep ALL other areas completely untouched. Do NOT change facial features, face shape, eye color, hair, expression, pose, clothing, or background. Output a single photorealistic image."
          : "Retouch this photo. Remove all blemishes, acne, spots, scars, dark circles, uneven skin texture, and any visible skin imperfections. Smooth and even out the skin tone while keeping it looking completely natural and photorealistic. Do NOT change the person's facial features, face shape, eye color, hair, expression, pose, clothing, or background. Only clean up and retouch the skin. Output a single photorealistic image."
      },
      { type: "image_url", image_url: { url: imageData } }
    ];

    if (maskData) content.push({ type: "image_url", image_url: { url: maskData } });

    const MAX_RETRIES = 2;
    let lastError = "unknown";
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: normalizeModel(model), messages: [{ role: "user", content }], modalities: ["image", "text"] }),
        });
        if (!response.ok) {
          if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          if (response.status === 402) return new Response(JSON.stringify({ error: "Usage credits exhausted. Please add credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          const text = await response.text();
          console.error(`retouch-image attempt ${attempt}/${MAX_RETRIES}:`, response.status, text);
          if (response.status < 500) return new Response(JSON.stringify({ error: `Request rejected (${response.status}): ${text}` }), { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          lastError = `${response.status} ${text}`;
          if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 1000 * attempt));
          continue;
        }
        const data = await response.json();
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (!imageUrl) {
          console.error("retouch-image: no image returned");
          return new Response(JSON.stringify({ error: "The model returned no image (request was still billed). Try again." }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ imageUrl, attempts: attempt }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (err) {
        lastError = err instanceof Error ? err.message : "fetch failed";
        console.error(`retouch-image attempt ${attempt}/${MAX_RETRIES} threw:`, lastError);
        if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
    return new Response(JSON.stringify({ error: `Failed after ${MAX_RETRIES} attempts. Last error: ${lastError}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("retouch-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
