import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, healthContext, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build context-aware system prompt
    let systemPrompt = `You are Dr. Yvonne, a compassionate and knowledgeable Type 2 Diabetes health assistant for DiabeSure app users at JKUAT Hospital, Kenya.

You provide guidance on:
- Blood glucose management and monitoring
- Meal planning with Kenyan foods and nutrition advice
- Exercise recommendations suitable for diabetes management
- Medication adherence tips and general information
- Lifestyle modifications for diabetes management
- Navigating the DiabeSure app features

Important rules:
- Always be supportive, warm, and encouraging
- Provide evidence-based, DSMES-aligned advice
- Keep responses clear, concise, and actionable
- Always remind users to consult their healthcare provider for medical decisions
- You are NON-DIAGNOSTIC - never diagnose conditions or prescribe medications
- When discussing food, prefer Kenyan dietary context (ugali, sukuma wiki, chapati, nyama choma, githeri, etc.)
- Use markdown formatting for better readability (headers, bold, lists, etc.)`;

    // Add health context if available
    if (healthContext) {
      systemPrompt += `\n\n--- PATIENT HEALTH CONTEXT (use this to personalize your advice) ---`;
      if (healthContext.recentGlucose) {
        systemPrompt += `\nRecent glucose readings: ${JSON.stringify(healthContext.recentGlucose)}`;
      }
      if (healthContext.avgGlucose !== undefined) {
        systemPrompt += `\nAverage glucose (30d): ${healthContext.avgGlucose} mg/dL`;
      }
      if (healthContext.timeInRange !== undefined) {
        systemPrompt += `\nTime in range (70-180): ${healthContext.timeInRange}%`;
      }
      if (healthContext.estimatedA1C) {
        systemPrompt += `\nEstimated A1C: ${healthContext.estimatedA1C}%`;
      }
      if (healthContext.medicationAdherence !== undefined) {
        systemPrompt += `\nMedication adherence this week: ${healthContext.medicationAdherence}%`;
      }
      if (healthContext.activeMedications) {
        systemPrompt += `\nActive medications: ${healthContext.activeMedications.join(', ')}`;
      }
      if (healthContext.exerciseMinutes !== undefined) {
        systemPrompt += `\nExercise this week: ${healthContext.exerciseMinutes} minutes`;
      }
      if (healthContext.mealsToday !== undefined) {
        systemPrompt += `\nMeals logged today: ${healthContext.mealsToday}`;
      }
      if (healthContext.patterns) {
        systemPrompt += `\nDetected patterns: ${healthContext.patterns.join('; ')}`;
      }
      systemPrompt += `\n--- END CONTEXT ---\n\nUse this data to give personalized, specific advice. Reference their actual numbers when relevant. For example, if their glucose is high, acknowledge it and give specific tips.`;
    }

    // Mode-specific prompt additions
    if (mode === "predictive") {
      systemPrompt += `\n\nYou are now in PREDICTIVE ALERT mode. Based on the patient's recent glucose patterns, meal timing, exercise habits, and medication adherence, predict potential glucose events in the next 12-24 hours. Be specific about:
1. When a spike or dip might occur
2. What is likely causing it (meal timing, missed meds, inactivity)
3. What they can do RIGHT NOW to prevent it
Format as actionable alerts with severity levels.`;
    }

    if (mode === "clinician-copilot") {
      systemPrompt = `You are an AI clinical assistant for healthcare providers managing Type 2 Diabetes patients at JKUAT Hospital, Kenya. You help clinicians by:

1. Summarizing patient health trends clearly and concisely
2. Identifying concerning patterns that need attention
3. Suggesting evidence-based follow-up actions
4. Highlighting medication adherence issues
5. Recommending when to adjust treatment plans

Use clinical terminology appropriate for healthcare providers. Be objective and data-driven. Always note that final medical decisions rest with the clinician.

Use markdown formatting with headers, bullet points, and bold text for readability.`;

      if (healthContext) {
        systemPrompt += `\n\n--- PATIENT DATA ---`;
        systemPrompt += `\n${JSON.stringify(healthContext, null, 2)}`;
        systemPrompt += `\n--- END DATA ---`;
      }
    }

    if (mode === "meal-analysis") {
      systemPrompt += `\n\nYou are now analyzing a meal for a diabetes patient. Based on the meal description provided:
1. Estimate the approximate carbohydrate content (in grams)
2. Rate the glycemic impact (Low / Medium / High)
3. Estimate likely glucose rise (in mg/dL)
4. Suggest modifications to make it more diabetes-friendly
5. Suggest a good portion size

Focus on Kenyan foods and local dietary context. Be specific with estimates. Format your response clearly with sections.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please contact support." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Ask Yvonne error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
