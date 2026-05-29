import { useState, useMemo, useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { GraduationCap, MapPin, DollarSign, Calendar, ExternalLink, MessageSquare, Sparkles, TrendingUp, Heart, X, BarChart3, Newspaper, Trash2 } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  ALL_UNIS, DIFFICULTY_MIN_TIER, TIER_RANK, deriveGradeTier, getPreference,
  STREAM_SYNONYMS, isUndergradEquivalent, type University, type StudyPreference,
} from "@/data/universities";

type NewsItem = {
  title: string;
  date: string;
  uni: string;
  tag: string;
  url: string;
  source: string;
};

const NEWS_ITEMS: NewsItem[] = [
  { title: "MIT announces new AI research scholarship for 2026", date: "Apr 10, 2026", uni: "MIT", tag: "Scholarship", url: "https://news.mit.edu/topic/scholarships", source: "MIT News" },
  { title: "Stanford CS admissions deadline extended by 2 weeks", date: "Apr 8, 2026", uni: "Stanford University", tag: "Deadline", url: "https://news.stanford.edu/", source: "Stanford News" },
  { title: "IIT Bombay opens JEE Advanced 2026 registration", date: "Apr 7, 2026", uni: "IIT Bombay", tag: "Admissions", url: "https://jeeadv.ac.in/", source: "JEE Advanced" },
  { title: "ETH Zurich tuition to remain lowest in Europe for 2026", date: "Apr 5, 2026", uni: "ETH Zurich", tag: "Tuition", url: "https://ethz.ch/en/news.html", source: "ETH News" },
  { title: "VIT Vellore starts phase 2 of VITEEE 2026 counselling", date: "Apr 4, 2026", uni: "VIT Vellore", tag: "Admissions", url: "https://viteee.vit.ac.in/", source: "VIT Admissions" },
  { title: "NIT Trichy ranked #1 among NITs in NIRF 2026", date: "Apr 3, 2026", uni: "NIT Trichy", tag: "Rankings", url: "https://www.nirfindia.org/Rankings/2026/EngineeringRanking.html", source: "NIRF India" },
  { title: "University of Toronto launches new Data Science BTech", date: "Apr 3, 2026", uni: "University of Toronto", tag: "Program", url: "https://www.utoronto.ca/news", source: "UofT News" },
  { title: "Carnegie Mellon opens early decision for CS program", date: "Apr 1, 2026", uni: "Carnegie Mellon", tag: "Admissions", url: "https://www.cmu.edu/news/", source: "CMU News" },
  { title: "SRM University introduces 100% scholarship for toppers", date: "Mar 31, 2026", uni: "SRM University", tag: "Scholarship", url: "https://www.srmist.edu.in/admission-india/scholarships/", source: "SRM Admissions" },
  { title: "Purdue announces new mechanical engineering lab expansion", date: "Mar 29, 2026", uni: "Purdue University", tag: "Infrastructure", url: "https://www.purdue.edu/newsroom/", source: "Purdue News" },
  { title: "BITS Pilani BITSAT 2026 registration dates announced", date: "Mar 28, 2026", uni: "BITS Pilani", tag: "Admissions", url: "https://www.bitsadmission.com/", source: "BITS Admissions" },
  { title: "AIIMS Delhi NEET-UG 2026 cutoff trends released", date: "Mar 27, 2026", uni: "AIIMS Delhi", tag: "Admissions", url: "https://www.aiims.edu/index.php/en", source: "AIIMS News" },
  { title: "NLSIU Bangalore CLAT 2026 results expected next week", date: "Mar 27, 2026", uni: "NLSIU Bangalore", tag: "Admissions", url: "https://consortiumofnlus.ac.in/", source: "CLAT Consortium" },
  { title: "Manipal MIT opens applications for BTech lateral entry", date: "Mar 25, 2026", uni: "Manipal Institute of Technology", tag: "Admissions", url: "https://manipal.edu/mit/admission.html", source: "Manipal Admissions" },
];

