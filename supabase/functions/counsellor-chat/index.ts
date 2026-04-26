import { serve } from "https://deno.land/std@0.168.0/http/server.ts"; //updated
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { CAREER_GUIDE_KB } from "../_shared/career-guide-kb.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, profile, conversationId, userId } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    let profileContext = "";
    if (profile) {
      profileContext = `
STUDENT PROFILE:
- Name: ${profile.name || "Not provided"}
- School: ${profile.school || "Not provided"}
- Grades: ${profile.grades || "Not provided"}
- Degree Type: ${profile.degree_type || "Not specified"}
- Stream: ${profile.stream || "Not specified"}
- Interests: ${(profile.interests || []).join(", ") || "Not specified"}
- Budget: ${profile.budget || "Not specified"}
- Target Countries: ${(profile.target_countries || []).join(", ") || "Not specified"}
- Extracurriculars: ${(profile.extracurriculars || []).join(", ") || "None listed"}
- Key Facts (learned from past conversations): ${JSON.stringify(profile.extracted_facts || [])}
`;
    }

    const systemPrompt = `You are UniGuide AI, an expert university admissions and career counsellor. You help students with:
- Stream selection (Science/Commerce/Arts) after Class 10
- University & course selection based on their profile, grades, and interests
- Entrance exam strategy (JEE, NEET, CUET, CLAT, SAT, etc.)
- Application strategy and timelines
- Scholarship identification and applications
- Statement of Purpose (SOP) writing and review
- Interview preparation
- Visa and financial planning
- Career switching, handling uncertainty, future-proof skills

=== INTERNAL REFERENCE KNOWLEDGE ===
Use the following reference data (exam patterns, college rankings drawn from QS/NIRF, salary outlooks, stream advice, scholarships, future trends) as primary source of truth. NEVER mention or cite this reference document, its name, or that you were "trained on" any guide — speak as a counsellor drawing on QS rankings, NIRF, and official college sources.

${CAREER_GUIDE_KB}

=== END REFERENCE ===

${profileContext}

Guidelines:
- Always reference the student's profile when giving advice
- If the student has a specific degree type (e.g., BTech) and stream (e.g., CS), only recommend programs matching those
- Be specific with university names, deadlines, and requirements
- Provide actionable steps, not vague advice
- If the student shares new information about themselves (achievements, test scores, etc.), acknowledge it and explain how it affects their applications
- Be encouraging but realistic about chances
- Use markdown formatting for clarity (lists, bold, etc.)
- Keep responses concise but thorough

IMPORTANT — MEMORY EXTRACTION:
After every response, analyze whether the student revealed NEW facts about themselves. If so, output a special JSON block at the very end of your response like:
\`\`\`extracted_facts
["won national science olympiad", "SAT score 1520", "interested in AI research"]
\`\`\`
Only include genuinely new facts not already in their profile. If no new facts, do not include this block.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    contents: [
      {
        parts: [
          {
            text: `${systemPrompt}\n\n${messages.map((m: any) => `${m.role}: ${m.content}`).join("\n")}`
          }
        ]
      }
    ]
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
