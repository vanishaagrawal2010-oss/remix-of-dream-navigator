import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { collegeA, collegeB, stream, profile } = await req.json();

    if (!collegeA || !collegeB || !stream) {
      return new Response(JSON.stringify({ error: "collegeA, collegeB, and stream are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const profileBlock = profile ? `
STUDENT PROFILE (for verdict personalization):
- Name: ${profile.name || "N/A"}
- Stream Interest: ${profile.stream || "N/A"}
- Degree Type: ${profile.degree_type || "N/A"}
- Grades: ${profile.grades || "N/A"}
- Budget: ${profile.budget || "N/A"}
- Interests: ${(profile.interests || []).join(", ") || "N/A"}
` : "";

    const prompt = `You are an expert Indian higher education analyst with deep knowledge of IITs, NITs, BITS, and top private colleges.

Compare ${collegeA} vs ${collegeB} specifically for the ${stream} stream/course.

${profileBlock}

Return ONLY valid JSON matching this exact schema (no markdown fences, no extra text):

{
  "collegeA": {
    "name": "Full official college name",
    "location": "City, State",
    "nirf_rank": "NIRF 2024 rank",
    "years_of_study": "e.g. 4 years (B.Tech)",
    "admission_difficulty": "Easy / Moderate / Hard / Extremely Hard",
    "acceptance_rate": "e.g. ~2% or Approximately 5-8%",
    "admission_criteria": "e.g. JEE Advanced rank under 2000, or Board marks 85%+ with entrance test",
    "flexibility": "One sentence on flexibility and minor options",
    "average_salary": "Median starting salary for ${stream} e.g. ₹18-22 LPA",
    "highest_package": "Highest known package for ${stream} e.g. ₹1.2 Cr or Not publicly disclosed",
    "salary_source": "e.g. Official Placement Report 2023-24 or Approximate",
    "career_growth": "Top 3 industries and trajectory for ${stream}",
    "higher_studies": "e.g. ~30% pursue Masters immediately",
    "top_recruiters": ["Company 1", "Company 2", "Company 3", "Company 4"],
    "placement_percentage": "e.g. 95% or Approximately 90%+",
    "data_verified": true
  },
  "collegeB": {
    "name": "Full official college name",
    "location": "City, State",
    "nirf_rank": "NIRF 2024 rank",
    "years_of_study": "e.g. 4 years (B.Tech)",
    "admission_difficulty": "Easy / Moderate / Hard / Extremely Hard",
    "acceptance_rate": "e.g. ~2% or Approximately 5-8%",
    "admission_criteria": "e.g. JEE Main rank under 5000, or BITSAT score 300+",
    "flexibility": "One sentence on flexibility and minor options",
    "average_salary": "Median starting salary for ${stream} e.g. ₹16-20 LPA",
    "highest_package": "Highest known package for ${stream} e.g. ₹80 LPA or Not publicly disclosed",
    "salary_source": "e.g. Official Placement Report 2023-24 or Approximate",
    "career_growth": "Top 3 industries and trajectory for ${stream}",
    "higher_studies": "e.g. ~25% pursue Masters immediately",
    "top_recruiters": ["Company 1", "Company 2", "Company 3", "Company 4"],
    "placement_percentage": "e.g. 92% or Approximately 85%+",
    "data_verified": true
  },
  "verdict": {
    "recommended_college": "Exact college name",
    "reasoning": "One sentence based on student profile and data"
  }
}`;

    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-flash-lite"];
    let response: Response | null = null;

    for (const model of models) {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      });
      if (response.ok || response.status === 429) break;
      console.error(`Model ${model} failed with ${response.status}, trying next...`);
    }

    if (!response || !response.ok) {
      const t = await response?.text();
      console.error("Gemini error:", response?.status, t);
      return new Response(JSON.stringify({ error: "AI is temporarily unavailable. Please try again in a moment!" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let comparison;
    try {
      comparison = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      comparison = match ? JSON.parse(match[0]) : { error: "Failed to parse comparison data" };
    }

    return new Response(JSON.stringify({ comparison }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("comparison error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});