const SCHOLARSHIP_PAGES: Record<string, string> = {
  "MIT": "https://sfs.mit.edu/undergraduate-students/types-of-aid/scholarships-grants/",
  "Stanford University": "https://financialaid.stanford.edu/undergrad/how/scholarships.html",
  "Carnegie Mellon": "https://www.cmu.edu/sfs/financial-aid/",
  "Georgia Tech": "https://finaid.gatech.edu/types-aid/scholarships/",
  "Purdue University": "https://www.admissions.purdue.edu/finances/scholarships.php",
  "University of Illinois": "https://osfa.illinois.edu/types-of-aid/scholarships/",
  "Arizona State University": "https://students.asu.edu/scholarships",
  "ETH Zurich": "https://ethz.ch/en/the-eth-zurich/education/scholarships.html",
  "NUS": "https://nus.edu.sg/oam/scholarships",
  "NTU Singapore": "https://www.ntu.edu.sg/admissions/undergraduate/scholarships",
  "University of Toronto": "https://future.utoronto.ca/finances/scholarships/",
  "University of Melbourne": "https://scholarships.unimelb.edu.au/",
  "IIT Bombay": "https://www.iitb.ac.in/en/education/financial-assistance",
  "IIT Delhi": "https://home.iitd.ac.in/scholarships.php",
  "IIT Madras": "https://acad.iitm.ac.in/scholarships",
  "BITS Pilani": "https://www.bits-pilani.ac.in/scholarships/",
  "VIT Vellore": "https://vit.ac.in/admissions/UG/scholarship",
  "SRM University": "https://www.srmist.edu.in/admission-india/scholarships/",
  "Manipal Institute of Technology": "https://manipal.edu/mit/admission/scholarships.html",
  "Shiv Nadar University": "https://snu.edu.in/admissions/financial-aid/",
  "TU Munich": "https://www.tum.de/en/studies/fees-and-financial-aid",
  "AIIMS Delhi": "https://www.aiims.edu/index.php/en/scholarship",
};

const difficultyColor = (d: string) => {
  switch (d) {
    case "Easy": return "bg-green-100 text-green-700 border-green-200";
    case "Moderate": return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "Hard": return "bg-orange-100 text-orange-700 border-orange-200";
    case "Very Hard": return "bg-red-100 text-red-700 border-red-200";
    default: return "";
  }
};

