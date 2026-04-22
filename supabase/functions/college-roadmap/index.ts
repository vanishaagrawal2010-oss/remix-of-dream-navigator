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

    // Compute target attempt year from current_class
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const currentYear = today.getFullYear();
    // After June, the academic year has rolled over for class promotions in most countries
    const academicYearOffset = today.getMonth() >= 6 ? 0 : 0;
    const classToYearsLeft: Record<string, number> = {
      "class 9": 4, "class 10": 3, "class 11": 2, "class 12": 1,
      "gap year": 1, "1st year ug": 0, "2nd year ug": 0, "3rd year ug": 0,
      "final year ug": 0, "postgrad": 0,
    };
    const cls = (profile?.current_class || "").toLowerCase();
    const yearsLeft = classToYearsLeft[cls] ?? null;
    const targetAttemptYear = yearsLeft !== null ? currentYear + yearsLeft + academicYearOffset : null;

    const profileBlock = profile ? `
STUDENT CONTEXT:
- Name: ${profile.name || "N/A"}
- Current Class/Year: ${profile.current_class || "N/A"}
- Degree Type: ${profile.degree_type || "N/A"}
- Stream: ${profile.stream || "N/A"}
- Grades: ${profile.grades || "N/A"}
- Country preference: ${(profile.target_countries || []).join(", ") || "N/A"}
${targetAttemptYear ? `- TARGET ENTRANCE EXAM ATTEMPT YEAR: ${targetAttemptYear} (the student has ~${yearsLeft} year(s) of preparation time remaining)` : ""}
` : "";

    const systemPrompt = `You are an expert admissions strategist. Today is ${todayStr}.
The student wants a ZERO-TO-ONE admission roadmap for: "${college}".

${profileBlock}

Use your knowledge of OFFICIAL sources (e.g., jeemain.nta.nic.in, jeeadv.ac.in, collegeboard.org, ucas.com, university official sites) to produce the most up-to-date guide possible.

CRITICAL — TIMELINE PERSONALISATION:
- Build the entire roadmap around the student's TARGET ATTEMPT YEAR (${targetAttemptYear || "infer from their current class"}).
- All "schedule" entries must reference dates in the cycle leading up to that target year (e.g. for a Class 11 student today, JEE Main attempt = Jan ${currentYear + 2}, JEE Advanced = May ${currentYear + 2}, results = Jun ${currentYear + 2}).
- All "stages" must use realistic months/years anchored to today (${todayStr}) and ending at the target attempt year.
- If exact dates for the upcoming cycle are not yet announced, mark as "Tentative (based on previous year)" and link to the official source.

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

Be specific, realistic, and exhaustive. Tailor cutoffs and tips to the student's stream/degree if provided.

CRITICAL — LINK QUALITY (this is the #1 reason this app gets bad reviews):
- Every URL you emit must be a SPECIFIC, deep link to the EXACT resource you're naming. Never a generic homepage when a deep link exists.
- If you reference a resource (e.g. "Class 12 Physics NCERT"), the URL must point to THAT exact textbook page, not the NCERT homepage and absolutely not a different subject/class. If you can't be ${"\u200B"}sure of the exact URL, OMIT the resource — do not guess.
- Prefer canonical official sources: ncert.nic.in/textbook.php for NCERT (use the correct class+subject params), nta.ac.in / jeemain.nta.nic.in for JEE Main, jeeadv.ac.in for JEE Advanced, neet.nta.nic.in for NEET, collegeboard.org for SAT, ucas.com for UK, official .ac.in / .edu domains for individual colleges.
- For NCERT specifically: use https://ncert.nic.in/textbook.php?lephy1=0-8 style links only when you are certain. Otherwise link to the NCERT subject landing page for that class (https://ncert.nic.in/textbook.php) and label it accordingly. NEVER link Class 12 PCM to Class 6 Hindi.
- For each resource, double-check the URL pattern matches the named subject and class. If unsure, write "Official source: <name>" without a URL rather than a wrong URL.
- All URLs MUST be reachable (no 404s, no placeholder example.com, no internal redirects). Strip tracking params.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Faster + cheaper than 2.5-pro while still strong on structured JSON.
        // Cuts roadmap generation from ~30-50s to ~10-15s.
        model: "google/gemini-2.5-flash",
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
