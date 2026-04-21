import { useState, useMemo } from "react";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { GraduationCap, MapPin, DollarSign, Calendar, ExternalLink, MessageSquare, Sparkles, TrendingUp, Heart, X, BarChart3, Newspaper } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { ALL_UNIS, DIFFICULTY_MIN_TIER, TIER_RANK, deriveGradeTier, type University } from "@/data/universities";

type NewsItem = {
  title: string;
  date: string;
  uni: string;
  tag: string;
  url: string;
  source: string;
};

const NEWS_ITEMS: NewsItem[] = [
  { title: "MIT announces new AI research scholarship for 2026", date: "Apr 10, 2026", uni: "MIT", tag: "Scholarship", url: "https://news.mit.edu/", source: "MIT News" },
  { title: "Stanford CS admissions deadline extended by 2 weeks", date: "Apr 8, 2026", uni: "Stanford University", tag: "Deadline", url: "https://news.stanford.edu/", source: "Stanford News" },
  { title: "IIT Bombay opens JEE Advanced 2026 registration", date: "Apr 7, 2026", uni: "IIT Bombay", tag: "Admissions", url: "https://jeeadv.ac.in/", source: "JEE Advanced" },
  { title: "ETH Zurich tuition to remain lowest in Europe for 2026", date: "Apr 5, 2026", uni: "ETH Zurich", tag: "Tuition", url: "https://ethz.ch/en/news.html", source: "ETH News" },
  { title: "VIT Vellore starts phase 2 of VITEEE 2026 counselling", date: "Apr 4, 2026", uni: "VIT Vellore", tag: "Admissions", url: "https://vit.ac.in/admissions", source: "VIT Admissions" },
  { title: "NIT Trichy ranked #1 among NITs in NIRF 2026", date: "Apr 3, 2026", uni: "NIT Trichy", tag: "Rankings", url: "https://www.nirfindia.org/", source: "NIRF India" },
  { title: "University of Toronto launches new Data Science BTech", date: "Apr 3, 2026", uni: "University of Toronto", tag: "Program", url: "https://www.utoronto.ca/news", source: "UofT News" },
  { title: "Carnegie Mellon opens early decision for CS program", date: "Apr 1, 2026", uni: "Carnegie Mellon", tag: "Admissions", url: "https://www.cmu.edu/news/", source: "CMU News" },
  { title: "SRM University introduces 100% scholarship for toppers", date: "Mar 31, 2026", uni: "SRM University", tag: "Scholarship", url: "https://www.srmist.edu.in/admissions", source: "SRM Admissions" },
  { title: "Purdue announces new mechanical engineering lab expansion", date: "Mar 29, 2026", uni: "Purdue University", tag: "Infrastructure", url: "https://www.purdue.edu/newsroom/", source: "Purdue News" },
  { title: "BITS Pilani BITSAT 2026 registration dates announced", date: "Mar 28, 2026", uni: "BITS Pilani", tag: "Admissions", url: "https://www.bitsadmission.com/", source: "BITS Admissions" },
  { title: "AIIMS Delhi NEET-UG 2026 cutoff trends released", date: "Mar 27, 2026", uni: "AIIMS Delhi", tag: "Admissions", url: "https://www.aiims.edu/", source: "AIIMS News" },
  { title: "NLSIU Bangalore CLAT 2026 results expected next week", date: "Mar 27, 2026", uni: "NLSIU Bangalore", tag: "Admissions", url: "https://consortiumofnlus.ac.in/", source: "CLAT Consortium" },
  { title: "Manipal MIT opens applications for BTech lateral entry", date: "Mar 25, 2026", uni: "Manipal Institute of Technology", tag: "Admissions", url: "https://manipal.edu/mit/admissions.html", source: "Manipal Admissions" },
];

const difficultyColor = (d: string) => {
  switch (d) {
    case "Easy": return "bg-green-100 text-green-700 border-green-200";
    case "Moderate": return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "Hard": return "bg-orange-100 text-orange-700 border-orange-200";
    case "Very Hard": return "bg-red-100 text-red-700 border-red-200";
    default: return "";
  }
};

