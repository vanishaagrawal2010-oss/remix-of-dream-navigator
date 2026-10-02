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
import { ALL_UNIS, deriveGradeTier, getPreference, type University } from "@/data/universities";
import { computeRecommendations, type Recommendation } from "@/lib/recommend";

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

const googleSearch = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;

const fitColor = (f: string) =>
  f === "Safe" ? "bg-green-100 text-green-700 border-green-200"
  : f === "Stretch" ? "bg-orange-100 text-orange-700 border-orange-200"
  : "bg-blue-100 text-blue-700 border-blue-200";

const SwipeCard = ({ uni, onSwipe }: { uni: Recommendation; onSwipe: (dir: "left" | "right") => void }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  // Links: official site from our data; scholarships page if we know it,
  // otherwise a Google search (which can never be a broken link).
  const siteHref = uni.scholarshipUrl || googleSearch(`${uni.name} official website`);
  const scholarshipHref = SCHOLARSHIP_PAGES[uni.name] || googleSearch(`${uni.name} scholarships for international and indian students`);

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
              <div className="flex flex-wrap gap-1 mt-2">
                {uni.reasons.slice(0, 3).map(r => (
                  <span key={r} className="text-[10px] rounded-full bg-primary/10 text-primary px-2 py-0.5">{r}</span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge className="text-xs bg-primary/10 text-primary border-primary/20">{uni.match}% match</Badge>
              <Badge variant="outline" className={`text-[10px] ${fitColor(uni.fit)}`}>{uni.fit}</Badge>
            </div>
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

          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href={siteHref} target="_blank" rel="noopener noreferrer" onPointerDownCapture={(e) => e.stopPropagation()}>
              <Button variant="outline" size="sm" className="w-full gap-2">
                Website <ExternalLink className="h-3 w-3" />
              </Button>
            </a>
            <a href={scholarshipHref} target="_blank" rel="noopener noreferrer" onPointerDownCapture={(e) => e.stopPropagation()}>
              <Button variant="outline" size="sm" className="w-full gap-2">
                Scholarships <ExternalLink className="h-3 w-3" />
              </Button>
            </a>
          </div>

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
  const recResult = useMemo(() => computeRecommendations(profile), [profile]);
  const recommendations = recResult.items;

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
          {hasAnyPref && recResult.defaultedToIndia && (
            <p className="mb-3 text-xs rounded-lg bg-secondary/60 p-3">
              You have not picked a target country yet, so we are showing colleges in India. <Link to="/profile" className="underline text-primary">Choose your countries</Link> to see others.
            </p>
          )}
          {recResult.missingCountries.length > 0 && (
            <p className="mb-3 text-xs rounded-lg bg-secondary/60 p-3">
              We do not have colleges for {recResult.missingCountries.join(", ")} yet. We are adding them soon.
            </p>
          )}
          {recommendations.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="p-8 text-center">
                <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  {!hasAnyPref
                    ? "Pick your 1st, 2nd & 3rd preference in your profile so we can match colleges."
                    : "We could not find colleges for this combination yet. Try adding another target country or a 2nd/3rd preference."}
                </p>
                {hasAnyPref && (
                  <div className="mt-4 text-xs text-muted-foreground/80 space-y-1 max-w-md mx-auto text-left bg-secondary/40 rounded-lg p-3">
                    <p className="label-mono mb-1">Active filters</p>
                    {(profile as any)?.stream_pref_1 && <p>· 1st: <strong>{getPreference((profile as any).stream_pref_1)?.label}</strong></p>}
                    {(profile as any)?.stream_pref_2 && <p>· 2nd: <strong>{getPreference((profile as any).stream_pref_2)?.label}</strong></p>}
                    {(profile as any)?.stream_pref_3 && <p>· 3rd: <strong>{getPreference((profile as any).stream_pref_3)?.label}</strong></p>}
                    <p>· Countries: <strong>{(profile?.target_countries || []).join(", ") || "Any"}</strong></p>
                    <p>· Grade tier: <strong>{currentTier}</strong></p>
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
              <div className="relative h-[500px] w-full max-w-sm mx-auto">
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