const SwipeCard = ({ uni, onSwipe }: { uni: University & { matchReason?: string; match: number }; onSwipe: (dir: "left" | "right") => void }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  const scholarshipHref = SCHOLARSHIP_PAGES[uni.name];

  return (
    <motion.div
      className="absolute inset-0"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.18}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        const swipePower = Math.abs(info.offset.x) + Math.abs(info.velocity.x) * 0.35;
        if (info.offset.x > 84 || (info.velocity.x > 420 && swipePower > 220)) onSwipe("right");
        else if (info.offset.x < -84 || (info.velocity.x < -420 && swipePower > 220)) onSwipe("left");
      }}
    >
      <Card className="h-full glass-card overflow-hidden cursor-grab active:cursor-grabbing select-none">
        <div className="h-2 w-full" style={{ background: "var(--gradient-primary)" }} />
        <CardContent className="p-6 flex flex-col h-[calc(100%-0.5rem)]">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-heading text-xl font-bold">{uni.name}</h3>
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-1">
                <MapPin className="h-3.5 w-3.5" />{uni.country}
              </div>
              {uni.matchReason && (
                <p className="label-mono text-[10px] text-primary mt-1.5">{uni.matchReason}</p>
              )}
            </div>
            <Badge className="text-xs bg-primary/10 text-primary border-primary/20">{uni.match}% match</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 flex-1">
            <div className="rounded-lg bg-secondary p-3">
              <p className="text-xs text-muted-foreground mb-1">Program</p>
              <p className="text-sm font-semibold">{uni.degree} in {uni.stream}</p>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <p className="text-xs text-muted-foreground mb-1">Tuition</p>
              <p className="text-sm font-semibold">{uni.tuition}</p>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <p className="text-xs text-muted-foreground mb-1">Acceptance Rate</p>
              <p className="text-sm font-semibold">{uni.acceptanceRate}</p>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <p className="text-xs text-muted-foreground mb-1">Difficulty</p>
              <Badge variant="outline" className={`text-xs ${difficultyColor(uni.difficulty)}`}>{uni.difficulty}</Badge>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <p className="text-xs text-muted-foreground mb-1">QS Ranking</p>
              <p className="text-sm font-semibold">#{uni.ranking}</p>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <p className="text-xs text-muted-foreground mb-1">Hostel</p>
              <p className="text-sm font-semibold">{uni.hostel || "Off-campus"}</p>
            </div>
          </div>

          {scholarshipHref ? (
            <a href={scholarshipHref} target="_blank" rel="noopener noreferrer" className="mt-4">
              <Button variant="outline" size="sm" className="w-full gap-2">
                View Scholarships <ExternalLink className="h-3 w-3" />
              </Button>
            </a>
          ) : (
            <div className="mt-4 text-center text-[11px] text-muted-foreground rounded-lg bg-secondary/40 p-2">
              No official scholarship page found. Check the college website directly.
            </div>
          )}

          <motion.div className="absolute top-6 right-6 bg-green-500 text-white px-4 py-2 rounded-xl font-heading font-bold text-lg rotate-12 border-2 border-green-600" style={{ opacity: likeOpacity }}>
            LIKE ✓
          </motion.div>
          <motion.div className="absolute top-6 left-6 bg-red-500 text-white px-4 py-2 rounded-xl font-heading font-bold text-lg -rotate-12 border-2 border-red-600" style={{ opacity: nopeOpacity }}>
            NOPE ✗
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PERSONALISATION ENGINE
// Every filter is explained below. "Hard filter" = university is completely
// hidden. "Soft score" = university is shown but ranked lower/higher.
// ─────────────────────────────────────────────────────────────────────────────

