import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { GraduationCap, MapPin, DollarSign, Calendar, ExternalLink, MessageSquare, Sparkles, BookOpen } from "lucide-react";

type University = {
  name: string;
  country: string;
  program: string;
  deadline: string;
  scholarshipUrl: string;
  match: number;
  tuition: string;
};

const getRecommendations = (profile: ReturnType<typeof useProfile>["profile"]): University[] => {
  if (!profile) return [];
  const countries = profile.target_countries || [];
  const interests = profile.interests || [];

  const allUnis: University[] = [
    { name: "MIT", country: "USA", program: "Computer Science", deadline: "Jan 1, 2026", scholarshipUrl: "https://sfs.mit.edu/", match: 95, tuition: "$57,590" },
    { name: "Stanford University", country: "USA", program: "Engineering", deadline: "Jan 5, 2026", scholarshipUrl: "https://financialaid.stanford.edu/", match: 92, tuition: "$56,169" },
    { name: "University of Oxford", country: "UK", program: "Computer Science", deadline: "Oct 15, 2025", scholarshipUrl: "https://www.ox.ac.uk/admissions/graduate/fees-and-funding/", match: 90, tuition: "£37,510" },
    { name: "University of Cambridge", country: "UK", program: "Engineering", deadline: "Oct 15, 2025", scholarshipUrl: "https://www.cambridgetrust.org/", match: 88, tuition: "£35,517" },
    { name: "University of Toronto", country: "Canada", program: "Computer Science", deadline: "Jan 15, 2026", scholarshipUrl: "https://future.utoronto.ca/finances/scholarships/", match: 85, tuition: "CAD $57,020" },
    { name: "ETH Zurich", country: "Switzerland", program: "Engineering", deadline: "Dec 15, 2025", scholarshipUrl: "https://ethz.ch/students/en/studies/financial.html", match: 87, tuition: "CHF 1,460" },
    { name: "TU Munich", country: "Germany", program: "Engineering", deadline: "Jan 15, 2026", scholarshipUrl: "https://www.tum.de/en/studies/fees-and-financial-aid/", match: 82, tuition: "€146/semester" },
    { name: "University of Melbourne", country: "Australia", program: "Business", deadline: "Oct 31, 2025", scholarshipUrl: "https://scholarships.unimelb.edu.au/", match: 80, tuition: "AUD $46,000" },
    { name: "NUS", country: "Singapore", program: "Business", deadline: "Nov 30, 2025", scholarshipUrl: "https://www.nus.edu.sg/oam/scholarships/", match: 83, tuition: "SGD $37,550" },
    { name: "University of Tokyo", country: "Japan", program: "Sciences", deadline: "Dec 1, 2025", scholarshipUrl: "https://www.u-tokyo.ac.jp/en/prospective-students/scholarships.html", match: 78, tuition: "¥535,800" },
  ];

  return allUnis
    .filter(u => countries.length === 0 || countries.includes(u.country))
    .filter(u => interests.length === 0 || interests.some(i => u.program.toLowerCase().includes(i.toLowerCase())))
    .sort((a, b) => b.match - a.match)
    .slice(0, 6);
};

const DashboardPage = () => {
  const { profile, isProfileComplete } = useProfile();
  const recommendations = getRecommendations(profile);

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="mt-1 text-muted-foreground">Your personalised university recommendations</p>
      </div>

      {!isProfileComplete && (
        <Card className="glass-card border-primary/30 glow-border">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <p className="font-heading font-semibold">Complete your profile</p>
                <p className="text-sm text-muted-foreground">Get better recommendations with a full profile</p>
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <BookOpen className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="font-heading font-semibold text-sm">Profile Strength</p>
              <p className="text-xs text-muted-foreground">{isProfileComplete ? "Complete" : "Incomplete"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* University recommendations */}
      <div>
        <h2 className="font-heading text-xl font-semibold mb-4">Recommended Universities</h2>
        {recommendations.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Complete your profile to see personalised recommendations</p>
              <Link to="/profile"><Button className="mt-4" size="sm">Set Up Profile</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map(uni => (
              <Card key={uni.name} className="glass-card hover:border-primary/20 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="font-heading text-base">{uni.name}</CardTitle>
                    <Badge variant="outline" className="text-xs border-primary/30 text-primary">{uni.match}% match</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />{uni.country}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <BookOpen className="h-3.5 w-3.5" />{uni.program}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" />{uni.tuition}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />Deadline: {uni.deadline}
                    </div>
                  </div>
                  <a href={uni.scholarshipUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="w-full gap-2 mt-2">
                      Scholarships <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
