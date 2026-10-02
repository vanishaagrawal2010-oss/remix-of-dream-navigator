// =====================================================================
// RECOMMENDATION ENGINE (used by the Dashboard swipe cards)
//
// How it works, in plain words:
//  1. TWO hard rules only: the college must be in a country the student
//     chose, and it must relate to their chosen field of study.
//  2. Everything else (grades, fees, hostel, campus, city, quiz answers,
//     interests) adds or removes POINTS. Nothing else hides a college.
//  3. We then return the best ~20 colleges, always including a few
//     "safe" and a few "stretch" options so the list has variety.
// =====================================================================
import {
  ALL_UNIS,
  DIFFICULTY_MIN_TIER,
  TIER_RANK,
  deriveGradeTier,
  getPreference,
  STREAM_SYNONYMS,
  isUndergradEquivalent,
  type University,
  type StudyPreference,
} from "@/data/universities";

export type Recommendation = University & {
  match: number;
  matchReason: string; // short text shown under the college name
  reasons: string[]; // individual reasons, shown as chips
  fit: "Safe" | "Match" | "Stretch";
};

export type RecommendationResult = {
  items: Recommendation[];
  countriesUsed: string[];
  defaultedToIndia: boolean; // student had not chosen any country
  missingCountries: string[]; // chosen countries we have no colleges for yet
  poolSize: number; // how many colleges passed the two hard rules
};

const TARGET_COUNT = 20;

// ───────────────────────── helpers ─────────────────────────

type Family =
  | "engineering"
  | "medical"
  | "business"
  | "arts"
  | "science"
  | "law"
  | "design"
  | "other";

const familyOf = (text: string): Family => {
  const t = text.toLowerCase();
  if (/mbbs|bds|bams|bhms|bums|pharm|nursing|physio|medic|dental|veterin|health|radiolog|optometr/.test(t)) return "medical";
  if (/llb|\blaw\b/.test(t)) return "law";
  if (/design|fashion|architect|animation|fine art/.test(t)) return "design";
  if (/btech|b\.tech|\bbe\b|engineer|computer|robotic|aerospace|mechanic|civil|electr|software|data science|ai\/ml|cyber/.test(t)) return "engineering";
  if (/bba|bcom|\bmba\b|\bbms\b|commerce|business|finance|marketing|account|hotel|hospitality|management/.test(t)) return "business";
  if (/bsc|\bbs\b|physics|chemistry|biology|math|statistic|science|biotech/.test(t)) return "science";
  if (/\bba\b|arts|humanit|psycholog|econom|english|history|journal|political|sociolog/.test(t)) return "arts";
  return "other";
};

const FAMILY_LABEL: Record<Family, string> = {
  engineering: "Engineering",
  medical: "Medical & health",
  business: "Business",
  arts: "Arts & humanities",
  science: "Science",
  law: "Law",
  design: "Design",
  other: "Your field",
};

const isMastersDegree = (d: string) =>
  /^(ms|mtech|mba|msc|ma|mca|me|mphil|phd)$/i.test(d.replace(/[.\s]/g, ""));

// Countries we use for currency when the text has no symbol
const COUNTRY_CURRENCY: Record<string, string> = {
  India: "INR", USA: "USD", UK: "GBP", Canada: "CAD", Australia: "AUD",
  Germany: "EUR", Singapore: "SGD", Switzerland: "CHF", Japan: "JPY",
  Netherlands: "EUR", France: "EUR",
};

// Rough rates to rupees. Only used to compare fees with budget, so
// approximate is fine.
const TO_INR: Record<string, number> = {
  INR: 1, USD: 88, GBP: 112, EUR: 96, CHF: 100, CAD: 64, AUD: 58, SGD: 66, JPY: 0.6,
};

const detectCurrency = (s: string): string | null => {
  const t = s.toLowerCase();
  if (/₹|\brs\.?\b|inr|lakh|\blac\b|lpa|crore/.test(t)) return "INR";
  if (/£|gbp/.test(t)) return "GBP";
  if (/€|eur\b/.test(t)) return "EUR";
  if (/chf/.test(t)) return "CHF";
  if (/cad/.test(t)) return "CAD";
  if (/aud/.test(t)) return "AUD";
  if (/sgd/.test(t)) return "SGD";
  if (/¥|jpy|yen/.test(t)) return "JPY";
  if (/\$|usd/.test(t)) return "USD";
  return null;
};

