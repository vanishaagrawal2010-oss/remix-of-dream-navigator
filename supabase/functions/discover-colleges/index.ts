// Finds real colleges for one (country + degree + stream), checks their
// website links, and saves them to the `colleges` table for everyone.
import { askGemini, corsHeaders, db, json, parseJson, requireUser } from "../_shared/gemini.ts";

const DIFFICULTY = ["Easy", "Moderate", "Hard", "Very Hard"];
const HOSTEL = ["Excellent", "Good", "Average", "Limited"];
const CAMPUS = ["Sprawling", "Modern", "Compact", "Urban"];
const RERUN_AFTER_DAYS = 30;

// A link is kept only if the page actually opens. Many college sites block
// bots with 403, so we treat that as "probably fine".
async function linkWorks(url: string): Promise<boolean> {
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 7000);
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DreamNavigatorLinkCheck/1.0)" },
    });
    clearTimeout(t);
    await res.body?.cancel();
    return res.status < 400 || res.status === 403 || res.status === 429 || res.status === 999;
  } catch {
    return false;
  }
}

const slugOf = (name: string, country: string, degree: string, stream: string) =>
  [name, country, degree, stream].map((s) => s.toLowerCase().replace(/\s+/g, " ").trim()).join("|");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!(await requireUser(req))) return json({ error: "Please sign in." }, 401);

    const { country, degree, stream, budget, existing } = await req.json();
    if (!country || !degree || !stream) return json({ error: "country, degree and stream are required" }, 400);

    // Don't repeat the same search more than once a month
    const runKey = [country, degree, stream].map((s: string) => s.toLowerCase().trim()).join("|");
    const prior = await db.select(`discovery_runs?run_key=eq.${encodeURIComponent(runKey)}&select=ran_at`);
    if (prior.length > 0) {
      const ageDays = (Date.now() - new Date(prior[0].ran_at).getTime()) / 86400000;
      if (ageDays < RERUN_AFTER_DAYS) return json({ added: 0, skipped: true });
    }

    const known = Array.isArray(existing) ? existing.slice(0, 60).join("; ") : "";

    const prompt = `You are building a college database for Indian students. Use Google Search to find REAL, currently operating institutions.

TASK: List up to 25 colleges/universities in ${country} that offer ${degree} in ${stream}.

MIX (very important, do not only list famous names):
- about 5 top-ranked / highly selective options
- about 8 solid mid-tier options
- about 6 affordable or easy-to-enter options
- about 6 lesser-known, niche or unconventional institutions that are genuinely good for this field (specialised institutes, newer universities, state universities, polytechnic-linked colleges, etc.)
${budget ? `The student's budget is about ${budget} per year, so include several options within it.` : ""}
${known ? `Do NOT repeat these, we already have them: ${known}` : ""}

RULES:
- Only include institutions you are confident exist. Never invent a college.
- "website" must be the official homepage of the institution (https://...). If unsure, use null.
- "tuition_text" is the approximate yearly tuition in local currency with a currency symbol, like "₹1,50,000/yr", "$30,000/yr", "£18,000/yr", "€1,500/yr". If unknown use null.
- "difficulty" must be one of: ${DIFFICULTY.join(", ")}.
- "hostel" must be one of: ${HOSTEL.join(", ")}. Use "Limited" if there is little or no hostel.
- "campus" must be one of: ${CAMPUS.join(", ")}.
- "ranking" is a rough global or national rank number, or null if unknown.
- "deadline": typical application window as text (e.g. "Applications open Jan-Mar"), or null.
- "entrance_exams": exams used for admission (e.g. "JEE Main, state CET"), or null.
- "college_type": one of Government, Private, Deemed, Autonomous, Public university, Private university, Specialised institute.

Reply with ONLY a JSON array, no other text. Each item:
{"name":"","city":"","state":"","college_type":"","tuition_text":"","acceptance_rate":"","difficulty":"","ranking":0,"hostel":"","campus":"","deadline":"","website":"","entrance_exams":""}`;

    const { text } = await askGemini(prompt);
    const parsed = parseJson(text);
    const list: any[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.colleges) ? parsed.colleges : [];
    if (list.length === 0) return json({ added: 0, error: "No colleges found this time." });

    // Clean each item and check the links in parallel
    const cleaned = await Promise.all(
      list
        .filter((c) => c && typeof c.name === "string" && c.name.trim().length > 2)
        .slice(0, 30)
        .map(async (c) => {
          const website = typeof c.website === "string" && (await linkWorks(c.website)) ? c.website : null;
          const name = c.name.trim();
          return {
            slug: slugOf(name, country, degree, stream),
            name,
            country,
            city: c.city || null,
            state: c.state || null,
            program: stream,
            degree,
            stream,
            tuition_text: typeof c.tuition_text === "string" && /\d/.test(c.tuition_text) ? c.tuition_text : null,
            acceptance_rate: c.acceptance_rate ? String(c.acceptance_rate) : null,
            difficulty: DIFFICULTY.includes(c.difficulty) ? c.difficulty : "Moderate",
            ranking: Number.isFinite(Number(c.ranking)) && Number(c.ranking) > 0 ? Math.round(Number(c.ranking)) : null,
            hostel: HOSTEL.includes(c.hostel) ? c.hostel : null,
            campus: CAMPUS.includes(c.campus) ? c.campus : null,
            deadline: c.deadline ? String(c.deadline) : null,
            website,
            entrance_exams: c.entrance_exams ? String(c.entrance_exams) : null,
            college_type: c.college_type ? String(c.college_type) : null,
            source: "ai",
            verified: false,
            last_checked: new Date().toISOString(),
          };
        }),
    );

    await db.upsert("colleges", cleaned, "slug");
    await db.upsert("discovery_runs", [{ run_key: runKey, ran_at: new Date().toISOString(), added: cleaned.length }], "run_key");

    return json({ added: cleaned.length, linksOk: cleaned.filter((c) => c.website).length });
  } catch (e) {
    console.error("discover-colleges error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});