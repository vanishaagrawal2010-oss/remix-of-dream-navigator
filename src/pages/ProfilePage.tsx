import { useState, useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Loader2, X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const COUNTRY_OPTIONS = ["USA", "UK", "Canada", "Australia", "Germany", "Netherlands", "Singapore", "Japan", "France", "Switzerland"];
const INTEREST_OPTIONS = ["Computer Science", "Engineering", "Business", "Medicine", "Law", "Arts", "Sciences", "Mathematics", "Psychology", "Economics"];

const ProfilePage = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState({
    full_name: "",
    school: "",
    grades: "",
    budget: "",
    interests: [] as string[],
    target_countries: [] as string[],
    extracurriculars: [] as string[],
  });
  const [newExtra, setNewExtra] = useState("");

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        school: profile.school || "",
        grades: profile.grades || "",
        budget: profile.budget || "",
        interests: profile.interests || [],
        target_countries: profile.target_countries || [],
        extracurriculars: profile.extracurriculars || [],
      });
    }
  }, [profile]);

  if (authLoading || profileLoading) return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const toggleItem = (key: "interests" | "target_countries", item: string) => {
    setForm(prev => ({
      ...prev,
      [key]: prev[key].includes(item) ? prev[key].filter(i => i !== item) : [...prev[key], item],
    }));
  };

  const addExtra = () => {
    if (newExtra.trim()) {
      setForm(prev => ({ ...prev, extracurriculars: [...prev.extracurriculars, newExtra.trim()] }));
      setNewExtra("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await updateProfile(form) || {};
    if (error) {
      toast({ title: "Error", description: "Failed to save profile", variant: "destructive" });
    } else {
      toast({ title: "Profile saved!" });
      navigate("/dashboard");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 glow-border">
            <GraduationCap className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-heading text-3xl font-bold gradient-text">Complete Your Profile</h1>
          <p className="mt-2 text-muted-foreground">Help us personalise your university recommendations</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="glass-card">
            <CardHeader><CardTitle className="font-heading text-lg">Basic Info</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} required className="bg-muted/50 border-border/50" />
              </div>
              <div>
                <Label>School / University</Label>
                <Input value={form.school} onChange={e => setForm(p => ({ ...p, school: e.target.value }))} required className="bg-muted/50 border-border/50" />
              </div>
              <div>
                <Label>Grades (e.g. GPA 3.8, 95%, A-levels AAA)</Label>
                <Input value={form.grades} onChange={e => setForm(p => ({ ...p, grades: e.target.value }))} required className="bg-muted/50 border-border/50" />
              </div>
              <div>
                <Label>Budget (annual tuition + living)</Label>
                <Input value={form.budget} onChange={e => setForm(p => ({ ...p, budget: e.target.value }))} placeholder="e.g. $30,000/year" className="bg-muted/50 border-border/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader><CardTitle className="font-heading text-lg">Interests</CardTitle><CardDescription>Select your academic interests</CardDescription></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map(item => (
                  <Badge
                    key={item}
                    variant={form.interests.includes(item) ? "default" : "outline"}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => toggleItem("interests", item)}
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader><CardTitle className="font-heading text-lg">Target Countries</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {COUNTRY_OPTIONS.map(item => (
                  <Badge
                    key={item}
                    variant={form.target_countries.includes(item) ? "default" : "outline"}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => toggleItem("target_countries", item)}
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader><CardTitle className="font-heading text-lg">Extracurriculars</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input value={newExtra} onChange={e => setNewExtra(e.target.value)} placeholder="e.g. Debate Club President" className="bg-muted/50 border-border/50" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addExtra())} />
                <Button type="button" size="icon" variant="outline" onClick={addExtra}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.extracurriculars.map((item, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {item}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setForm(p => ({ ...p, extracurriculars: p.extracurriculars.filter((_, j) => j !== i) }))} />
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full font-heading font-semibold text-base py-6" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save & Continue
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
