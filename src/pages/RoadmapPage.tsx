import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Map, Target, BookOpen, Calendar, Users, TrendingUp,
  Lightbulb, ExternalLink, CheckCircle2, Clock, AlertCircle, Sparkles,
} from "lucide-react";

type ScheduleItem = {
  event: string;
  date: string;
  status: "upcoming" | "ongoing" | "completed" | "tentative";
  source_url?: string;
};

type Roadmap = {
  college: string;
  overview: string;
  difficulty: string;
  primary_exam: {
    name: string;
    purpose: string;
    official_url: string;
    subjects: string[];
    pattern: string;
    expected_cutoff: string;
  };
  alternative_exams?: { name: string; purpose: string; official_url: string }[];
  schedule: ScheduleItem[];
  stages: { stage: string; duration: string; tasks: string[]; resources?: { name: string; url: string }[] }[];
  interview_rounds?: { name: string; description: string; tips: string[] }[];
  cutoff_history?: { year: string; category: string; value: string }[];
  key_tips: string[];
  official_sources: { name: string; url: string }[];
};

const POPULAR = ["IIT Bombay", "IIT Delhi", "BITS Pilani", "NIT Trichy", "MIT", "Stanford", "Oxford", "NUS Singapore"];

const statusStyle = (s: ScheduleItem["status"]) => {
  switch (s) {
    case "upcoming": return { icon: Clock, cls: "bg-blue-100 text-blue-700 border-blue-200" };
    case "ongoing": return { icon: AlertCircle, cls: "bg-amber-100 text-amber-700 border-amber-200" };
    case "completed": return { icon: CheckCircle2, cls: "bg-green-100 text-green-700 border-green-200" };
    default: return { icon: Clock, cls: "bg-muted text-muted-foreground border-border" };
  }
};

