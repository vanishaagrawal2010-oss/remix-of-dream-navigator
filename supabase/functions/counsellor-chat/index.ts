import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { CAREER_GUIDE_KB } from "../_shared/career-guide-kb.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, profile } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    // Human-readable labels for the aptitude quiz's raw answer values, so the
    // model gets meaningful context instead of internal codes like "critical"
    // or "investigative" with no idea what question they belong to.
    const QUIZ_LABELS: Record<string, { question: string; options: Record<string, string> }> = {
      fees_priority: { question: "Tuition-fee sensitivity", options: {
        critical: "needs low-cost colleges only", important: "prefers affordable but flexible", neutral: "fully funded, cost is not a factor" } },
      city_type: { question: "Preferred city type", options: {
        metro: "big metro city", tier2: "mid-size city", small: "small town", any: "no preference" } },
      campus_type: { question: "Preferred campus style", options: {
        Sprawling: "large green campus", Modern: "modern tech-forward campus", Urban: "urban/city-integrated campus", Compact: "compact close-knit campus" } },
      hostel_priority: { question: "Hostel importance", options: {
        critical: "needs excellent hostel facilities", important: "wants decent hostel", neutral: "will live off-campus/locally" } },
      work_style: { question: "Natural work/learning style", options: {
        investigative: "analytical, enjoys solving complex problems", realistic: "hands-on, learns by building", artistic: "creative, expresses ideas visually/in writing",
        social: "social, thrives helping/teaching others", enterprising: "enterprising, enjoys leading/business", conventional: "structured, detail-oriented" } },
      career_goal: { question: "Primary career goal", options: {
        research: "research/academia/PhD path", industry: "high-paying industry job", startup: "wants to build own startup",
        stable: "wants stable government/public role", social_impact: "wants social impact/NGO/public service work" } },
      risk_appetite: { question: "Risk appetite", options: {
        high: "loves risk, open to switching fields", medium: "calculated risks, stays flexible", low: "prefers a clear predictable roadmap" } },
      study_intensity: { question: "Desired study intensity", options: {
        intense: "wants to be pushed to the limit academically", balanced: "wants academics + extracurriculars balance", relaxed: "wants a relaxed, low-stress college life" } },
    };

    function describeQuiz(quiz: Record<string, string> | undefined | null): string {
      if (!quiz || Object.keys(quiz).length === 0) return "Not taken yet — if relevant, suggest the student take the aptitude quiz.";
      return Object.entries(quiz)
        .map(([id, value]) => {
          const meta = QUIZ_LABELS[id];
          if (!meta) return `${id}: ${value}`;
          return `${meta.question}: ${meta.options[value] || value}`;
        })
        .join("; ");
    }

    let profileContext = "";
    if (profile) {
      profileContext = `
STUDENT PROFILE:
- Name: ${profile.name || "Not provided"}
- School: ${profile.school || "Not provided"}
- Grades: ${profile.grades || "Not provided"}
- Grade tier: ${profile.grade_tier || "Not determined"}
- Degree Type: ${profile.degree_type || "Not specified"}
- Stream: ${profile.stream || "Not specified"}
- Interests: ${(profile.interests || []).join(", ") || "Not specified"}
- Budget: ${profile.budget || "Not specified"}
- Target Countries: ${(profile.target_countries || []).join(", ") || "Not specified"}
- Extracurriculars: ${(profile.extracurriculars || []).join(", ") || "None listed"}
- Aptitude Quiz Results: ${describeQuiz(profile.quiz_preferences)}
- Key Facts: ${JSON.stringify(profile.extracted_facts || [])}
`;
    }

    // System instruction passed via systemInstruction field — Gemini treats this
    // as a true system prompt, completely separate from the user conversation.
    // This is why the model was ignoring instructions before: they were being
    // injected as a user message, so the model treated them as conversation context
    // rather than binding directives.
    const systemInstruction = `You are an expert university admissions and career counsellor.

STRICT RULES — these override everything else and must never be broken:
1. You have NO name. Never say "UniGuide", "UniGuide AI", "DreamNavigator AI", or any product name. If asked your name, say "I'm your counsellor."
2. On the very FIRST message of a conversation only: greet the student warmly using their name from the profile (e.g. "Hello Vanisha!" or "Hi Rahul!"). If no name is available, just say "Hello!". After the first reply, NEVER greet again — jump straight into substance.
3. Never introduce yourself or describe what you can do unless directly asked.
4. Never say "Great question!", "Certainly!", "Of course!", or similar filler phrases.
5. Be direct. Start every response (after the first) with the actual answer.

You help students with: stream selection, university and course selection, entrance exams (JEE, NEET, CUET, CLAT, SAT etc.), application strategy, scholarships, SOP writing, interview prep, visa planning, and career guidance.

=== REFERENCE KNOWLEDGE ===
${CAREER_GUIDE_KB}
=== END REFERENCE ===

${profileContext}

Additional guidelines:
- Reference the student's profile when relevant.
- Actively use the Aptitude Quiz Results (work style, career goal, risk appetite, study intensity) when discussing stream selection, course choice, or college fit — this is the student's actual personalization data, don't ignore it.
- Keep replies focused and reasonably concise (roughly under 400 words) unless the student explicitly asks for more detail — this avoids overly long responses.
- IMPORTANT — check for mismatches: compare the student's stated Degree Type/Stream in their profile against what their Aptitude Quiz Results actually suggest (work style, career goal, risk appetite, study intensity). If they meaningfully conflict — e.g. the student has chosen a technical/quantitative path (like B.Tech) but their quiz points to a humanities/social/creative fit, or vice versa — proactively and gently point this out, even if the student didn't ask about it directly. Explain specifically which quiz signals suggest the mismatch, and offer 1-2 concrete alternative or hybrid options (e.g. a related stream, or a course that blends both). Don't be alarmist — frame it as "worth considering" rather than telling them they chose wrong.
- Be specific — name universities, deadlines, requirements.
- Be encouraging but realistic.
- Use markdown for clarity (lists, bold).
- Keep responses concise but thorough.

MEMORY EXTRACTION: If the student reveals new facts about themselves, append this block at the very end:
\`\`\`extracted_facts
["fact one", "fact two"]
\`\`\`
Only include genuinely new facts not already in their profile. Omit the block entirely if there are no new facts.`;

    // Convert messages to Gemini's contents format
    // Gemini roles: "user" and "model" (not "assistant")
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // systemInstruction is the correct Gemini API field for system prompts
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Gemini error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});