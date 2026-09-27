// =====================================================================
// DETERMINISTIC STREAM-SELECTION SCORING ENGINE
// =====================================================================
// Replaces "ask Gemini to eyeball it" with an actual reproducible formula.
// Same quiz answers → same scores, every single time. No AI call involved.
//
// This file is intentionally framework-free (no React, no path aliases,
// no Supabase/Deno-specific imports) so the EXACT SAME FILE can live in
// two places and stay byte-for-byte identical:
//   1. src/lib/stream-scoring.ts                         (frontend)
//   2. supabase/functions/_shared/stream-scoring.ts       (edge function)
//
// ⚠️ IMPORTANT: if you ever edit the rubric (the numbers below), copy the
// whole file to BOTH locations again. There is no build step that keeps
// them in sync automatically — this is a known limitation until the repo
// is set up to share code between the frontend and Supabase functions.
// =====================================================================

// ---- Raw quiz answer types (must match QuizPage.tsx QUESTIONS ids) -----

export type WorkStyle = "investigative" | "realistic" | "artistic" | "social" | "enterprising" | "conventional";
export type CareerGoal = "research" | "industry" | "startup" | "stable" | "social_impact";
export type RiskAppetite = "high" | "medium" | "low";
export type StudyIntensity = "intense" | "balanced" | "relaxed";

export type QuizAnswers = Partial<{
  work_style: WorkStyle;
  career_goal: CareerGoal;
  risk_appetite: RiskAppetite;
  study_intensity: StudyIntensity;
  // other quiz fields (fees_priority, city_type, campus_type, hostel_priority)
  // exist too but don't drive stream fit — they drive college fit instead.
  [key: string]: string | undefined;
}>;

// ---- The 11 broad fields every degree/stream in the app rolls up into --

export const STREAM_FIELDS = [
  "engineering",
  "cs_it",
  "medicine",
  "business",
  "law",
  "pure_sciences",
  "arts_humanities",
  "design_architecture",
  "media_performing_arts",
  "education",
  "social_work",
] as const;

export type StreamField = (typeof STREAM_FIELDS)[number];

export const FIELD_LABELS: Record<StreamField, string> = {
  engineering: "Engineering & Technology",
  cs_it: "Computer Science & IT",
  medicine: "Medicine & Allied Health",
  business: "Business, Commerce & Management",
  law: "Law",
  pure_sciences: "Pure Sciences",
  arts_humanities: "Arts, Humanities & Social Sciences",
  design_architecture: "Design & Architecture",
  media_performing_arts: "Media, Film & Performing Arts",
  education: "Education",
  social_work: "Social Work & Public Service",
};

// ---- THE RUBRIC ---------------------------------------------------------
// Every field gets a 0–1 weight against every possible answer to each of
// the 4 stream-relevant quiz questions. These weights encode standard
// Holland/RIASEC occupational-interest theory (work_style) plus practical
// modifiers for career goal, risk appetite and desired intensity.
//
// Scoring formula (see computeFieldScore):
//   score = work_style_weight * 60
//         + career_goal_weight * 20
//         + risk_weight * 10
//         + intensity_weight * 10
// Max possible = 100. work_style is weighted heaviest because it's the
// single strongest, most direct interest signal in the quiz.

type Rubric = {
  workStyle: Record<WorkStyle, number>;
  careerGoal: Record<CareerGoal, number>;
  risk: Record<RiskAppetite, number>;
  intensity: Record<StudyIntensity, number>;
};

