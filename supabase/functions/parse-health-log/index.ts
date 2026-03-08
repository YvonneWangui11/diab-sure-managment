import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a health logging parser for a diabetes management app used in Kenya. Parse the user's natural language input and extract structured health log entries.

Return ONLY valid JSON with this structure:
{
  "entries": [
    {
      "type": "exercise" | "meal",
      "data": {
        // For exercise:
        "exercise_type": string,
        "duration_minutes": number,
        "intensity": "light" | "moderate" | "vigorous",
        
        // For meal:
        "description": string,
        "meal_type": "breakfast" | "lunch" | "dinner" | "snack",
        "portion_size": "small" | "medium" | "large"
      }
    }
  ],
  "summary": "Brief confirmation of what was parsed"
}

Rules:
- Recognize Kenyan foods: ugali, sukuma wiki, chapati, nyama choma, githeri, matoke, mandazi, pilau, mukimo, irio, kachumbari, etc.
- Infer meal_type from time context or default to "snack" if unclear
- For exercise, infer intensity if not specified (walking=light, jogging=moderate, running=vigorous)
- If the input is ambiguous, make reasonable assumptions
- Always return valid JSON, nothing else`
          },
          { role: "user", content: text }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("NL parse error:", response.status, errorText);
      throw new Error("AI service error");
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";
    
    // Extract JSON from the response (handle markdown code blocks)
    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1]?.trim() || content.trim());
    } catch {
      parsed = { entries: [], summary: "Could not parse your input. Please try again with more detail." };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("NL log error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
