import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { college, profile } = await req.json();
    if (!college) {
      return new Response(JSON.stringify({ error: "college is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const profileBlock = profile ? `
STUDENT CONTEXT:
- Name: ${profile.name || "N/A"}
- Degree Type: ${profile.degree_type || "N/A"}
- Stream: ${profile.stream || "N/A"}
- Grades: ${profile.grades || "N/A"}
- Country preference: ${(profile.target_countries || []).join(", ") || "N/A"}
` : "";

    const today = new Date().toISOString().split("T")[0];

    const systemPrompt = `You are an expert admissions strategist. Today is ${today}.
The student wants a ZERO-TO-ONE admission roadmap for: "${college}".

${profileBlock}

Use your knowledge of OFFICIAL sources (e.g., jeemain.nta.nic.in, jeeadv.ac.in, collegeboard.org, ucas.com, university official sites) to produce the most up-to-date guide possible. If exact dates for the upcoming cycle are not yet announced, clearly mark them as "Tentative (based on previous year)" and link to the official source so the student can verify.

Return ONLY valid JSON matching this exact schema (no markdown fences, no extra prose):

{
  "college": "Full college name",
  "overview": "2-3 sentence overview of the college and what it takes to get in",
  "difficulty": "Easy | Moderate | Hard | Very Hard",
  "primary_exam": {
    "name": "e.g., JEE Main + JEE Advanced",
    "purpose": "Why this exam matters for this college",
    "official_url": "https://...",
    "subjects": ["Physics", "Chemistry", "Mathematics"],
    "pattern": "Brief: number of questions, marking scheme, duration",
    "expected_cutoff": "Realistic cutoff (rank/score/percentile) for the student's target stream"
  },
  "alternative_exams": [
    { "name": "...", "purpose": "...", "official_url": "https://..." }
  ],
  "schedule": [
    {
      "event": "JEE Main Session 1 Registration",
      "date": "Jan 2025 (Tentative)",
      "status": "upcoming | ongoing | completed | tentative",
      "source_url": "https://jeemain.nta.nic.in"
    }
  ],
  "stages": [
    {
      "stage": "Stage 1: Foundation (12-18 months out)",
      "duration": "6 months",
      "tasks": ["Specific actionable task 1", "Specific actionable task 2"],
      "resources": [{ "name": "NCERT Physics", "url": "https://..." }]
    }
  ],
  "interview_rounds": [
    { "name": "JoSAA Counselling", "description": "What happens, what to prepare", "tips": ["Tip 1"] }
  ],
  "cutoff_history": [
    { "year": "2024", "category": "General", "value": "Closing rank ~63 for CSE" }
  ],
  "key_tips": ["Tip 1 tailored to the student's profile", "Tip 2"],
  "official_sources": [
    { "name": "JEE Main Official", "url": "https://jeemain.nta.nic.in" }
  ]
}

Be specific, realistic, and exhaustive. Tailor cutoffs and tips to the student's stream/degree if provided.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate the complete admission roadmap for: ${college}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let roadmap;
    try {
      roadmap = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      roadmap = match ? JSON.parse(match[0]) : { error: "Failed to parse roadmap" };
    }

    return new Response(JSON.stringify({ roadmap }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("roadmap error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