const FIELD_RUBRIC: Record<StreamField, Rubric> = {
  engineering: {
    workStyle: { realistic: 1.0, investigative: 0.8, conventional: 0.4, enterprising: 0.3, artistic: 0.2, social: 0.1 },
    careerGoal: { industry: 1.0, research: 0.7, stable: 0.7, startup: 0.6, social_impact: 0.3 },
    risk: { medium: 0.8, low: 0.7, high: 0.5 },
    intensity: { intense: 1.0, balanced: 0.7, relaxed: 0.3 },
  },
  cs_it: {
    workStyle: { investigative: 1.0, conventional: 0.7, realistic: 0.5, enterprising: 0.5, artistic: 0.3, social: 0.2 },
    careerGoal: { industry: 1.0, startup: 1.0, research: 0.7, stable: 0.5, social_impact: 0.3 },
    risk: { high: 0.9, medium: 0.8, low: 0.4 },
    intensity: { intense: 0.9, balanced: 0.8, relaxed: 0.3 },
  },
  medicine: {
    workStyle: { investigative: 1.0, social: 0.8, realistic: 0.4, conventional: 0.4, artistic: 0.1, enterprising: 0.2 },
    careerGoal: { social_impact: 0.9, stable: 0.9, research: 0.8, industry: 0.3, startup: 0.2 },
    risk: { low: 0.9, medium: 0.6, high: 0.2 },
    intensity: { intense: 1.0, balanced: 0.6, relaxed: 0.1 },
  },
  business: {
    workStyle: { enterprising: 1.0, conventional: 0.8, social: 0.4, investigative: 0.3, artistic: 0.2, realistic: 0.2 },
    careerGoal: { startup: 1.0, industry: 0.9, stable: 0.6, social_impact: 0.4, research: 0.2 },
    risk: { high: 0.9, medium: 0.8, low: 0.5 },
    intensity: { balanced: 0.8, intense: 0.7, relaxed: 0.4 },
  },
  law: {
    workStyle: { enterprising: 0.9, investigative: 0.7, social: 0.6, conventional: 0.5, artistic: 0.2, realistic: 0.1 },
    careerGoal: { stable: 0.9, social_impact: 0.8, research: 0.5, industry: 0.5, startup: 0.3 },
    risk: { low: 0.8, medium: 0.7, high: 0.4 },
    intensity: { intense: 0.9, balanced: 0.7, relaxed: 0.2 },
  },
  pure_sciences: {
    workStyle: { investigative: 1.0, realistic: 0.5, conventional: 0.5, artistic: 0.2, social: 0.2, enterprising: 0.1 },
    careerGoal: { research: 1.0, stable: 0.8, industry: 0.4, social_impact: 0.4, startup: 0.2 },
    risk: { low: 0.8, medium: 0.7, high: 0.3 },
    intensity: { intense: 0.8, balanced: 0.7, relaxed: 0.4 },
  },
  arts_humanities: {
    workStyle: { social: 0.9, artistic: 0.7, investigative: 0.5, enterprising: 0.4, conventional: 0.3, realistic: 0.1 },
    careerGoal: { social_impact: 0.9, research: 0.7, stable: 0.6, industry: 0.4, startup: 0.3 },
    risk: { low: 0.6, medium: 0.7, high: 0.5 },
    intensity: { balanced: 0.8, relaxed: 0.8, intense: 0.4 },
  },
  design_architecture: {
    workStyle: { artistic: 1.0, realistic: 0.6, investigative: 0.4, enterprising: 0.4, social: 0.2, conventional: 0.2 },
    careerGoal: { startup: 0.9, industry: 0.7, social_impact: 0.4, research: 0.3, stable: 0.3 },
    risk: { high: 0.8, medium: 0.7, low: 0.4 },
    intensity: { balanced: 0.8, intense: 0.7, relaxed: 0.4 },
  },
  media_performing_arts: {
    workStyle: { artistic: 1.0, social: 0.6, enterprising: 0.6, investigative: 0.2, realistic: 0.2, conventional: 0.1 },
    careerGoal: { startup: 0.9, social_impact: 0.5, industry: 0.5, research: 0.2, stable: 0.2 },
    risk: { high: 1.0, medium: 0.6, low: 0.2 },
    intensity: { relaxed: 0.6, balanced: 0.7, intense: 0.5 },
  },
  education: {
    workStyle: { social: 1.0, conventional: 0.6, artistic: 0.3, investigative: 0.3, enterprising: 0.2, realistic: 0.1 },
    careerGoal: { stable: 1.0, social_impact: 0.9, research: 0.4, startup: 0.2, industry: 0.2 },
    risk: { low: 0.9, medium: 0.6, high: 0.2 },
    intensity: { balanced: 0.8, relaxed: 0.7, intense: 0.3 },
  },
  social_work: {
    workStyle: { social: 1.0, enterprising: 0.4, investigative: 0.3, artistic: 0.3, conventional: 0.3, realistic: 0.2 },
    careerGoal: { social_impact: 1.0, stable: 0.7, research: 0.3, startup: 0.2, industry: 0.1 },
    risk: { low: 0.7, medium: 0.6, high: 0.4 },
    intensity: { balanced: 0.7, relaxed: 0.7, intense: 0.3 },
  },
};

