// =====================================================================
// BULK COLLEGE FILL-UP  (run once from the Codespace terminal)
//
// Finds colleges for many countries x many courses and saves them into
// Supabase, so students never have to wait. Safe to stop and run again:
// anything already done is skipped.
//
//   export GEMINI_API_KEY="..."
//   export SUPABASE_URL="https://wyfccrbjvbmxfyhvspqq.supabase.co"
//   export SUPABASE_SERVICE_ROLE_KEY="..."
//   node scripts/seed-colleges.mjs                 (everything)
//   node scripts/seed-colleges.mjs India           (one country first)
//   node scripts/seed-colleges.mjs India USA UK    (a few countries)
//
// NEVER save the service role key in a file or commit it to GitHub.
// =====================================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!GEMINI_API_KEY || !SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing GEMINI_API_KEY, SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. See the top of this file.");
  process.exit(1);
}

const ALL_COUNTRIES = [
  "India", "USA", "UK", "Canada", "Australia", "New Zealand", "Ireland",
  "Germany", "Netherlands", "France", "Italy", "Spain", "Sweden", "Finland", "Denmark", "Norway",
  "Switzerland", "Austria", "Poland", "Singapore", "Malaysia", "UAE", "Japan", "South Korea",
  "Hong Kong", "China", "Russia", "Georgia", "Kazakhstan", "Uzbekistan", "Philippines",
];

// Courses worth filling for every country (degree, stream)
const COMMON = [
  ["BTech", "Computer Science"], ["BTech", "Mechanical"], ["BTech", "Electrical"], ["BTech", "Civil"],
  ["BTech", "Electronics & Communication"], ["BTech", "Data Science"], ["BTech", "AI/ML"],
  ["BBA", "General"], ["BBA", "Finance"], ["BCom", "General"], ["MBA", "General"],
  ["BSc", "Computer Science"], ["BSc", "Physics"], ["BSc", "Biology"], ["BSc", "Nursing"],
  ["BA", "Psychology"], ["BA", "Economics"], ["BA", "Journalism & Mass Comm"],
  ["BDes", "Design"], ["BArch", "Architecture"], ["MS", "Computer Science"], ["MS", "Data Science"],
];

// Extra courses to cover in India
const INDIA_EXTRA = [
  ["MBBS", "General"], ["BDS", "Dentistry"], ["BAMS", "Ayurveda"], ["BHMS", "Homeopathy"],
  ["BPT", "Physiotherapy"], ["BPharma", "Pharmacy"], ["BVSc", "Veterinary Science"],
  ["BTech", "Information Technology"], ["BTech", "Cyber Security"], ["BTech", "Chemical"],
  ["BTech", "Aerospace"], ["BTech", "Biotechnology"], ["BTech", "Agricultural Engineering"],
  ["BTech", "Automobile"], ["BTech", "Robotics"], ["BTech", "Food Technology"],
  ["BCA", "Computer Applications"], ["BMS", "Management Studies"], ["BHM", "Hospitality Management"],
  ["BBA", "Marketing"], ["BBA", "International Business"], ["BBA", "Aviation Management"],
  ["BCom", "Accounting & Finance"], ["BA", "Political Science"], ["BA", "English Literature"],
  ["BA", "History"], ["BA", "Sociology"], ["BA", "Liberal Arts"], ["BA", "Film Studies"],
  ["BA LLB", "Law"], ["BBA LLB", "Law"], ["BDes", "Fashion Design"], ["BDes", "UX/UI Design"],
  ["BFA", "Fine Arts"], ["BSc", "Animation & VFX"], ["BSc", "Game Design"], ["BSc", "Hotel Management"],
  ["BSc", "Mathematics"], ["BSc", "Chemistry"], ["BSc", "Statistics"], ["BSc", "Forensic Science"],
  ["BSc", "Environmental Science"], ["BSc", "Aviation"], ["BEd", "Education"], ["BSW", "Social Work"],
  ["BPEd", "Physical Education"], ["MTech", "Computer Science"], ["MCA", "Computer Applications"],
  ["MSc", "Physics"], ["MA", "Economics"],
];

// Countries popular for medicine abroad get MBBS too
const MBBS_ABROAD = ["Russia", "Georgia", "Kazakhstan", "Uzbekistan", "Philippines", "UK", "Ireland", "Germany", "Poland", "China", "Malaysia"];

const DIFFICULTY = ["Easy", "Moderate", "Hard", "Very Hard"];
const HOSTEL = ["Excellent", "Good", "Average", "Limited"];
const CAMPUS = ["Sprawling", "Modern", "Compact", "Urban"];

const dbHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const log = (...a) => console.log(`[${Math.round((Date.now() - t0) / 1000)}s]`, ...a);

async function dbGet(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: dbHeaders });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function dbUpsert(table, rows, conflict) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${conflict}`, {
    method: "POST",
    headers: { ...dbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(await r.text());
}

async function ask(prompt) {
  for (const [model, grounding] of [["gemini-2.5-flash", true], ["gemini-2.0-flash", true], ["gemini-2.5-flash", false]]) {
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 16000,
        ...(grounding ? {} : { responseMimeType: "application/json" }),
        // turn off slow "thinking" on 2.5 so answers come back faster
        ...(model.startsWith("gemini-2.5") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    };
    if (grounding) body.tools = [{ google_search: {} }];
    log(`   asking ${model}${grounding ? " (with Google Search)" : ""}...`);
    let res;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        signal: AbortSignal.timeout(150000), // give up after 2.5 minutes instead of waiting forever
      });
    } catch (e) {
      log(`   ${model} did not answer in time (${e.name}). Trying the next option...`);
      continue;
    }
    if (res.status === 429) { const e = new Error("RATE_LIMIT"); e.rate = true; throw e; }
    if (!res.ok) {
      const msg = (await res.text()).slice(0, 200).replace(/\s+/g, " ");
      log(`   ${model} said ${res.status}: ${msg}`);
      if (res.status === 400 || res.status === 403) {
        if (/API key|API_KEY|permission|PERMISSION/i.test(msg)) throw new Error("Your Gemini key was rejected. Check GEMINI_API_KEY.");
      }
      continue;
    }
    const data = await res.json();
    log(`   ${model} answered.`);
    return (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text || "").join("");
  }
  throw new Error("Gemini unavailable");
}

function parseJson(text) {
  try { return JSON.parse(text); } catch {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1] : text;
  try { return JSON.parse(raw); } catch {}
  const a = raw.search(/[\[{]/), b = Math.max(raw.lastIndexOf("]"), raw.lastIndexOf("}"));
  if (a >= 0 && b > a) { try { return JSON.parse(raw.slice(a, b + 1)); } catch {} }
  return null;
}

async function linkWorks(url) {
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(7000), headers: { "User-Agent": "Mozilla/5.0 (compatible; DreamNavigatorLinkCheck/1.0)" } });
    await res.body?.cancel();
    return res.status < 400 || [403, 429, 999].includes(res.status);
  } catch { return false; }
}

const slugOf = (...p) => p.map((s) => s.toLowerCase().replace(/\s+/g, " ").trim()).join("|");

function buildPrompt(country, degree, stream, known) {
  return `You are building a college database for students, many of them from India. Use Google Search to find REAL, currently operating institutions.

TASK: List 30 colleges/universities in ${country} that offer ${degree} in ${stream}.

The list must work for EVERY kind of student, so spread it like this:
- 6 highly selective / top-ranked options (difficulty "Very Hard" or "Hard")
- 8 mid-level options (difficulty "Moderate")
- 9 easy-to-enter options with low cut-offs or open admission, suitable for students with weak grades (difficulty "Easy")
- 7 lesser-known, niche or unconventional institutions that are genuinely good for this field (specialised institutes, newer or regional universities, state or private universities, colleges abroad that are popular with Indian students)
Also spread the fees: include government or very low-cost options, mid-priced options, and premium options.
${known.length ? `Do NOT repeat these, we already have them: ${known.slice(0, 60).join("; ")}` : ""}