const SwipeCard = ({ uni, onSwipe }: { uni: University; onSwipe: (dir: "left" | "right") => void }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  return (
    <motion.div
      className="absolute inset-0"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.x > 100) onSwipe("right");
        else if (info.offset.x < -100) onSwipe("left");
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
              <p className="text-xs text-muted-foreground mb-1">World Ranking</p>
              <p className="text-sm font-semibold">#{uni.ranking}</p>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <p className="text-xs text-muted-foreground mb-1">Deadline</p>
              <p className="text-sm font-semibold">{uni.deadline}</p>
            </div>
          </div>

          <a href={uni.scholarshipUrl} target="_blank" rel="noopener noreferrer" className="mt-4">
            <Button variant="outline" size="sm" className="w-full gap-2">
              View Scholarships <ExternalLink className="h-3 w-3" />
            </Button>
          </a>

          {/* Swipe indicators */}
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

const DashboardPage = () => {
  const { profile, isProfileComplete } = useProfile();
  const [swiped, setSwiped] = useState<Set<string>>(new Set());
  const [liked, setLiked] = useState<string[]>([]);

  const recommendations = useMemo(() => {
    if (!profile) return [];
    const countries = profile.target_countries || [];
    const interests = profile.interests || [];
    const degreeType = (profile as any).degree_type || "";
    const stream = (profile as any).stream || "";
    const quiz = ((profile as any).quiz_preferences || {}) as Record<string, string>;
    const tier = (profile as any).grade_tier || deriveGradeTier(profile.grades);
    const userTierRank = TIER_RANK[tier] ?? 2;

    // Undergrad bachelor's degrees are equivalent across countries (BS = BTech = BE)
    const undergradEquivalents = new Set(["bs", "btech", "be", "b.tech", "b.e"]);
    const isUndergradEquiv = (a: string, b: string) =>
      undergradEquivalents.has(a.toLowerCase()) && undergradEquivalents.has(b.toLowerCase());

    // Stream synonyms (e.g. Data Science → Computer Science)
    const streamSynonyms: Record<string, string[]> = {
      "data science": ["computer science", "ai/ml", "information technology"],
      "ai/ml": ["computer science", "data science"],
      "information technology": ["computer science"],
      "electronics": ["electrical", "computer science"],
      "aerospace": ["mechanical"],
      "biotechnology": ["chemical"],
      "finance": ["business", "general"],
      "marketing": ["business", "general"],
    };
    const streamMatchSet = new Set<string>([stream.toLowerCase()]);
    (streamSynonyms[stream.toLowerCase()] || []).forEach(s => streamMatchSet.add(s));

    const matchesStreamFn = (u: typeof ALL_UNIS[number]) => {
      if (!stream) return false; // STRICT: no stream → no recs (user must pick one)
      const us = u.stream.toLowerCase();
      const up = u.program.toLowerCase();
      for (const s of streamMatchSet) {
        if (us.includes(s) || up.includes(s)) return true;
      }
      return false;
    };

    const scoreFn = (u: typeof ALL_UNIS[number]) => {
      let score = u.match;
      const tierGap = userTierRank - DIFFICULTY_MIN_TIER[u.difficulty];
      if (tierGap === 0) score += 10;
      else if (tierGap === 1) score += 5;
      else if (tierGap < 0) score -= Math.abs(tierGap) * 15; // big penalty for unreachable

      // QUIZ — high weight (this is the main personalisation signal)
      if (quiz.campus_type && u.campus === quiz.campus_type) score += 8;
      if (quiz.hostel_priority === "critical") {
        if (u.hostel === "Excellent") score += 10;
        else if (u.hostel === "Limited") score -= 12;
      }
      if (quiz.city_type === "metro" && /mumbai|delhi|bangalore|chennai|new york|london|singapore|tokyo|sydney|toronto|hong kong/i.test(u.city || "")) score += 6;
      if (quiz.city_type === "small" && /pilani|kharagpur|warangal|roorkee|guwahati|manipal|vellore|patiala|tiruchirappalli/i.test(u.city || "")) score += 6;
      if (quiz.study_intensity === "intense" && u.difficulty === "Very Hard") score += 8;
      if (quiz.study_intensity === "relaxed" && (u.difficulty === "Easy" || u.difficulty === "Moderate")) score += 7;
      if (quiz.career_goal === "research" && u.ranking <= 100) score += 6;
      if (quiz.career_goal === "industry" && /computer science|finance|business/i.test(u.stream)) score += 5;
      if (quiz.fees_priority === "critical") {
        const t = u.tuition.toLowerCase();
        const isExpensive = /\$[3-9]\d|\$[1-9]\d{2}|£[2-9]\d|cad \$[4-9]\d|aud \$[4-9]\d|sgd \$[3-9]\d/.test(t);
        if (isExpensive) score -= 18;
        const isCheap = /€\d|chf|₹[12],|₹\d\d,\d{3}/.test(t);
        if (isCheap) score += 8;
      }
      return Math.min(99, Math.max(35, Math.round(score)));
    };

    // STRICT: country + degree + stream are HARD filters (no fallback that loosens them)
    // Quiz hard-filters: hostel-critical removes "Limited" hostels; fees-critical removes very expensive
    const hostelCritical = quiz.hostel_priority === "critical";
    const feesCritical = quiz.fees_priority === "critical";

    const matches = ALL_UNIS.filter(u => {
      if (countries.length > 0 && !countries.includes(u.country)) return false;
      if (degreeType) {
        const same = u.degree.toLowerCase() === degreeType.toLowerCase();
        if (!same && !isUndergradEquiv(u.degree, degreeType)) return false;
      }
      if (!matchesStreamFn(u)) return false;
      // Quiz HARD filters
      if (hostelCritical && (u.hostel === "Limited" || !u.hostel)) return false;
      if (feesCritical) {
        const t = u.tuition.toLowerCase();
        const isExpensive = /\$[3-9]\d|\$[1-9]\d{2}|£[2-9]\d|cad \$[4-9]\d|aud \$[4-9]\d|sgd \$[3-9]\d|₹[5-9],\d{2},\d{3}|₹\d\d,\d{2},\d{3}/.test(t);
        if (isExpensive) return false;
      }
      // Tier gate: only block colleges that are clearly out of reach.
      // Low-tier students still see Hard colleges as stretch picks (only Very Hard is hidden).
      // Higher tiers allow a 1-tier stretch above their level.
      const gap = DIFFICULTY_MIN_TIER[u.difficulty] - userTierRank;
      if (userTierRank <= 1) {
        if (DIFFICULTY_MIN_TIER[u.difficulty] >= 4) return false; // hide Very Hard for low
      } else if (gap > 1) {
        return false;
      }
      return true;
    });

    return matches.map(u => ({ ...u, match: scoreFn(u) })).sort((a, b) => b.match - a.match);
  }, [profile]);

  const unswiped = recommendations.filter(u => !swiped.has(u.name));

  const relevantNews = useMemo(() => {
    const recNames = new Set(recommendations.map(r => r.name));
    const relevant = NEWS_ITEMS.filter(n => recNames.has(n.uni));
    return relevant.length > 0 ? relevant : NEWS_ITEMS.slice(0, 6);
  }, [recommendations]);

  const handleSwipe = (uni: University, dir: "left" | "right") => {
    setSwiped(prev => new Set([...prev, uni.name]));
    if (dir === "right") setLiked(prev => [...prev, uni.name]);
  };

  const profileCountries = profile?.target_countries || [];
  const quizPrefs = ((profile as any)?.quiz_preferences || {}) as Record<string, string>;
  // Tolerant: completed if there are at least a few meaningful answers
  const quizCompleted = Object.values(quizPrefs).filter(Boolean).length >= 5;

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
      </div>

      {!isProfileComplete && (
        <Card className="glass-card border-primary/30">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <p className="font-heading font-semibold">Complete your profile</p>
                <p className="text-sm text-muted-foreground">Select your country preference, degree type, and stream to get accurate recommendations</p>
              </div>
            </div>
            <Link to="/profile"><Button size="sm">Complete Profile</Button></Link>
          </CardContent>
        </Card>
      )}

      {isProfileComplete && !quizCompleted && (
        <Card className="glass-card">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.25} />
              <div>
                <p className="label-mono text-muted-foreground mb-1">Step 02 · The Aptitude</p>
                <p className="font-heading text-lg">A two-minute conversation about who you are.</p>
                <p className="text-sm text-muted-foreground mt-0.5">Eight questions on budget, hostel, city and career — used to refine every recommendation we make.</p>
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
              <p className="text-xs text-muted-foreground">{liked.length} colleges shortlisted</p>
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
                  {!isProfileComplete
                    ? "Complete your profile so we can match you with the right colleges"
                    : !((profile as any)?.stream) || !((profile as any)?.degree_type)
                      ? "Pick your degree type and stream in your profile so we can recommend matching colleges"
                      : quizCompleted
                        ? "No colleges fit your strict criteria. Try adding more target countries, broadening your stream, or softening the 'critical' answers in the quiz."
                        : "Take the aptitude quiz to unlock personalised recommendations"}
                </p>
                {isProfileComplete && (profile as any)?.stream && (profile as any)?.degree_type && (
                  <div className="mt-4 text-xs text-muted-foreground/80 space-y-1 max-w-md mx-auto text-left bg-secondary/40 rounded-lg p-3">
                    <p className="label-mono mb-1">Active filters</p>
                    <p>· Degree: <strong>{(profile as any).degree_type}</strong> · Stream: <strong>{(profile as any).stream}</strong></p>
                    <p>· Countries: <strong>{(profile?.target_countries || []).join(", ") || "Any"}</strong></p>
                    <p>· Grade tier: <strong>{(profile as any).grade_tier || "average"}</strong></p>
                    {quizPrefs.hostel_priority === "critical" && <p>· Hostel: <strong>required (in-house)</strong></p>}
                    {quizPrefs.fees_priority === "critical" && <p>· Fees: <strong>budget-strict (no expensive colleges)</strong></p>}
                  </div>
                )}
                <Link to={!isProfileComplete || !((profile as any)?.stream) || !((profile as any)?.degree_type) ? "/profile" : quizCompleted ? "/profile" : "/quiz"}>
                  <Button className="mt-4" size="sm">
                    {!isProfileComplete || !((profile as any)?.stream) || !((profile as any)?.degree_type)
                      ? "Refine your profile"
                      : quizCompleted ? "Adjust your profile" : "Begin the aptitude quiz"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : unswiped.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="p-8 text-center">
                <Sparkles className="mx-auto h-12 w-12 text-primary/50 mb-3" />
                <p className="font-heading font-semibold">You've seen all {recommendations.length} recommendations!</p>
                <p className="text-sm text-muted-foreground mt-1">You liked {liked.length} universities</p>
                <Button className="mt-4" size="sm" onClick={() => { setSwiped(new Set()); setLiked([]); }}>
                  Start Over
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="relative h-[420px] w-full max-w-sm mx-auto">
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
                          {item.source}
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

      {/* Liked colleges */}
      {liked.length > 0 && (
        <div>
          <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-green-500 fill-green-500" /> Your Shortlist ({liked.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liked.map(name => {
              const uni = ALL_UNIS.find(u => u.name === name);
              if (!uni) return null;
              return (
                <Card key={name} className="glass-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-heading font-semibold text-sm">{uni.name}</h3>
                      <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">{uni.match}%</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{uni.country}</span>
                      <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{uni.tuition}</span>
                      <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />{uni.acceptanceRate}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{uni.deadline}</span>
                    </div>
                    <Badge variant="outline" className={`text-[10px] mt-2 ${difficultyColor(uni.difficulty)}`}>{uni.difficulty}</Badge>
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