// ---- Core scoring function ----------------------------------------------

export type FieldScore = {
  field: StreamField;
  label: string;
  score: number; // 0-100, rounded
  // which quiz answers contributed and how much, for transparent explanations
  drivers: { signal: string; contribution: number }[];
};

/**
 * Deterministically scores all 11 fields against a set of quiz answers.
 * Missing answers simply contribute nothing and the max possible score is
 * rescaled accordingly, so a partially-completed quiz still produces a
 * sensible 0-100 score rather than one artificially capped low.
 */
export function computeStreamScores(answers: QuizAnswers): FieldScore[] {
  const results: FieldScore[] = STREAM_FIELDS.map((field) => {
    const rubric = FIELD_RUBRIC[field];
    let achieved = 0;
    let maxPossible = 0;
    const drivers: { signal: string; contribution: number }[] = [];

    if (answers.work_style && rubric.workStyle[answers.work_style] !== undefined) {
      const w = rubric.workStyle[answers.work_style] * 60;
      achieved += w;
      maxPossible += 60;
      if (w >= 30) drivers.push({ signal: `work style: ${answers.work_style}`, contribution: Math.round(w) });
    }
    if (answers.career_goal && rubric.careerGoal[answers.career_goal] !== undefined) {
      const w = rubric.careerGoal[answers.career_goal] * 20;
      achieved += w;
      maxPossible += 20;
      if (w >= 14) drivers.push({ signal: `career goal: ${answers.career_goal}`, contribution: Math.round(w) });
    }
    if (answers.risk_appetite && rubric.risk[answers.risk_appetite] !== undefined) {
      const w = rubric.risk[answers.risk_appetite] * 10;
      achieved += w;
      maxPossible += 10;
      if (w >= 7) drivers.push({ signal: `risk appetite: ${answers.risk_appetite}`, contribution: Math.round(w) });
    }
    if (answers.study_intensity && rubric.intensity[answers.study_intensity] !== undefined) {
      const w = rubric.intensity[answers.study_intensity] * 10;
      achieved += w;
      maxPossible += 10;
      if (w >= 7) drivers.push({ signal: `study intensity: ${answers.study_intensity}`, contribution: Math.round(w) });
    }

    const score = maxPossible > 0 ? Math.round((achieved / maxPossible) * 100) : 0;
    return { field, label: FIELD_LABELS[field], score, drivers: drivers.sort((a, b) => b.contribution - a.contribution) };
  });

  return results.sort((a, b) => b.score - a.score);
}

// ---- Mapping a chosen degree+stream preference to a field --------------
// Used to compare "what the student picked" against "what the quiz says".