RULES:
- Only include institutions you are confident exist. Never invent a college.
- "website" must be the official homepage (https://...). If unsure, use null.
- "tuition_text" is the approximate yearly tuition in local currency with a currency symbol, like "₹1,50,000/yr", "$30,000/yr", "£18,000/yr", "€1,500/yr". If unknown use null.
- "tuition_inr_per_year" is the same tuition converted to Indian rupees as a plain number (for example 150000), or null if unknown.
- "difficulty" must be one of: ${DIFFICULTY.join(", ")}.
- "hostel" must be one of: ${HOSTEL.join(", ")}. Use "Limited" if there is little or no hostel.
- "campus" must be one of: ${CAMPUS.join(", ")}.
- "ranking" is a rough global or national rank number, or null if unknown.
- "deadline": typical application window as text, or null.
- "entrance_exams": exams used for admission, or null.
- "college_type": one of Government, Private, Deemed, Autonomous, Public university, Private university, Specialised institute.

Reply with ONLY a JSON array, no other text. Each item:
{"name":"","city":"","state":"","college_type":"","tuition_text":"","tuition_inr_per_year":0,"acceptance_rate":"","difficulty":"","ranking":0,"hostel":"","campus":"","deadline":"","website":"","entrance_exams":""}`;
}

async function runOne(country, degree, stream) {
  const runKey = [country, degree, stream].map((s) => s.toLowerCase().trim()).join("|");
  const known = (await dbGet(`colleges?country=eq.${encodeURIComponent(country)}&degree=eq.${encodeURIComponent(degree)}&stream=eq.${encodeURIComponent(stream)}&select=name&limit=100`)).map((r) => r.name);

  log(`Starting: ${country} - ${degree} ${stream}`);
  const text = await ask(buildPrompt(country, degree, stream, known));
  const parsed = parseJson(text);
  const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.colleges) ? parsed.colleges : [];
  if (list.length === 0) throw new Error("no colleges returned");

  log(`   got ${list.length} colleges, checking their websites...`);
  const rows = await Promise.all(list.filter((c) => c && typeof c.name === "string" && c.name.trim().length > 2).slice(0, 40).map(async (c) => {
    const website = typeof c.website === "string" && (await linkWorks(c.website)) ? c.website : null;
    const name = c.name.trim();
    const inr = Number(c.tuition_inr_per_year);
    return {
      slug: slugOf(name, country, degree, stream), name, country,
      city: c.city || null, state: c.state || null, program: stream, degree, stream,
      tuition_text: typeof c.tuition_text === "string" && /\d/.test(c.tuition_text) ? c.tuition_text : null,
      tuition_inr: Number.isFinite(inr) && inr > 0 ? Math.round(inr) : null,
      acceptance_rate: c.acceptance_rate ? String(c.acceptance_rate) : null,
      difficulty: DIFFICULTY.includes(c.difficulty) ? c.difficulty : "Moderate",
      ranking: Number.isFinite(Number(c.ranking)) && Number(c.ranking) > 0 ? Math.round(Number(c.ranking)) : null,
      hostel: HOSTEL.includes(c.hostel) ? c.hostel : null,
      campus: CAMPUS.includes(c.campus) ? c.campus : null,
      deadline: c.deadline ? String(c.deadline) : null,
      website, entrance_exams: c.entrance_exams ? String(c.entrance_exams) : null,
      college_type: c.college_type ? String(c.college_type) : null,
      source: "ai", verified: false, last_checked: new Date().toISOString(),
    };
  }));

  await dbUpsert("colleges", rows, "slug");
  await dbUpsert("discovery_runs", [{ run_key: runKey, ran_at: new Date().toISOString(), added: rows.length }], "run_key");
  return rows.length;
}

// ---------------- main ----------------
const wanted = process.argv.slice(2);
const countries = wanted.length ? ALL_COUNTRIES.filter((c) => wanted.map((w) => w.toLowerCase()).includes(c.toLowerCase())) : ALL_COUNTRIES;
if (countries.length === 0) { console.error("No matching country. Choices:", ALL_COUNTRIES.join(", ")); process.exit(1); }

const jobs = [];
for (const country of countries) {
  const list = [...COMMON];
  if (country === "India") list.push(...INDIA_EXTRA);
  if (MBBS_ABROAD.includes(country)) list.push(["MBBS", "General"]);
  for (const [degree, stream] of list) jobs.push({ country, degree, stream });
}

const done = new Set((await dbGet("discovery_runs?select=run_key&limit=5000")).map((r) => r.run_key));
const todo = jobs.filter((j) => !done.has([j.country, j.degree, j.stream].map((s) => s.toLowerCase().trim()).join("|")));
log(`${jobs.length} searches planned, ${jobs.length - todo.length} already done, ${todo.length} to go.`);

let ok = 0, failed = 0, rateHits = 0;
for (let i = 0; i < todo.length; i++) {
  const { country, degree, stream } = todo[i];
  try {
    const n = await runOne(country, degree, stream);
    ok++; rateHits = 0;
    console.log(`[${i + 1}/${todo.length}] ${country} - ${degree} ${stream}: saved ${n}`);
  } catch (e) {
    if (e.rate) {
      rateHits++;
      console.log(`[${i + 1}/${todo.length}] Gemini says "too many requests". Waiting 60 seconds...`);
      if (rateHits >= 5) { console.log("Daily limit probably reached. Run the same command again later - it continues where it stopped."); break; }
      await sleep(60000); i--; continue;
    }
    failed++;
    console.log(`[${i + 1}/${todo.length}] ${country} - ${degree} ${stream}: skipped (${e.message})`);
  }
  await sleep(2000);
}
console.log(`Finished. Saved ${ok} searches, skipped ${failed}.`);