const RoadmapPage = () => {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [college, setCollege] = useState("");
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);

  const generate = async (target?: string) => {
    const c = (target || college).trim();
    if (!c) {
      toast({ title: "Enter a college", description: "Type a college name first.", variant: "destructive" });
      return;
    }
    setCollege(c);
    setLoading(true);
    setRoadmap(null);
    try {
      const { data, error } = await supabase.functions.invoke("college-roadmap", {
        body: {
          college: c,
          profile: profile ? {
            name: profile.full_name,
            degree_type: (profile as any).degree_type,
            stream: (profile as any).stream,
            grades: profile.grades,
            current_class: (profile as any).current_class,
            target_countries: profile.target_countries,
          } : null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setRoadmap(data.roadmap);
    } catch (e: any) {
      toast({ title: "Failed", description: e.message || "Could not generate roadmap", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Map className="h-5 w-5 text-primary" />
          </div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">Zero to One Roadmap</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Pick any college — get a complete admission guide: entrance exams, cutoffs, real-time schedules, interview rounds & study plan.
        </p>
      </div>

      <Card className="p-4 md:p-6 glass-card">
        <form onSubmit={(e) => { e.preventDefault(); generate(); }} className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="e.g., IIT Bombay, MIT, Oxford..."
            value={college}
            onChange={(e) => setCollege(e.target.value)}
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate Roadmap
          </Button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">Try:</span>
          {POPULAR.map(p => (
            <button
              key={p}
              onClick={() => generate(p)}
              disabled={loading}
              className="text-xs px-2.5 py-1 rounded-full bg-secondary hover:bg-primary/10 hover:text-primary border border-border transition-colors disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
      </Card>

      {loading && (
        <Card className="p-12 flex flex-col items-center gap-3 glass-card">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Building your personalised roadmap... (this may take ~20s)</p>
        </Card>
      )}

      {roadmap && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Overview */}
          <Card className="p-6 glass-card">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h2 className="font-heading text-2xl font-bold">{roadmap.college}</h2>
                <p className="text-muted-foreground text-sm mt-2">{roadmap.overview}</p>
              </div>
              <Badge className="shrink-0">{roadmap.difficulty}</Badge>
            </div>
          </Card>

          {/* Primary Exam */}
          <Card className="p-6 glass-card">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="font-heading text-lg font-bold">Primary Entrance Exam</h3>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-semibold">{roadmap.primary_exam.name}</span>
                {roadmap.primary_exam.official_url && (
                  <a href={roadmap.primary_exam.official_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    Official site <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{roadmap.primary_exam.purpose}</p>
              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Subjects assessed</p>
                  <div className="flex flex-wrap gap-1">
                    {roadmap.primary_exam.subjects.map(s => <Badge key={s} variant="outline">{s}</Badge>)}
                  </div>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Expected cutoff</p>
                  <p className="text-sm font-semibold">{roadmap.primary_exam.expected_cutoff}</p>
                </div>
              </div>
              <div className="rounded-lg bg-secondary/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Exam pattern</p>
                <p className="text-sm">{roadmap.primary_exam.pattern}</p>
              </div>
            </div>
          </Card>

          {/* Schedule - real time */}
          <Card className="p-6 glass-card">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-heading text-lg font-bold">Live Schedule & Important Dates</h3>
            </div>
            <div className="space-y-2">
              {roadmap.schedule.map((s, i) => {
                const { icon: Icon, cls } = statusStyle(s.status);
                return (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors">
                    <div className={`shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg border ${cls}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-sm">{s.event}</p>
                        <Badge variant="outline" className="text-xs">{s.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.date}</p>
                      {s.source_url && (
                        <a href={s.source_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                          Verify on official site <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Stages roadmap */}
          <Card className="p-6 glass-card">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-primary" />
              <h3 className="font-heading text-lg font-bold">Step-by-Step Preparation Plan</h3>
            </div>
            <div className="space-y-4">
              {roadmap.stages.map((st, i) => (
                <div key={i} className="relative pl-6 border-l-2 border-primary/30">
                  <div className="absolute left-[-7px] top-1 h-3 w-3 rounded-full bg-primary" />
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h4 className="font-semibold">{st.stage}</h4>
                    <span className="text-xs text-muted-foreground">· {st.duration}</span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {st.tasks.map((t, j) => (
                      <li key={j} className="text-sm text-muted-foreground flex gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                  {st.resources && st.resources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {st.resources.map((r, j) => (
                        <a key={j} href={r.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1">
                          {r.name} <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Cutoff history */}
          {roadmap.cutoff_history && roadmap.cutoff_history.length > 0 && (
            <Card className="p-6 glass-card">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="font-heading text-lg font-bold">Cutoff History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      <th className="py-2 pr-4">Year</th>
                      <th className="py-2 pr-4">Category</th>
                      <th className="py-2">Cutoff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roadmap.cutoff_history.map((c, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 pr-4 font-medium">{c.year}</td>
                        <td className="py-2 pr-4">{c.category}</td>
                        <td className="py-2 text-muted-foreground">{c.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Interview rounds */}
          {roadmap.interview_rounds && roadmap.interview_rounds.length > 0 && (
            <Card className="p-6 glass-card">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="font-heading text-lg font-bold">Interview & Counselling Rounds</h3>
              </div>
              <div className="space-y-3">
                {roadmap.interview_rounds.map((r, i) => (
                  <div key={i} className="rounded-lg border border-border p-3">
                    <p className="font-semibold text-sm">{r.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                    <ul className="mt-2 space-y-1">
                      {r.tips.map((t, j) => (
                        <li key={j} className="text-xs flex gap-2"><Lightbulb className="h-3 w-3 text-primary shrink-0 mt-0.5" />{t}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Key tips */}
          <Card className="p-6 glass-card">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-5 w-5 text-primary" />
              <h3 className="font-heading text-lg font-bold">Key Tips for You</h3>
            </div>
            <ul className="space-y-2">
              {roadmap.key_tips.map((t, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ul>
          </Card>

          {/* Official sources */}
          <Card className="p-6 glass-card">
            <h3 className="font-heading text-lg font-bold mb-3">Official Sources</h3>
            <div className="flex flex-wrap gap-2">
              {roadmap.official_sources.map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1.5">
                  {s.name} <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RoadmapPage;