const computeRecommendations = (profile: any) => {
  if (!profile) return [];

  const countries: string[] = profile.target_countries || [];
  const quiz = (profile.quiz_preferences || {}) as Record<string, string>;

  // ── Grade tier: derive fresh from grades string, fall back to saved field ──
  const tier: string = profile.grade_tier || deriveGradeTier(profile.grades) || "average";
  const userTierRank: number = TIER_RANK[tier] ?? 2;

  // ── Hostel: "critical" in quiz means ABSOLUTE hard filter ─────────────────
  // A college with no hostel field OR hostel === "Limited" is EXCLUDED when
  // the student says hostel is critical. No exceptions.
  const hostelRequired = quiz.hostel_priority === "critical";

  // ── Fees: "critical" in quiz means ABSOLUTE hard filter ───────────────────
  const feesStrict = quiz.fees_priority === "critical";

  // ── Build preference list from 3-preference system ────────────────────────
  const prefs: { pref: StudyPreference; rank: number }[] = [];
  [profile.stream_pref_1, profile.stream_pref_2, profile.stream_pref_3].forEach((v, i) => {
    const p = getPreference(v);
    if (p) prefs.push({ pref: p, rank: i + 1 });
  });

  // Backward compat: if no new prefs but old degree+stream exist
  if (prefs.length === 0) {
    const ldeg = profile.degree_type;
    const lstream = profile.stream;
    if (ldeg && lstream) {
      prefs.push({ pref: { value: "legacy", label: `${ldeg} — ${lstream}`, degree: ldeg, stream: lstream }, rank: 1 });
    }
  }

  if (prefs.length === 0) return [];

  const matchesPref = (u: University, p: StudyPreference): boolean => {
    const sameDeg = u.degree.toLowerCase() === p.degree.toLowerCase();
    if (!sameDeg && !isUndergradEquivalent(u.degree, p.degree)) return false;
    const us = u.stream.toLowerCase();
    const up = u.program.toLowerCase();
    const targets = new Set<string>([p.stream.toLowerCase(), ...(STREAM_SYNONYMS[p.stream.toLowerCase()] || [])]);
    for (const t of targets) {
      if (us.includes(t) || up.includes(t)) return true;
    }
    return false;
  };

  const findMatchingPref = (u: University) =>
    prefs.find(({ pref }) => matchesPref(u, pref));

  const results: (University & { matchReason: string; match: number; _prefRank: number })[] = [];

  for (const u of ALL_UNIS) {
    // ── HARD FILTER: country ─────────────────────────────────────────────────
    if (countries.length > 0 && !countries.includes(u.country)) continue;

    // ── HARD FILTER: stream / degree preference ──────────────────────────────
    const matchedPref = findMatchingPref(u);
    if (!matchedPref) continue;

    // ── HARD FILTER: grade tier gate ─────────────────────────────────────────
    // Rule: a student can only see colleges where their tier is AT MOST 1 step
    // below the college's minimum required tier.
    // Example: "low" tier (rank 1) student → can see "Easy" (min 1) and
    // "Moderate" (min 2) colleges, but NOT "Hard" (min 3) or "Very Hard" (min 4).
    // Example: "average" tier (rank 2) student → can see up to "Hard" (min 3),
    // but NOT "Very Hard" (min 4) like IIT Bombay.
    const minRequired = DIFFICULTY_MIN_TIER[u.difficulty];
    const tierGap = minRequired - userTierRank; // positive = college harder than student
    if (tierGap > 1) continue; // more than 1 step above → hard filtered out

    // ── HARD FILTER: hostel ───────────────────────────────────────────────────
    // If hostel is critical, the college MUST have at least "Average" hostel.
    // "Limited" and missing hostel data both mean NO hostel → excluded.
    if (hostelRequired) {
      if (!u.hostel || u.hostel === "Limited") continue;
    }

    // ── HARD FILTER: fees ─────────────────────────────────────────────────────
    if (feesStrict) {
      const t = u.tuition.toLowerCase();
      // Flag anything above ~₹3L/yr, $25k/yr, £20k/yr etc. as "expensive"
      const isExpensive =
        /\$[3-9]\d,|\$[1-9]\d{2},|£[2-9]\d,|cad \$[4-9]\d|aud \$[4-9]\d|sgd \$[3-9]\d|₹[5-9],\d{2},\d{3}|₹\d\d,\d{2},\d{3}/.test(t);
      if (isExpensive) continue;
    }

    // ── SOFT SCORING ──────────────────────────────────────────────────────────
    let score = 50; // baseline — NOT the hardcoded uni.match number

    // 1. Preference rank bonus (biggest signal — this is their chosen field)
    score += matchedPref.rank === 1 ? 20 : matchedPref.rank === 2 ? 10 : 4;

    // 2. Grade fit — reward realistic matches, penalise reaches
    //    tierGap: negative = student ABOVE college requirement (safety)
    //             0 = perfect match
    //             1 = slight reach (allowed but lower score)
    if (tierGap < 0) score += 8;       // safety school — within student's reach
    else if (tierGap === 0) score += 20; // perfect tier match — highest reward
    else if (tierGap === 1) score += 4;  // slight reach — possible but penalised

    // 3. Hostel quality bonus (only if they care at all)
    if (quiz.hostel_priority === "critical" || quiz.hostel_priority === "important") {
      if (u.hostel === "Excellent") score += 10;
      else if (u.hostel === "Good") score += 6;
      else if (u.hostel === "Average") score += 2;
      // Limited already filtered if critical; gets 0 pts if just "important"
    }

    // 4. Campus type bonus
    if (quiz.campus_type && u.campus === quiz.campus_type) score += 8;

    // 5. City type bonus
    if (quiz.city_type === "metro" && /mumbai|delhi|bangalore|chennai|new york|london|singapore|tokyo|sydney|toronto/i.test(u.city || "")) score += 6;
    if (quiz.city_type === "small" && /pilani|kharagpur|warangal|roorkee|guwahati|manipal|vellore|patiala|tiruchirappalli/i.test(u.city || "")) score += 6;

    // 6. Study intensity match
    if (quiz.study_intensity === "intense" && u.difficulty === "Very Hard") score += 8;
    if (quiz.study_intensity === "balanced" && (u.difficulty === "Hard" || u.difficulty === "Moderate")) score += 6;
    if (quiz.study_intensity === "relaxed" && (u.difficulty === "Easy" || u.difficulty === "Moderate")) score += 7;

    // 7. Career goal — research students benefit from high-ranking universities
    if (quiz.career_goal === "research" && u.ranking <= 100) score += 6;

    // 8. Fees preference soft signal (already hard-filtered if critical)
    if (quiz.fees_priority === "critical" || quiz.fees_priority === "important") {
      const t = u.tuition.toLowerCase();
      const isCheap = /€\d|chf|₹[12],|₹\d\d,\d{3}/.test(t);
      if (isCheap) score += 6;
    }

    const finalScore = Math.min(99, Math.max(35, Math.round(score)));

    const reason = matchedPref.rank === 1
      ? `Pref #1 · ${matchedPref.pref.label}`
      : matchedPref.rank === 2
        ? `Pref #2 · ${matchedPref.pref.label}`
        : `Pref #3 · ${matchedPref.pref.label}`;

    results.push({ ...u, match: finalScore, matchReason: reason, _prefRank: matchedPref.rank });
  }

  // Sort: preference rank first, then personalised score descending
  return results.sort((a, b) => a._prefRank - b._prefRank || b.match - a.match);
};

