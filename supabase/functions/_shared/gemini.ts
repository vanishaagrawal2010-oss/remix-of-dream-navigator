// Shared helpers for the new college functions (Deno, no external imports)

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Calls Gemini with Google Search grounding first, then falls back.
// Returns the text answer plus the web pages Gemini used (sources).
export async function askGemini(prompt: string) {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY is not configured");

  const attempts = [
    { model: "gemini-2.5-flash", grounding: true },
    { model: "gemini-2.0-flash", grounding: true },
    { model: "gemini-2.5-flash", grounding: false },
  ];

  for (const { model, grounding } of attempts) {
    const body: any = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 16000,
        ...(grounding ? {} : { responseMimeType: "application/json" }),
      },
    };
    if (grounding) body.tools = [{ google_search: {} }];

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    );
    if (res.status === 429) throw new Error("AI is busy right now. Please try again shortly.");
    if (!res.ok) {
      console.error(`Gemini ${model} grounding=${grounding} failed: ${res.status}`);
      continue;
    }
    const data = await res.json();
    const text: string = (data.candidates?.[0]?.content?.parts ?? [])
      .map((p: any) => p.text || "")
      .join("");
    const chunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const sources = chunks
      .map((c: any) => ({ title: c.web?.title || "", url: c.web?.uri || "" }))
      .filter((s: any) => s.url);
    return { text, sources, grounded: grounding };
  }
  throw new Error("AI is temporarily unavailable. Please try again in a moment.");
}

// Pulls JSON out of an answer even if Gemini wrapped it in ```json fences
export function parseJson(text: string): any {
  try { return JSON.parse(text); } catch { /* keep trying */ }
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1] : text;
  try { return JSON.parse(raw); } catch { /* keep trying */ }
  const first = raw.search(/[\[{]/);
  const last = Math.max(raw.lastIndexOf("}"), raw.lastIndexOf("]"));
  if (first >= 0 && last > first) {
    try { return JSON.parse(raw.slice(first, last + 1)); } catch { /* give up */ }
  }
  return null;
}

// Checks that the person calling us is a signed-in student
export async function requireUser(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization");
  if (!auth) return false;
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const res = await fetch(`${url}/auth/v1/user`, { headers: { Authorization: auth, apikey: anon } });
  return res.ok;
}

// Tiny helpers to talk to the database with full (server) rights
export const db = {
  headers() {
    const k = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    return { apikey: k, Authorization: `Bearer ${k}`, "Content-Type": "application/json" };
  },
  url(path: string) {
    return `${Deno.env.get("SUPABASE_URL")}/rest/v1/${path}`;
  },
  async select(path: string) {
    const r = await fetch(db.url(path), { headers: db.headers() });
    if (!r.ok) throw new Error(`db select failed: ${await r.text()}`);
    return await r.json();
  },
  async upsert(table: string, rows: unknown[], onConflict: string) {
    const r = await fetch(db.url(`${table}?on_conflict=${onConflict}`), {
      method: "POST",
      headers: { ...db.headers(), Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows),
    });
    if (!r.ok) throw new Error(`db upsert failed: ${await r.text()}`);
  },
};