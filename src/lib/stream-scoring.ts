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
export type FeesPriority = "critical" | "important" | "neutral";

export type QuizAnswers = Partial<{
  work_style: WorkStyle;
  career_goal: CareerGoal;
  risk_appetite: RiskAppetite;
  study_intensity: StudyIntensity;
  // fees_priority DOES drive stream fit now (see INDIA_FEASIBILITY below) —
  // it's not just a college filter, because in India some streams are
  // structurally unaffordable on a tight budget regardless of which
  // college you pick. city_type/campus_type/hostel_priority still only
  // drive college fit, not stream fit.
  fees_priority: FeesPriority;
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
  pure_sciences: "Science (B.Sc. / Research)",
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

// ---- INDIA FEE-REALITY CHECK ---------------------------------------------
// A student's interest-fit score is only half the story in India: some
// streams are structurally out of reach on a tight budget no matter which
// college you pick, because government seats are scarce/hyper-competitive
// and private fees are steep. This is general, stable knowledge about how
// Indian higher-ed admissions work (NEET/JEE/CLAT scarcity, typical private
// fee ranges) — not something that should be left to the AI to "remember"
// inconsistently. costScore is 0 (cheap & accessible) to 1 (very
// expensive & scarce govt seats).
const INDIA_FEASIBILITY: Record<StreamField, { costScore: number; note: string }> = {
  medicine: {
    costScore: 1.0,
    note: "In India, government MBBS seats are extremely limited and need a top-percentile NEET rank; private MBBS fees are among the highest of any stream, commonly running into tens of lakhs to over a crore for the full course. On a tight budget without an excellent NEET score, this stream is genuinely very hard to access.",
  },
  design_architecture: {
    costScore: 0.65,
    note: "Government design/architecture institutes (like NID, NIFT, SPA) are reasonably priced but entrance exams are tough and seats few; most other design/architecture colleges in India are private and expensive.",
  },
  cs_it: {
    costScore: 0.55,
    note: "CS/IT is the most oversubscribed branch even within affordable government engineering colleges, needing a very high JEE/state-CET rank; private colleges often charge more for CS/IT than for other branches.",
  },
  media_performing_arts: {
    costScore: 0.55,
    note: "A few government options (like FTII or mass-communication departments in central universities) are affordable but have very few seats; most private media/film schools in India charge high fees.",
  },
  law: {
    costScore: 0.5,
    note: "National Law Universities (via CLAT) are relatively affordable but highly competitive to get into; many private law colleges are costly.",
  },
  engineering: {
    costScore: 0.35,
    note: "Government engineering colleges (IITs/NITs/state colleges via JEE or state CETs) are affordable but competitive; private engineering fees range widely from moderate to very high.",
  },
  social_work: {
    costScore: 0.25,
    note: "Generally affordable in India, with several government-funded or subsidised options.",
  },
  business: {
    costScore: 0.2,
    note: "Plenty of affordable government/state BCom & BBA colleges exist in India; costs rise mainly if targeting top private business schools.",
  },
  education: {
    costScore: 0.15,
    note: "Government/state B.Ed colleges are inexpensive and widely available across India.",
  },
  pure_sciences: {
    costScore: 0.1,
    note: "One of the most affordable and accessible streams in India — most state/government colleges offer B.Sc at low fees with comparatively easier admission than engineering or medicine.",
  },
  arts_humanities: {
    costScore: 0.1,
    note: "Among the cheapest and most widely available streams in India — government/state BA colleges are low-cost with comparatively easy admission.",
  },
};

/**
 * How much a field's raw interest-fit score gets discounted for India's
 * fee/seat realities, given how much the student cares about low fees.
 * "critical" (I need affordable, full stop) discounts hard; "important"
 * discounts moderately; "neutral" (fully funded) applies no discount at
 * all, since cost genuinely isn't a constraint for that student.
 */
function feasibilityMultiplier(field: StreamField, feesPriority?: FeesPriority): number {
  if (!feesPriority || feesPriority === "neutral") return 1;
  const { costScore } = INDIA_FEASIBILITY[field];
  const strength = feesPriority === "critical" ? 0.65 : 0.3;
  return 1 - costScore * strength;
}

// ---- Core scoring function ----------------------------------------------

export type FieldScore = {
  field: StreamField;
  label: string;
  score: number; // 0-100, rounded, AFTER the India fee-reality discount
  interestScore: number; // 0-100, BEFORE the fee-reality discount — pure interest fit
  // which quiz answers contributed and how much, for transparent explanations
  drivers: { signal: string; contribution: number }[];
  // set when fees_priority meaningfully discounted this field's score
  feasibilityNote?: string;
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

    const interestScore = maxPossible > 0 ? Math.round((achieved / maxPossible) * 100) : 0;
    const multiplier = feasibilityMultiplier(field, answers.fees_priority);
    const score = Math.round(interestScore * multiplier);
    // Only surface the note when the discount is big enough to actually
    // change the picture (a token 2-3 point dip isn't worth flagging).
    const feasibilityNote = multiplier <= 0.8 ? INDIA_FEASIBILITY[field].note : undefined;

    return {
      field,
      label: FIELD_LABELS[field],
      score,
      interestScore,
      drivers: drivers.sort((a, b) => b.contribution - a.contribution),
      feasibilityNote,
    };
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
  // true when the CHOSEN field has a flagged India fee-reality problem
  // given this student's fees_priority — independent of interest fit.
  // A student can be a great interest match for Medicine and still be
  // budget-blocked from it; this is what catches that case.
  hasFeasibilityConcern: boolean;
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
      hasFeasibilityConcern: false,
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

  let note = hasMismatch
    ? `Chosen path (${FIELD_LABELS[chosenField]}, quiz-fit score ${chosenScoreEntry.score}/100) diverges from what the quiz points to most strongly: ${top.label} (score ${top.score}/100), driven by ${top.drivers.map((d) => d.signal).join(", ") || "overall profile"}.`
    : `Chosen path (${FIELD_LABELS[chosenField]}, quiz-fit score ${chosenScoreEntry.score}/100) is consistent with the quiz.`;

  // If the CHOSEN field has a real India fee-reality problem given this
  // student's budget priority, that's worth flagging even when there's no
  // interest mismatch — a student can be a great fit for Medicine and
  // still be budget-blocked from it.
  if (chosenScoreEntry.feasibilityNote) {
    note += ` India fee-reality check: ${chosenScoreEntry.feasibilityNote}`;
  }

  return {
    hasMismatch,
    hasFeasibilityConcern: Boolean(chosenScoreEntry.feasibilityNote),
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