export function fieldForPreference(degree: string, stream: string): StreamField {
  const d = degree.toLowerCase();
  const s = stream.toLowerCase();

  const csStreams = [
    "computer science", "information technology", "data science", "ai/ml",
    "cyber security", "software engineering", "bioinformatics", "cloud & cyber security",
    "computer applications", "game design", "animation & vfx",
  ];

  if (["mbbs", "bds", "bams", "bhms", "bums", "bpt", "bpharma", "dpharma", "bvsc", "bnys", "bot", "bmlt", "md", "ms (med)", "mpharma"].includes(d)
    || ["nursing", "radiology", "medical lab technology", "optometry", "veterinary science"].includes(s)) {
    return "medicine";
  }
  if (["ba llb", "bba llb", "bcom llb", "llb", "llm"].includes(d) || s === "law") return "law";
  if (["bdes", "bfa", "barch", "bplan", "binteriordesign", "mdes", "march"].includes(d)) return "design_architecture";
  if (["bed", "beled", "bped"].includes(d)) return "education";
  if (d === "bsw") return "social_work";
  if (["bca", "mca"].includes(d) || csStreams.includes(s)) return "cs_it";
  if (["bba", "bcom", "bms", "bhm", "ca", "cs", "cma", "mba", "mcom"].includes(d)) return "business";
  if (s === "film studies" || s === "performing arts") return "media_performing_arts";
  if (["btech", "be"].includes(d)) return "engineering";
  if (d === "bs" && (s === "mathematics" || s === "physics")) return "pure_sciences";
  if (d === "bs") return "engineering";
  if (["bsc", "msc"].includes(d)) {
    // BSc/MSc in a CS-flavoured stream still counts as CS & IT; everything
    // else pure-science-labelled falls back to Pure Sciences. Aviation and
    // Hotel Management are vocational/business-adjacent, not pure science.
    if (s === "aviation" || s === "hotel management") return "business";
    return "pure_sciences";
  }
  if (["ba", "ma"].includes(d)) return "arts_humanities";
  // Fallback for anything unmapped (e.g. "PhD — General"): treat as
  // research-driven, closest to Pure Sciences.
  return "pure_sciences";
}

// ---- Deterministic mismatch check ---------------------------------------

export type MismatchResult = {
  hasMismatch: boolean;
  chosenField: StreamField | null;
  chosenFieldLabel: string | null;
  chosenScore: number | null;
  topField: StreamField;
  topFieldLabel: string;
  topScore: number;
  topDrivers: string[];
  note: string;
};

/**
 * Compares the student's stated degree+stream choice against what their
 * quiz answers actually point to. Deterministic — no AI judgment call.
 *
 * Flags a mismatch when EITHER:
 *   - the chosen field isn't in the top 3 scoring fields, OR
 *   - the chosen field's score trails the top field's score by 25+ points
 * These thresholds are the tunable part of this check — adjust here only.
 */
export function detectStreamMismatch(
  chosenDegree: string | null | undefined,
  chosenStream: string | null | undefined,
  quiz: QuizAnswers | null | undefined
): MismatchResult | null {
  if (!quiz || Object.keys(quiz).length === 0) return null; // no quiz data → nothing to check

  const scores = computeStreamScores(quiz);
  const top = scores[0];
  const top3 = new Set(scores.slice(0, 3).map((s) => s.field));

  let chosenField: StreamField | null = null;
  let chosenScoreEntry: FieldScore | undefined;
  if (chosenDegree && chosenStream) {
    chosenField = fieldForPreference(chosenDegree, chosenStream);
    chosenScoreEntry = scores.find((s) => s.field === chosenField);
  }

  if (!chosenField || !chosenScoreEntry) {
    return {
      hasMismatch: false,
      chosenField: null,
      chosenFieldLabel: null,
      chosenScore: null,
      topField: top.field,
      topFieldLabel: top.label,
      topScore: top.score,
      topDrivers: top.drivers.map((d) => d.signal),
      note: `No degree/stream chosen yet. Quiz points most strongly to ${top.label} (score ${top.score}/100).`,
    };
  }

  const gap = top.score - chosenScoreEntry.score;
  const hasMismatch = chosenField !== top.field && (!top3.has(chosenField) || gap >= 25);

  const note = hasMismatch
    ? `Chosen path (${FIELD_LABELS[chosenField]}, quiz-fit score ${chosenScoreEntry.score}/100) diverges from what the quiz points to most strongly: ${top.label} (score ${top.score}/100), driven by ${top.drivers.map((d) => d.signal).join(", ") || "overall profile"}.`
    : `Chosen path (${FIELD_LABELS[chosenField]}, quiz-fit score ${chosenScoreEntry.score}/100) is consistent with the quiz.`;

  return {
    hasMismatch,
    chosenField,
    chosenFieldLabel: FIELD_LABELS[chosenField],
    chosenScore: chosenScoreEntry.score,
    topField: top.field,
    topFieldLabel: top.label,
    topScore: top.score,
    topDrivers: top.drivers.map((d) => d.signal),
    note,
  };
}