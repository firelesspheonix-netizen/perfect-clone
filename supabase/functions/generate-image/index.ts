import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const normalizeModel = (m?: string) =>
  (m || "google/gemini-3-pro-image").replace(/-preview$/, "");

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  if (!/^https?:\/\//.test(url)) return url;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) { console.warn("Reference fetch failed", res.status, url); return null; }
    const type = res.headers.get("content-type") || "image/jpeg";
    const bytes = new Uint8Array(await res.arrayBuffer());
    return `data:${type};base64,${toBase64(bytes)}`;
  } catch (e) {
    console.warn("Reference fetch error, skipping:", url, e);
    return null;
  }
}

async function storeImage(dataUrl: string): Promise<string | null> {
  try {
    const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) return null;
    const type = m[1];
    const bin = atob(m[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const ext = type.split("/")[1] || "png";
    const path = `generated/${crypto.randomUUID()}.${ext}`;
    const base = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!base || !key) return null;
    const up = await fetch(`${base}/storage/v1/object/studio-assets/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": type },
      body: bytes,
    });
    if (!up.ok) { console.error("Upload failed", up.status, await up.text()); return null; }
    return `${base}/storage/v1/object/public/studio-assets/${path}`;
  } catch (e) {
    console.error("storeImage error", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, model, referenceImages } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const content: any[] = [{ type: "text", text: prompt }];

    // Pre-fetch remote references in parallel with a timeout so one slow
    // image host can't stall or fail the whole generation.
    const refs: string[] = Array.isArray(referenceImages) ? referenceImages.filter(Boolean) : [];
    const resolved = await Promise.all(refs.map(fetchAsDataUrl));
    for (const url of resolved) {
      if (url) content.push({ type: "image_url", image_url: { url } });
    }

    // Only transient 5xx / network failures are retried. Every 4xx and every
    // completed-but-imageless call is already billed, so retrying burns credits.
    const MAX_RETRIES = 2;
    let lastError = "unknown";

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: normalizeModel(model),
            messages: [{ role: "user", content }],
            modalities: ["image", "text"],
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          if (response.status === 402) {
            return new Response(JSON.stringify({ error: "Usage credits exhausted. Please add credits in Settings > Workspace > Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          const text = await response.text();
          console.error(`AI gateway error (attempt ${attempt}/${MAX_RETRIES}):`, response.status, text);
          if (response.status < 500) {
            return new Response(JSON.stringify({ error: `Request rejected (${response.status}): ${text}` }), { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          lastError = `${response.status} ${text}`;
          if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 1000 * attempt));
          continue;
        }

        const data = await response.json();
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        const textContent = data.choices?.[0]?.message?.content || "";

        if (!imageUrl) {
          // Billed call that produced no image — do not retry.
          console.error("No image returned from model");
          return new Response(JSON.stringify({ error: "The model returned no image (request was still billed). Try adjusting your prompt." }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const storedUrl = await storeImage(imageUrl);
        return new Response(JSON.stringify({ imageUrl: storedUrl ?? imageUrl, textContent, attempts: attempt }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (err) {
        console.error(`Fetch error (attempt ${attempt}/${MAX_RETRIES}):`, err);
        lastError = err instanceof Error ? err.message : "Unknown fetch error";
        if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }

    return new Response(JSON.stringify({ error: `Image generation failed after ${MAX_RETRIES} attempts. Last error: ${lastError}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
