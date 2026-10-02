// "What students say" - a summary of public student discussions about one
// college, with source links. Saved for 90 days so it is fast and cheap.
import { askGemini, corsHeaders, db, json, parseJson, requireUser } from "../_shared/gemini.ts";

const FRESH_DAYS = 90;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!(await requireUser(req))) return json({ error: "Please sign in." }, 401);

    const { name, country, degree, stream } = await req.json();
    if (!name || !country) return json({ error: "name and country are required" }, 400);

    const nameKey = `${name}|${country}`.toLowerCase().replace(/\s+/g, " ").trim();

    // 1) Use the saved summary if it is recent
    const saved = await db.select(`college_insights?name_key=eq.${encodeURIComponent(nameKey)}&select=*`);
    if (saved.length > 0) {
      const ageDays = (Date.now() - new Date(saved[0].updated_at).getTime()) / 86400000;
      if (ageDays < FRESH_DAYS) {
        return json({ summary: saved[0].summary, sources: saved[0].sources, updated_at: saved[0].updated_at, cached: true });
      }
    }

    // 2) Otherwise ask Gemini to read what students say publicly
    const prompt = `Use Google Search to find what real students, alumni and applicants say about "${name}" (${country})${stream ? `, especially for ${degree || ""} ${stream}` : ""}.
Look at public student discussions and review pages: Reddit, Quora, Shiksha, CollegeDunia, Careers360, student blogs and forums.

Write an honest, balanced summary in YOUR OWN WORDS. Do not copy sentences from any source and do not use quotation marks. If there is little information on a topic, say so instead of guessing. Never invent facts.

Reply with ONLY this JSON:
{
 "overview": "2-3 sentences: the overall student sentiment",
 "hostel": "hostel quality, rooms, rules, who gets one",
 "food": "mess and food quality",
 "campus_life": "clubs, fests, social life, culture, city around the campus",
 "academics": "teaching quality, workload, flexibility",
 "placements": "placements, internships, typical outcomes, how it differs by branch",
 "safety_and_support": "safety, ragging or harassment reports, mental-health or admin support",
 "value_for_money": "are fees worth it",
 "pros": ["3-5 short points"],
 "cons": ["3-5 short points"],
 "best_for": "what kind of student will thrive here",
 "think_twice_if": "what kind of student may be unhappy here",
 "confidence": "high | medium | low  (how much public information you found)"
}`;

    const { text, sources } = await askGemini(prompt);
    const summary = parseJson(text);
    if (!summary || typeof summary !== "object" || !summary.overview) {
      return json({ error: "Could not build a summary for this college right now." }, 502);
    }

    // keep up to 6 distinct sources
    const seen = new Set<string>();
    const cleanSources = sources
      .filter((s: any) => (seen.has(s.url) ? false : (seen.add(s.url), true)))
      .slice(0, 6);

    const now = new Date().toISOString();
    await db.upsert(
      "college_insights",
      [{ name_key: nameKey, college_name: name, country, summary, sources: cleanSources, updated_at: now }],
      "name_key",
    );

    return json({ summary, sources: cleanSources, updated_at: now, cached: false });
  } catch (e) {
    console.error("college-insights error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});