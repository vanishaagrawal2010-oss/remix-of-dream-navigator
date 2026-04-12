import { useState, useMemo } from "react";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { GraduationCap, MapPin, DollarSign, Calendar, ExternalLink, MessageSquare, Sparkles, TrendingUp, Heart, X, BarChart3, Newspaper } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";

type University = {
  name: string;
  country: string;
  program: string;
  degree: string;
  stream: string;
  deadline: string;
  scholarshipUrl: string;
  match: number;
  tuition: string;
  acceptanceRate: string;
  difficulty: "Easy" | "Moderate" | "Hard" | "Very Hard";
  ranking: number;
};

const ALL_UNIS: University[] = [
  // === INDIA ===
  { name: "IIT Bombay", country: "India", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Jun 15, 2026", scholarshipUrl: "https://www.iitb.ac.in/", match: 95, tuition: "₹2,00,000/yr", acceptanceRate: "2%", difficulty: "Very Hard", ranking: 149 },
  { name: "IIT Delhi", country: "India", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Jun 15, 2026", scholarshipUrl: "https://home.iitd.ac.in/", match: 93, tuition: "₹2,00,000/yr", acceptanceRate: "1.5%", difficulty: "Very Hard", ranking: 150 },
  { name: "IIT Madras", country: "India", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Jun 15, 2026", scholarshipUrl: "https://www.iitm.ac.in/", match: 92, tuition: "₹2,00,000/yr", acceptanceRate: "2%", difficulty: "Very Hard", ranking: 227 },
  { name: "IIT Kanpur", country: "India", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Jun 15, 2026", scholarshipUrl: "https://www.iitk.ac.in/", match: 90, tuition: "₹2,00,000/yr", acceptanceRate: "2.5%", difficulty: "Very Hard", ranking: 278 },
  { name: "BITS Pilani", country: "India", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Jul 1, 2026", scholarshipUrl: "https://www.bits-pilani.ac.in/", match: 87, tuition: "₹5,00,000/yr", acceptanceRate: "5%", difficulty: "Hard", ranking: 450 },
  { name: "NIT Trichy", country: "India", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Jun 20, 2026", scholarshipUrl: "https://www.nitt.edu/", match: 82, tuition: "₹1,50,000/yr", acceptanceRate: "8%", difficulty: "Hard", ranking: 600 },
  { name: "NIT Warangal", country: "India", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Jun 20, 2026", scholarshipUrl: "https://www.nitw.ac.in/", match: 80, tuition: "₹1,50,000/yr", acceptanceRate: "10%", difficulty: "Hard", ranking: 650 },
  { name: "VIT Vellore", country: "India", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Apr 30, 2026", scholarshipUrl: "https://vit.ac.in/", match: 78, tuition: "₹3,50,000/yr", acceptanceRate: "30%", difficulty: "Moderate", ranking: 800 },
  { name: "SRM University", country: "India", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "May 15, 2026", scholarshipUrl: "https://www.srmist.edu.in/", match: 75, tuition: "₹3,00,000/yr", acceptanceRate: "45%", difficulty: "Moderate", ranking: 900 },
  { name: "Manipal Institute of Technology", country: "India", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "May 1, 2026", scholarshipUrl: "https://manipal.edu/mit.html", match: 76, tuition: "₹4,00,000/yr", acceptanceRate: "35%", difficulty: "Moderate", ranking: 850 },
  { name: "Thapar University", country: "India", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "May 20, 2026", scholarshipUrl: "https://www.thapar.edu/", match: 73, tuition: "₹2,80,000/yr", acceptanceRate: "40%", difficulty: "Moderate", ranking: 950 },
  { name: "Amity University", country: "India", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Jun 30, 2026", scholarshipUrl: "https://www.amity.edu/", match: 65, tuition: "₹3,00,000/yr", acceptanceRate: "70%", difficulty: "Easy", ranking: 1200 },
  { name: "Lovely Professional University", country: "India", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Jul 15, 2026", scholarshipUrl: "https://www.lpu.in/", match: 62, tuition: "₹2,50,000/yr", acceptanceRate: "75%", difficulty: "Easy", ranking: 1400 },
  { name: "Chandigarh University", country: "India", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Jul 10, 2026", scholarshipUrl: "https://www.cuchd.in/", match: 64, tuition: "₹2,20,000/yr", acceptanceRate: "65%", difficulty: "Easy", ranking: 1100 },
  { name: "Shiv Nadar University", country: "India", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "May 31, 2026", scholarshipUrl: "https://snu.edu.in/", match: 77, tuition: "₹5,50,000/yr", acceptanceRate: "25%", difficulty: "Moderate", ranking: 700 },
  { name: "IIIT Hyderabad", country: "India", program: "Computer Science", degree: "BTech", stream: "Computer Science", deadline: "Jun 15, 2026", scholarshipUrl: "https://www.iiit.ac.in/", match: 85, tuition: "₹3,00,000/yr", acceptanceRate: "4%", difficulty: "Hard", ranking: 500 },

  // === USA ===
  { name: "MIT", country: "USA", program: "Computer Science", degree: "BTech", stream: "Computer Science", deadline: "Jan 1, 2026", scholarshipUrl: "https://sfs.mit.edu/", match: 95, tuition: "$57,590/yr", acceptanceRate: "3.9%", difficulty: "Very Hard", ranking: 1 },
  { name: "Stanford University", country: "USA", program: "Computer Science", degree: "MS", stream: "Computer Science", deadline: "Jan 5, 2026", scholarshipUrl: "https://financialaid.stanford.edu/", match: 92, tuition: "$56,169/yr", acceptanceRate: "4.3%", difficulty: "Very Hard", ranking: 3 },
  { name: "Carnegie Mellon", country: "USA", program: "Computer Science", degree: "BTech", stream: "Computer Science", deadline: "Jan 2, 2026", scholarshipUrl: "https://www.cmu.edu/sfs/", match: 90, tuition: "$58,924/yr", acceptanceRate: "13.5%", difficulty: "Hard", ranking: 5 },
  { name: "Georgia Tech", country: "USA", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Feb 1, 2026", scholarshipUrl: "https://finaid.gatech.edu/", match: 86, tuition: "$33,020/yr", acceptanceRate: "17%", difficulty: "Hard", ranking: 12 },
  { name: "Purdue University", country: "USA", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Feb 1, 2026", scholarshipUrl: "https://www.purdue.edu/financialaid/", match: 80, tuition: "$31,104/yr", acceptanceRate: "53%", difficulty: "Moderate", ranking: 43 },
  { name: "Arizona State University", country: "USA", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Mar 1, 2026", scholarshipUrl: "https://students.asu.edu/scholarships", match: 72, tuition: "$29,000/yr", acceptanceRate: "88%", difficulty: "Easy", ranking: 185 },
  { name: "University of Illinois", country: "USA", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Jan 15, 2026", scholarshipUrl: "https://osfa.illinois.edu/", match: 84, tuition: "$34,316/yr", acceptanceRate: "45%", difficulty: "Moderate", ranking: 33 },

  // === UK ===
  { name: "University of Oxford", country: "UK", program: "Engineering", degree: "BS", stream: "Mechanical", deadline: "Oct 15, 2025", scholarshipUrl: "https://www.ox.ac.uk/", match: 88, tuition: "£37,510/yr", acceptanceRate: "15.4%", difficulty: "Hard", ranking: 4 },
  { name: "University of Cambridge", country: "UK", program: "Engineering", degree: "BS", stream: "Mechanical", deadline: "Oct 15, 2025", scholarshipUrl: "https://www.cambridgetrust.org/", match: 87, tuition: "£35,517/yr", acceptanceRate: "21%", difficulty: "Hard", ranking: 2 },
  { name: "Imperial College London", country: "UK", program: "Engineering", degree: "BS", stream: "Mechanical", deadline: "Jan 15, 2026", scholarshipUrl: "https://www.imperial.ac.uk/", match: 85, tuition: "£35,100/yr", acceptanceRate: "14%", difficulty: "Hard", ranking: 6 },
  { name: "University of Manchester", country: "UK", program: "Engineering", degree: "BS", stream: "Mechanical", deadline: "Jan 25, 2026", scholarshipUrl: "https://www.manchester.ac.uk/", match: 78, tuition: "£27,000/yr", acceptanceRate: "55%", difficulty: "Moderate", ranking: 34 },
  { name: "University of Leeds", country: "UK", program: "Engineering", degree: "BS", stream: "Mechanical", deadline: "Jan 25, 2026", scholarshipUrl: "https://www.leeds.ac.uk/", match: 73, tuition: "£25,750/yr", acceptanceRate: "72%", difficulty: "Moderate", ranking: 75 },

  // === Canada ===
  { name: "University of Toronto", country: "Canada", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Jan 15, 2026", scholarshipUrl: "https://future.utoronto.ca/", match: 85, tuition: "CAD $57,020/yr", acceptanceRate: "43%", difficulty: "Moderate", ranking: 18 },
  { name: "University of Waterloo", country: "Canada", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Feb 1, 2026", scholarshipUrl: "https://uwaterloo.ca/", match: 83, tuition: "CAD $52,000/yr", acceptanceRate: "52%", difficulty: "Moderate", ranking: 112 },
  { name: "University of British Columbia", country: "Canada", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Jan 15, 2026", scholarshipUrl: "https://www.ubc.ca/", match: 81, tuition: "CAD $44,091/yr", acceptanceRate: "46%", difficulty: "Moderate", ranking: 35 },

  // === Germany ===
  { name: "TU Munich", country: "Germany", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Jan 15, 2026", scholarshipUrl: "https://www.tum.de/", match: 82, tuition: "€146/semester", acceptanceRate: "8%", difficulty: "Hard", ranking: 30 },
  { name: "RWTH Aachen", country: "Germany", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Mar 1, 2026", scholarshipUrl: "https://www.rwth-aachen.de/", match: 79, tuition: "€300/semester", acceptanceRate: "30%", difficulty: "Moderate", ranking: 87 },

  // === Others ===
  { name: "ETH Zurich", country: "Switzerland", program: "Engineering", degree: "MS", stream: "Computer Science", deadline: "Dec 15, 2025", scholarshipUrl: "https://ethz.ch/", match: 89, tuition: "CHF 1,460/yr", acceptanceRate: "27%", difficulty: "Hard", ranking: 7 },
  { name: "NUS", country: "Singapore", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Nov 30, 2025", scholarshipUrl: "https://www.nus.edu.sg/", match: 83, tuition: "SGD $37,550/yr", acceptanceRate: "25%", difficulty: "Moderate", ranking: 8 },
  { name: "University of Melbourne", country: "Australia", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Oct 31, 2025", scholarshipUrl: "https://scholarships.unimelb.edu.au/", match: 80, tuition: "AUD $46,000/yr", acceptanceRate: "35%", difficulty: "Moderate", ranking: 14 },
  { name: "University of Tokyo", country: "Japan", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Dec 1, 2025", scholarshipUrl: "https://www.u-tokyo.ac.jp/en/", match: 78, tuition: "¥535,800/yr", acceptanceRate: "34%", difficulty: "Hard", ranking: 28 },
];

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
  { title: "Cambridge introduces flexible entry for engineering", date: "Mar 28, 2026", uni: "University of Cambridge", tag: "Admissions", url: "https://www.cam.ac.uk/news", source: "Cambridge News" },
  { title: "Georgia Tech mechanical engineering ranked #2 in US", date: "Mar 26, 2026", uni: "Georgia Tech", tag: "Rankings", url: "https://news.gatech.edu/", source: "GT News" },
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

    return ALL_UNIS
      .filter(u => {
        // Country filter: must match if user specified countries
        if (countries.length > 0 && !countries.includes(u.country)) return false;
        return true;
      })
      .filter(u => {
        // Stream-specific matching
        if (!degreeType && !stream && interests.length === 0) return true;
        
        const matchesDegree = !degreeType || u.degree.toLowerCase() === degreeType.toLowerCase();
        const matchesStream = !stream || u.stream.toLowerCase().includes(stream.toLowerCase());
        const matchesInterest = interests.length === 0 || interests.some(i => 
          u.program.toLowerCase().includes(i.toLowerCase()) || 
          u.stream.toLowerCase().includes(i.toLowerCase())
        );
        
        // Must match degree if specified, AND (stream or interest)
        if (degreeType && !matchesDegree) return false;
        if (stream && !matchesStream && !matchesInterest) return false;
        if (!stream && interests.length > 0 && !matchesInterest) return false;
        
        return true;
      })
      .sort((a, b) => b.match - a.match);
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

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="mt-1 text-muted-foreground">
          {profileCountries.length > 0
            ? `Showing colleges in ${profileCountries.join(", ")} · ${recommendations.length} matches`
            : "Your personalised university recommendations"}
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
                <p className="text-muted-foreground">Complete your profile to see personalised recommendations</p>
                <p className="text-xs text-muted-foreground mt-1">Tell us your target countries, degree type, and stream</p>
                <Link to="/profile"><Button className="mt-4" size="sm">Set Up Profile</Button></Link>
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