// Reads "₹5,00,000/yr", "$30,000/year", "5 lakh", "30k" → a plain number
const parseAmount = (s: string): number | null => {
  const t = s.toLowerCase().replace(/,/g, "");
  let best: number | null = null;
  for (const m of t.matchAll(/(\d+(?:\.\d+)?)\s*(lakhs?|lacs?|lpa|crores?|cr\b|k\b)?/g)) {
    let n = parseFloat(m[1]);
    const unit = m[2] || "";
    if (/^(lakh|lac|lpa)/.test(unit)) n *= 100000;
    else if (/^cr/.test(unit)) n *= 10000000;
    else if (unit === "k") n *= 1000;
    if (!isNaN(n) && (best === null || n > best)) best = n;
  }
  return best;
};

const tuitionInINR = (u: University): number | null => {
  const n = parseAmount(u.tuition);
  if (n === null) return null;
  const cur = detectCurrency(u.tuition) || COUNTRY_CURRENCY[u.country] || "USD";
  return n * (TO_INR[cur] ?? 1);
};

const budgetInINR = (budget: string | null | undefined, countries: string[]): number | null => {
  if (!budget) return null;
  const n = parseAmount(budget);
  if (n === null || n <= 0) return null;
  const cur = detectCurrency(budget) || (countries.length > 0 && countries.every(c => c === "India") ? "INR" : "USD");
  return n * (TO_INR[cur] ?? 1);
};

const METRO = /mumbai|delhi|bangalore|bengaluru|chennai|hyderabad|kolkata|pune|new york|london|singapore|tokyo|sydney|toronto|melbourne|boston/i;
const SMALL_TOWN = /pilani|kharagpur|warangal|roorkee|guwahati|manipal|vellore|patiala|tiruchirappalli|kanpur|phagwara|mohali|varanasi|puducherry|west lafayette|urbana|stanford|ithaca|princeton/i;

// ───────────────────────── the engine ─────────────────────────

