import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, model, referenceImages } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const content: any[] = [{ type: "text", text: prompt }];

    if (referenceImages && Array.isArray(referenceImages)) {
      for (const img of referenceImages) {
        if (img) content.push({ type: "image_url", image_url: { url: img } });
      }
    }

    const MAX_RETRIES = 20;
    let lastError: { status: number; message: string } | null = null;
    let imageUrl: string | undefined;
    let textContent = "";

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: model || "google/gemini-3-pro-image-preview",
            messages: [{ role: "user", content }],
            modalities: ["image", "text"],
          }),
        });

        if (!response.ok) {
          // Don't retry on rate limit / payment issues - return immediately
          if (response.status === 429) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          if (response.status === 402) {
            return new Response(JSON.stringify({ error: "Usage credits exhausted. Please add credits in Settings > Workspace > Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          const text = await response.text();
          console.error(`AI gateway error (attempt ${attempt}/${MAX_RETRIES}):`, response.status, text);
          lastError = { status: response.status, message: text };
          await new Promise((r) => setTimeout(r, Math.min(1000 * attempt, 5000)));
          continue;
        }

        const data = await response.json();
        imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        textContent = data.choices?.[0]?.message?.content || "";

        if (!imageUrl) {
          console.error(`No image returned (attempt ${attempt}/${MAX_RETRIES})`);
          lastError = { status: 502, message: "No image returned from model" };
          await new Promise((r) => setTimeout(r, Math.min(1000 * attempt, 5000)));
          continue;
        }

        // Success
        return new Response(JSON.stringify({ imageUrl, textContent, attempts: attempt }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (err) {
        console.error(`Fetch error (attempt ${attempt}/${MAX_RETRIES}):`, err);
        lastError = { status: 500, message: err instanceof Error ? err.message : "Unknown fetch error" };
        await new Promise((r) => setTimeout(r, Math.min(1000 * attempt, 5000)));
      }
    }

    return new Response(JSON.stringify({ error: `Image generation failed after ${MAX_RETRIES} attempts. Last error: ${lastError?.message ?? "unknown"}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