const DashboardPage = () => {
  const { profile, isProfileComplete } = useProfile();
  const { user } = useAuth();
  const [swiped, setSwiped] = useState<Set<string>>(new Set());
  const [liked, setLiked] = useState<{ name: string; country?: string }[]>([]);

  // ===== Persistent shortlist via Supabase =====
  useEffect(() => {
    if (!user) { setLiked([]); return; }
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("shortlists")
        .select("college_name, country")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (active && data) setLiked(data.map(d => ({ name: d.college_name, country: d.country || undefined })));
    };
    load();
    const channel = supabase
      .channel(`shortlists-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "shortlists", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [user]);

  // Run the personalisation engine whenever profile changes
  const recommendations = useMemo(() => computeRecommendations(profile), [profile]);

  const unswiped = recommendations.filter(u => !swiped.has(u.name));

  const relevantNews = useMemo(() => {
    const recNames = new Set(recommendations.map(r => r.name));
    const relevant = NEWS_ITEMS.filter(n => recNames.has(n.uni));
    return relevant.length > 0 ? relevant : NEWS_ITEMS.slice(0, 6);
  }, [recommendations]);

  const handleSwipe = async (uni: University, dir: "left" | "right") => {
    setSwiped(prev => new Set([...prev, uni.name]));
    if (dir === "right" && user) {
      setLiked(prev => prev.find(l => l.name === uni.name) ? prev : [{ name: uni.name, country: uni.country }, ...prev]);
      await supabase.from("shortlists").upsert(
        { user_id: user.id, college_name: uni.name, country: uni.country },
        { onConflict: "user_id,college_name" }
      );
    }
  };

  const removeLiked = async (name: string) => {
    setLiked(prev => prev.filter(l => l.name !== name));
    if (user) await supabase.from("shortlists").delete().eq("user_id", user.id).eq("college_name", name);
  };

  const profileCountries = profile?.target_countries || [];
  const quizPrefs = ((profile as any)?.quiz_preferences || {}) as Record<string, string>;
  const quizCompleted = Object.values(quizPrefs).filter(Boolean).length >= 5;
  const hasAnyPref = !!((profile as any)?.stream_pref_1) || (!!(profile as any)?.degree_type && !!(profile as any)?.stream);
  const currentTier = (profile as any)?.grade_tier || deriveGradeTier(profile?.grades);

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <p className="label-mono text-muted-foreground mb-2">The Atelier · Your Dashboard</p>
        <h1 className="font-heading text-4xl md:text-5xl font-medium tracking-tight">
          Good to see you{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.
        </h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          {profileCountries.length > 0
            ? `A curated selection across ${profileCountries.join(", ")} — ${recommendations.length} institutions${quizCompleted ? ", refined by your aptitude quiz." : "."}`
            : "A handcrafted shortlist of institutions chosen for who you are, not who the algorithm thinks you should be."}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-2">Sources: QS World Rankings, NIRF, official college websites.</p>
      </div>

      {!hasAnyPref && (
        <Card className="glass-card border-primary/30">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <p className="font-heading font-semibold">Set your three preferences</p>
                <p className="text-sm text-muted-foreground">Pick 1st / 2nd / 3rd choice of degree & stream — that drives every recommendation.</p>
              </div>
            </div>
            <Link to="/profile"><Button size="sm">Open profile</Button></Link>
          </CardContent>
        </Card>
      )}

      {hasAnyPref && !quizCompleted && (
        <Card className="glass-card">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.25} />
              <div>
                <p className="label-mono text-muted-foreground mb-1">Optional · The Aptitude</p>
                <p className="font-heading text-lg">A two-minute conversation about who you are.</p>
                <p className="text-sm text-muted-foreground mt-0.5">Eight questions on budget, hostel, city and career — used to refine your shortlist.</p>
              </div>
            </div>
            <Link to="/quiz"><Button size="sm">Begin the quiz</Button></Link>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/chat">
          <Card className="glass-card hover:border-primary/30 transition-all cursor-pointer group">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-heading font-semibold text-sm">Chat with AI</p>
                <p className="text-xs text-muted-foreground">Get personalised advice</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <Calendar className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="font-heading font-semibold text-sm">Upcoming Deadlines</p>
              <p className="text-xs text-muted-foreground">{recommendations.length} universities tracked</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-heading font-semibold text-sm">Liked Colleges</p>
              <p className="text-xs text-muted-foreground">{liked.length} colleges shortlisted (saved)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two column: Swipe + News */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Swipe section */}
        <div className="lg:col-span-3">
          <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" /> Discover Universities
            <Badge variant="secondary" className="ml-auto text-xs">{unswiped.length} remaining</Badge>
          </h2>
          {recommendations.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="p-8 text-center">
                <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  {!hasAnyPref
                    ? "Pick your 1st, 2nd & 3rd preference in your profile so we can match colleges."
                    : "No colleges fit your strict criteria. Try adding more target countries, picking a 2nd/3rd preference, or softening the 'critical' answers in the quiz."}
                </p>
                {hasAnyPref && (
                  <div className="mt-4 text-xs text-muted-foreground/80 space-y-1 max-w-md mx-auto text-left bg-secondary/40 rounded-lg p-3">
                    <p className="label-mono mb-1">Active filters</p>
                    {(profile as any)?.stream_pref_1 && <p>· 1st: <strong>{getPreference((profile as any).stream_pref_1)?.label}</strong></p>}
                    {(profile as any)?.stream_pref_2 && <p>· 2nd: <strong>{getPreference((profile as any).stream_pref_2)?.label}</strong></p>}
                    {(profile as any)?.stream_pref_3 && <p>· 3rd: <strong>{getPreference((profile as any).stream_pref_3)?.label}</strong></p>}
                    <p>· Countries: <strong>{(profile?.target_countries || []).join(", ") || "Any"}</strong></p>
                    <p>· Grade tier: <strong>{currentTier}</strong></p>
                    {quizPrefs.hostel_priority === "critical" && <p>· Hostel: <strong>required (hard filter)</strong></p>}
                    {quizPrefs.fees_priority === "critical" && <p>· Fees: <strong>budget-strict (hard filter)</strong></p>}
                  </div>
                )}
                <Link to="/profile">
                  <Button className="mt-4" size="sm">{hasAnyPref ? "Adjust your preferences" : "Set preferences"}</Button>
                </Link>
              </CardContent>
            </Card>
          ) : unswiped.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="p-8 text-center">
                <Sparkles className="mx-auto h-12 w-12 text-primary/50 mb-3" />
                <p className="font-heading font-semibold">You've seen all {recommendations.length} recommendations!</p>
                <p className="text-sm text-muted-foreground mt-1">{liked.length} are saved in your shortlist</p>
                <Button className="mt-4" size="sm" onClick={() => setSwiped(new Set())}>
                  Start over
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="relative h-[440px] w-full max-w-sm mx-auto">
                <AnimatePresence>
                  {unswiped.slice(0, 3).map((uni, i) => (
                    <motion.div
                      key={uni.name}
                      className="absolute inset-0"
                      style={{ zIndex: unswiped.length - i }}
                      initial={{ scale: 1 - i * 0.03, y: i * 8 }}
                      animate={{ scale: 1 - i * 0.03, y: i * 8 }}
                    >
                      {i === 0 ? (
                        <SwipeCard uni={uni} onSwipe={(dir) => handleSwipe(uni, dir)} />
                      ) : (
                        <Card className="h-full glass-card opacity-60">
                          <div className="h-2 w-full bg-muted" />
                        </Card>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <div className="flex justify-center gap-6 pt-2">
                <Button variant="outline" size="lg" className="rounded-full h-14 w-14 border-red-200 hover:bg-red-50 hover:border-red-400" onClick={() => unswiped[0] && handleSwipe(unswiped[0], "left")}>
                  <X className="h-6 w-6 text-red-500" />
                </Button>
                <Button variant="outline" size="lg" className="rounded-full h-14 w-14 border-green-200 hover:bg-green-50 hover:border-green-400" onClick={() => unswiped[0] && handleSwipe(unswiped[0], "right")}>
                  <Heart className="h-6 w-6 text-green-500" />
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground">Swipe right to like, left to skip — or use the buttons</p>
            </div>
          )}
        </div>

        {/* News section */}
        <div className="lg:col-span-2">
          <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-accent" /> College News
          </h2>
          <p className="text-[11px] text-muted-foreground/70 mb-2">Each item links to the exact source article.</p>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {relevantNews.map((item, i) => (
              <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="block">
                <Card className="glass-card hover:border-primary/20 transition-all cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 mt-0.5">
                        <Newspaper className="h-4 w-4 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug hover:text-primary transition-colors">{item.title}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{item.tag}</Badge>
                          <span className="text-[11px] text-muted-foreground">{item.date}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground/70 mt-1 flex items-center gap-1">
                          <ExternalLink className="h-2.5 w-2.5" />
                          Source: {item.source}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Liked colleges - persistent */}
      {liked.length > 0 && (
        <div>
          <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-green-500 fill-green-500" /> Your Shortlist ({liked.length})
            <span className="text-xs text-muted-foreground font-normal ml-2">— saved across sessions</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liked.map(({ name }) => {
              const uni = ALL_UNIS.find(u => u.name === name);
              if (!uni) return (
                <Card key={name} className="glass-card">
                  <CardContent className="p-4 flex items-center justify-between">
                    <span className="font-heading text-sm">{name}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeLiked(name)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </CardContent>
                </Card>
              );
              return (
                <Card key={name} className="glass-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-heading font-semibold text-sm">{uni.name}</h3>
                      <Button size="icon" variant="ghost" className="h-6 w-6 -mr-1 -mt-1" onClick={() => removeLiked(name)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{uni.country}</span>
                      <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{uni.tuition}</span>
                      <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />{uni.acceptanceRate}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{uni.deadline}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className={`text-[10px] ${difficultyColor(uni.difficulty)}`}>{uni.difficulty}</Badge>
                      {uni.hostel && <Badge variant="outline" className="text-[10px]">Hostel: {uni.hostel}</Badge>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;