export const computeRecommendations = (profile: any, pool: University[] = ALL_UNIS): RecommendationResult => {
  const empty: RecommendationResult = {
    items: [], countriesUsed: [], defaultedToIndia: false, missingCountries: [], poolSize: 0,
  };
  if (!profile) return empty;

  // ── Countries: never mix countries the student did not pick ──────────
  let countries: string[] = (profile.target_countries || []).filter(Boolean);
  let defaultedToIndia = false;
  if (countries.length === 0) {
    countries = ["India"]; // safer than showing every country in the world
    defaultedToIndia = true;
  }
  const available = new Set(pool.map(u => u.country));
  const missingCountries = countries.filter(c => !available.has(c));

  const quiz = (profile.quiz_preferences || {}) as Record<string, string>;
  const interests: string[] = ((profile.interests || []) as string[]).map(s => s.toLowerCase().trim()).filter(Boolean);

  // ── Grades ───────────────────────────────────────────────────────────
  const tier: string = profile.grade_tier || deriveGradeTier(profile.grades) || "average";
  const userRank: number = TIER_RANK[tier] ?? 2;

  // ── Field of study preferences (1st, 2nd, 3rd choice) ────────────────
  const prefs: { pref: StudyPreference; rank: number; family: Family }[] = [];
  [profile.stream_pref_1, profile.stream_pref_2, profile.stream_pref_3].forEach((v, i) => {
    const p = getPreference(v);
    if (p) prefs.push({ pref: p, rank: i + 1, family: familyOf(`${p.degree} ${p.stream}`) });
  });
  if (prefs.length === 0 && profile.degree_type && profile.stream) {
    const p: StudyPreference = {
      value: "legacy", label: `${profile.degree_type} — ${profile.stream}`,
      degree: profile.degree_type, stream: profile.stream,
    };
    prefs.push({ pref: p, rank: 1, family: familyOf(`${p.degree} ${p.stream}`) });
  }
  if (prefs.length === 0) return { ...empty, countriesUsed: countries, defaultedToIndia, missingCountries };

  const exactMatch = (u: University, p: StudyPreference): boolean => {
    const sameDeg = u.degree.toLowerCase() === p.degree.toLowerCase();
    if (!sameDeg && !isUndergradEquivalent(u.degree, p.degree)) return false;
    const us = u.stream.toLowerCase();
    const up = u.program.toLowerCase();
    const targets = new Set<string>([p.stream.toLowerCase(), ...(STREAM_SYNONYMS[p.stream.toLowerCase()] || [])]);
    for (const t of targets) if (us.includes(t) || up.includes(t)) return true;
    return false;
  };

  // What kind of work the student enjoys → which fields suit them
  const WORK_STYLE_FAMILY: Record<string, Family[]> = {
    investigative: ["engineering", "science", "medical"],
    realistic: ["engineering", "design"],
    artistic: ["design", "arts"],
    social: ["arts", "medical", "law"],
    enterprising: ["business", "law"],
    conventional: ["business"],
  };

  const userBudget = budgetInINR(profile.budget, countries);
  const prefIsMasters = prefs.every(p => isMastersDegree(p.pref.degree));

  const scored: Recommendation[] = [];
  let poolSize = 0;

  for (const u of pool) {
    // HARD RULE 1: only countries the student chose
    if (!countries.includes(u.country)) continue;

    const uFamily = familyOf(`${u.program} ${u.degree} ${u.stream}`);
    const uText = `${u.name} ${u.program} ${u.stream}`.toLowerCase();

    // HARD RULE 2: must relate to the student's field (or an interest)
    const exact = prefs.find(p => exactMatch(u, p.pref));
    const sameField = exact ? undefined : prefs.find(p => p.family !== "other" && p.family === uFamily);
    const interestHits = interests.filter(i => i.length > 2 && uText.includes(i));
    if (!exact && !sameField && interestHits.length === 0) continue;

    // Don't show master's programmes to bachelor's students or vice versa
    if (!exact && isMastersDegree(u.degree) !== prefIsMasters) continue;

    // Grades far out of reach (3+ steps) are not useful to anyone
    const tierGap = DIFFICULTY_MIN_TIER[u.difficulty] - userRank; // + = harder than student
    if (tierGap >= 3) continue;

    poolSize++;

    let score = 40;
    const reasons: string[] = [];

    // 1. Field of study (biggest signal)
    if (exact) {
      score += exact.rank === 1 ? 28 : exact.rank === 2 ? 18 : 10;
      reasons.push(`Your choice #${exact.rank}: ${exact.pref.label}`);
    } else if (sameField) {
      score += sameField.rank === 1 ? 14 : sameField.rank === 2 ? 9 : 5;
      reasons.push(`Related to ${FAMILY_LABEL[sameField.family]}`);
    }
    if (interestHits.length > 0) {
      score += Math.min(10, interestHits.length * 5);
      reasons.push(`Fits your interest in ${interestHits[0]}`);
    }

    // 2. Grades
    let fit: Recommendation["fit"] = "Match";
    if (tierGap <= -2) { score += 4; fit = "Safe"; reasons.push("Comfortable for your grades"); }
    else if (tierGap === -1) { score += 8; fit = "Safe"; reasons.push("Likely admit for your grades"); }
    else if (tierGap === 0) { score += 16; reasons.push("Right level for your grades"); }
    else if (tierGap === 1) { score += 1; fit = "Stretch"; reasons.push("A stretch, but possible"); }
    else { score -= 10; fit = "Stretch"; reasons.push("Ambitious reach"); }

    // 3. Budget (profile budget first, quiz answer second)
    const tuition = tuitionInINR(u);
    if (userBudget !== null && tuition !== null) {
      const ratio = tuition / userBudget;
      if (ratio <= 0.7) { score += 14; reasons.push("Well within your budget"); }
      else if (ratio <= 1) { score += 9; reasons.push("Within your budget"); }
      else if (ratio <= 1.25) { reasons.push("Slightly above budget"); }
      else if (ratio <= 1.6) { score -= 8; }
      else { score -= 18; }
      if (quiz.fees_priority === "critical" && ratio > 1.25) score -= 14;
    } else if (tuition !== null) {
      if (quiz.fees_priority === "critical") {
        if (tuition <= 300000) { score += 10; reasons.push("Affordable fees"); }
        else if (tuition > 1000000) score -= 14;
      } else if (quiz.fees_priority === "important" && tuition <= 300000) {
        score += 6; reasons.push("Affordable fees");
      }
    }

    // 4. Hostel
    const hostelBad = !u.hostel || u.hostel === "Limited";
    if (quiz.hostel_priority === "critical") {
      if (u.hostel === "Excellent") { score += 14; reasons.push("Excellent hostel"); }
      else if (u.hostel === "Good") { score += 9; reasons.push("Good hostel"); }
      else if (u.hostel === "Average") score += 2;
      else score -= 18;
    } else if (quiz.hostel_priority === "important") {
      if (u.hostel === "Excellent") { score += 9; reasons.push("Excellent hostel"); }
      else if (u.hostel === "Good") score += 6;
      else if (u.hostel === "Average") score += 2;
      else if (hostelBad) score -= 4;
    }

    // 5. Campus and city feel
    if (quiz.campus_type && u.campus === quiz.campus_type) { score += 8; reasons.push(`${u.campus} campus, as you like`); }
    const city = u.city || "";
    if (quiz.city_type === "metro" && METRO.test(city)) { score += 7; reasons.push("Big-city life"); }
    else if (quiz.city_type === "small" && SMALL_TOWN.test(city)) { score += 7; reasons.push("Focused small-town campus"); }
    else if (quiz.city_type === "tier2" && !METRO.test(city) && !SMALL_TOWN.test(city)) score += 5;

    // 6. Study style and goals
    if (quiz.study_intensity === "intense" && u.difficulty === "Very Hard") score += 8;
    else if (quiz.study_intensity === "balanced" && (u.difficulty === "Hard" || u.difficulty === "Moderate")) score += 6;
    else if (quiz.study_intensity === "relaxed" && (u.difficulty === "Easy" || u.difficulty === "Moderate")) score += 7;

    if (quiz.career_goal === "research" && u.ranking <= 200) { score += 6; reasons.push("Strong for research"); }
    if (quiz.career_goal === "startup" && (uFamily === "business" || uFamily === "engineering")) score += 3;
    if (quiz.career_goal === "stable" && u.country === "India") score += 3;

    // 7. Kind of work the student enjoys
    const styleFamilies = WORK_STYLE_FAMILY[quiz.work_style] || [];
    if (styleFamilies.includes(uFamily)) score += 5;

    const finalScore = Math.min(99, Math.max(35, Math.round(score)));
    const shown = reasons.slice(0, 4);

    scored.push({
      ...u,
      match: finalScore,
      reasons: shown,
      matchReason: shown.slice(0, 2).join(" · "),
      fit,
    });
  }

  scored.sort((a, b) => b.match - a.match);

  // The same college can appear once per course. Keep only its best entry.
  const bestByName = new Map<string, Recommendation>();
  for (const r of scored) if (!bestByName.has(r.name)) bestByName.set(r.name, r);
  scored.length = 0;
  bestByName.forEach(r => scored.push(r));

  // ── Build a list of ~20 with variety (safe + match + stretch) ────────
  const picked = new Set<string>();
  const final: Recommendation[] = [];
  const take = (u: Recommendation) => {
    if (!picked.has(u.name) && final.length < TARGET_COUNT) { picked.add(u.name); final.push(u); }
  };

  scored.slice(0, 14).forEach(take);
  scored.filter(u => u.fit === "Stretch").slice(0, 3).forEach(take);
  scored.filter(u => u.fit === "Safe").slice(0, 3).forEach(take);
  scored.forEach(take); // fill any remaining space

  final.sort((a, b) => b.match - a.match);

  return { items: final, countriesUsed: countries, defaultedToIndia, missingCountries, poolSize: scored.length };
};