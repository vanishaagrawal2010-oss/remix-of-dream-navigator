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

    // ── Build rich profile block ─────────────────────────────────────────────
    let profileBlock = "";
    if (profile) {
      const tierLabel: Record<string, string> = {
        top:     "Top — 90%+ or GPA 3.8+ (highly competitive, eligible for the best colleges)",
        high:    "High — 75–89% or GPA 3.3–3.7 (good, eligible for hard colleges)",
        average: "Average — 60–74% or GPA 2.5–3.2 (moderate, eligible for moderate colleges)",
        low:     "Low — below 60% or GPA under 2.5 (realistic target: accessible/easy colleges only)",
      };
      const tierDescription = tierLabel[profile.grade_tier] || "Unknown";

      const hostelLine = profile.hostel_priority === "critical"
        ? "Hostel: CRITICAL — student MUST have on-campus hostel (colleges without good hostel are dealbreakers)"
        : profile.hostel_priority === "important"
          ? "Hostel: Important — good hostel preferred but not a dealbreaker"
          : "Hostel: Not needed — student will live off-campus or locally";

      const feesLine = profile.fees_priority === "critical"
        ? "Budget: CRITICAL — only affordable colleges are acceptable, high-fee colleges are dealbreakers"
        : profile.fees_priority === "important"
          ? "Budget: Important — fees are a factor, prefers lower-cost options"
          : "Budget: Not a constraint — full funding available";

      const cityLine = profile.city_type === "metro"
        ? "City preference: Big metro (Mumbai, Delhi, Bangalore, London, NYC etc.)"
        : profile.city_type === "tier2"
          ? "City preference: Mid-size city"
          : profile.city_type === "small"
            ? "City preference: Small town / focused academic environment"
            : "City preference: No preference";

      const campusLine = profile.campus_type
        ? `Campus style preference: ${profile.campus_type}`
        : "Campus style: No preference";

      const careerLine = profile.career_goal === "research"
        ? "Career goal: Research / academia / PhD — high-ranking research universities matter most"
        : profile.career_goal === "industry"
          ? "Career goal: High-paying industry job (FAANG, Big-4, MNCs) — placements and brand name matter"
          : profile.career_goal === "startup"
            ? "Career goal: Build own startup — entrepreneurship culture and alumni network matter"
            : profile.career_goal === "stable"
              ? "Career goal: Stable government / public sector role"
              : profile.career_goal === "social_impact"
                ? "Career goal: Social impact / NGO / public service"
                : "Career goal: Not specified";

      const intensityLine = profile.study_intensity === "intense"
        ? "Study intensity: Wants a highly intense, competitive environment"
        : profile.study_intensity === "balanced"
          ? "Study intensity: Wants a balanced mix of academics and extracurriculars"
          : profile.study_intensity === "relaxed"
            ? "Study intensity: Prefers a relaxed, low-pressure college life"
            : "Study intensity: Not specified";

      const workStyleLine = profile.work_style
        ? `Learning/work style: ${profile.work_style}`
        : "";

      profileBlock = `
════════════════════════════════════════════
STUDENT PROFILE — USE THIS TO PERSONALISE THE VERDICT
════════════════════════════════════════════
Student name: ${profile.name || "Not provided"}
Grades: ${profile.grades || "Not provided"}
Academic tier: ${tierDescription}
Budget: ${profile.budget || "Not specified"}
Target countries: ${(profile.target_countries || []).join(", ") || "No preference"}
Interests: ${(profile.interests || []).join(", ") || "Not specified"}
Extracurriculars: ${(profile.extracurriculars || []).join(", ") || "Not specified"}

APTITUDE & LIFESTYLE PREFERENCES (from their quiz):
${hostelLine}
${feesLine}
${cityLine}
${campusLine}
${careerLine}
${intensityLine}
${workStyleLine}
════════════════════════════════════════════

CRITICAL VERDICT RULES:
1. If grade_tier is "low" or "average" AND a college requires extremely competitive entrance, you MUST flag that the student is unlikely to get admission there.
2. If hostel is CRITICAL and one college has poor/no hostel, that college CANNOT be recommended regardless of ranking.
3. If fees are CRITICAL and one college is significantly more expensive, heavily penalise it in the verdict.
4. The verdict must reference the student's grades, hostel need, career goal, and budget — not just generic rankings.
5. NEVER recommend a college purely because of ranking if the student cannot realistically get admission given their grades.
6. Base all salary, placement and career data on the ${stream} stream specifically, not overall college stats.
`;
    } else {
      profileBlock = `
No student profile provided. Give a balanced objective comparison.
Base all salary, placement and career data on the ${stream} stream specifically.
`;
    }

    const prompt = `You are an expert college admissions counsellor with deep knowledge of global universities.

IMPORTANT: You have access to Google Search. USE IT to look up the most current, accurate information about these two colleges and the specific courses/programmes they offer RIGHT NOW in 2025-2026. Many colleges have launched new programmes recently — do not rely only on your training data. Search for:
- "${collegeA} ${stream} programme 2025 admission"  
- "${collegeB} ${stream} programme 2025 admission"
- Current fees, intake, eligibility, and placement data for both

Compare ${collegeA} vs ${collegeB} for the ${stream} stream/course.

${profileBlock}

IMPORTANT ABOUT NEW/UNCOMMON COURSES:
- If a college has recently launched a new programme for ${stream} (even in 2024 or 2025), include it — do NOT say the college doesn't offer it without searching first.
- If after searching you genuinely cannot find a programme, say so clearly in admission_criteria (e.g. "No ${stream} programme found as of 2025 — verify directly with the college").
- Never fabricate placement or salary data. If data is unavailable for a new programme, say "Programme too new — placement data not yet available".

Return ONLY valid JSON matching this exact schema (no markdown fences, no extra text):

{
  "collegeA": {
    "name": "Full official college name",
    "location": "City, State/Country",
    "nirf_rank": "NIRF 2024 rank or QS 2025 rank or N/A",
    "years_of_study": "e.g. 4 years (B.Tech) or 3 years (BSc)",
    "admission_difficulty": "Easy / Moderate / Hard / Extremely Hard",
    "acceptance_rate": "e.g. ~2% or Approximately 5-8% or Not publicly disclosed",
    "admission_criteria": "Specific entrance exam and realistic score/rank needed for ${stream} — include if this is a newly launched programme",
    "flexibility": "One sentence on flexibility, minors and elective options",
    "average_salary": "Median starting salary specifically for ${stream} graduates, or 'Programme too new — data not yet available'",
    "highest_package": "Highest known package for ${stream} or 'Not yet available'",
    "salary_source": "e.g. Official Placement Report 2023-24 or Approximate industry estimate or Programme too new",
    "career_growth": "Top 3 industries/roles and 5-year trajectory for ${stream} graduates",
    "higher_studies": "e.g. ~30% pursue Masters/MBA immediately or Not yet available for new programme",
    "top_recruiters": ["Company 1", "Company 2", "Company 3", "Company 4"],
    "placement_percentage": "e.g. 95% or Not yet available for new programme",
    "data_verified": true
  },
  "collegeB": {
    "name": "Full official college name",
    "location": "City, State/Country",
    "nirf_rank": "NIRF 2024 rank or QS 2025 rank or N/A",
    "years_of_study": "e.g. 4 years (B.Tech) or 3 years (BSc)",
    "admission_difficulty": "Easy / Moderate / Hard / Extremely Hard",
    "acceptance_rate": "e.g. ~2% or Approximately 5-8% or Not publicly disclosed",
    "admission_criteria": "Specific entrance exam and realistic score/rank needed for ${stream}",
    "flexibility": "One sentence on flexibility, minors and elective options",
    "average_salary": "Median starting salary specifically for ${stream} graduates",
    "highest_package": "Highest known package for ${stream} or Not publicly disclosed",
    "salary_source": "e.g. Official Placement Report 2023-24 or Approximate industry estimate",
    "career_growth": "Top 3 industries/roles and 5-year trajectory for ${stream} graduates",
    "higher_studies": "e.g. ~25% pursue Masters/MBA immediately",
    "top_recruiters": ["Company 1", "Company 2", "Company 3", "Company 4"],
    "placement_percentage": "e.g. 92% or Approximately 85%+",
    "data_verified": true
  },
  "verdict": {
    "recommended_college": "Exact college name (or 'Both have merit — see reasoning' if truly equal for this student)",
    "reasoning": "2-3 sentences that MUST mention: the student's grade tier and whether they can realistically get in, their hostel/budget/career goal if provided, and which college fits their specific life situation better. Do NOT just say one college has a better ranking."
  }
}`;

    // ── Try models with Google Search grounding enabled ──────────────────────
    // Grounding connects Gemini to live Google Search so it can look up
    // newly launched courses, updated fees, and 2025 admission criteria.
    // Note: grounding only works on gemini-2.0-flash and above (not flash-lite).
    const modelsWithGrounding = [
      { model: "gemini-2.5-flash", grounding: true },
      { model: "gemini-2.0-flash", grounding: true },
      { model: "gemini-2.5-flash", grounding: false }, // fallback without grounding
      { model: "gemini-2.0-flash", grounding: false },
      { model: "gemini-2.5-flash-lite", grounding: false },
    ];

    let response: Response | null = null;

    for (const { model, grounding } of modelsWithGrounding) {
      const requestBody: any = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          // When grounding is on we can't use responseMimeType: "application/json"
          // because grounding adds citation metadata — we parse JSON manually below
          ...(grounding ? {} : { responseMimeType: "application/json" }),
        },
      };

      // Add Google Search grounding tool when enabled
      if (grounding) {
        requestBody.tools = [{ google_search: {} }];
      }

      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );

      if (response.ok) {
        console.log(`Success with model=${model} grounding=${grounding}`);
        break;
      }

      if (response.status === 429) {
        // Rate limited — stop trying, surface error
        break;
      }

      console.error(`Model ${model} (grounding=${grounding}) failed with ${response.status}, trying next...`);
    }

    if (!response || !response.ok) {
      const t = await response?.text();
      console.error("Gemini error:", response?.status, t);
      return new Response(
        JSON.stringify({ error: "AI is temporarily unavailable. Please try again in a moment!" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // Extract JSON — grounded responses may wrap JSON in markdown fences
    let comparison;
    try {
      // First try direct parse
      comparison = JSON.parse(content);
    } catch {
      // Strip markdown fences if present (grounding adds them sometimes)
      const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const rawJson = fenceMatch ? fenceMatch[1] : content;
      try {
        comparison = JSON.parse(rawJson);
      } catch {
        // Last resort: find the outermost { } block
        const braceMatch = rawJson.match(/\{[\s\S]*\}/);
        comparison = braceMatch ? JSON.parse(braceMatch[0]) : { error: "Failed to parse comparison data" };
      }
    }

    return new Response(JSON.stringify({ comparison }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("comparison error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});