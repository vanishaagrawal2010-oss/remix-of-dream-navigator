import { useState, useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Loader2, X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { STUDY_PREFERENCES, deriveGradeTier } from "@/data/universities";

const COUNTRY_OPTIONS = ["USA", "UK", "Canada", "Australia", "Germany", "Netherlands", "Singapore", "Japan", "France", "Switzerland", "India"];
const CLASS_OPTIONS = ["Class 9", "Class 10", "Class 11", "Class 12", "Gap Year", "1st Year UG", "2nd Year UG", "3rd Year UG", "Final Year UG", "Postgrad"];

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
    current_class: "",
    stream_pref_1: "",
    stream_pref_2: "",
    stream_pref_3: "",
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
        current_class: (profile as any).current_class || "",
        stream_pref_1: (profile as any).stream_pref_1 || "",
        stream_pref_2: (profile as any).stream_pref_2 || "",
        stream_pref_3: (profile as any).stream_pref_3 || "",
        target_countries: profile.target_countries || [],
        extracurriculars: profile.extracurriculars || [],
      });
    }
  }, [profile]);

  if (authLoading || profileLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const toggleCountry = (item: string) => {
    setForm(prev => ({
      ...prev,
      target_countries: prev.target_countries.includes(item)
        ? prev.target_countries.filter(i => i !== item)
        : [...prev.target_countries, item],
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
    // Mirror 1st preference into legacy degree/stream so existing logic keeps working
    const p1 = STUDY_PREFERENCES.find(p => p.value === form.stream_pref_1);
    const payload: any = {
      ...form,
      degree_type: p1?.degree || null,
      stream: p1?.stream || null,
      grade_tier: deriveGradeTier(form.grades),
    };
    const { error } = await updateProfile(payload) || {};
    if (error) {
      toast({ title: "Error", description: "Failed to save profile", variant: "destructive" });
    } else {
      toast({ title: "Profile saved" });
      navigate("/dashboard");
    }
    setSaving(false);
  };

  const usedPrefs = new Set([form.stream_pref_1, form.stream_pref_2, form.stream_pref_3].filter(Boolean));
  const PrefSelect = ({ value, onChange, exclude, placeholder }: { value: string; onChange: (v: string) => void; exclude: string[]; placeholder: string }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {STUDY_PREFERENCES.filter(p => !exclude.includes(p.value) || p.value === value).map(p => (
          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <GraduationCap className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-heading text-3xl font-bold gradient-text">Your profile</h1>
          <p className="mt-2 text-muted-foreground">Edits save instantly across recommendations & roadmap.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="glass-card">
            <CardHeader><CardTitle className="font-heading text-lg">Basic info</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Full name</Label>
                <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} required />
              </div>
              <div>
                <Label>School / college</Label>
                <Input value={form.school} onChange={e => setForm(p => ({ ...p, school: e.target.value }))} required />
              </div>
              <div>
                <Label>Grades (e.g. GPA 3.8, 95%, AAA)</Label>
                <Input value={form.grades} onChange={e => setForm(p => ({ ...p, grades: e.target.value }))} required />
              </div>
              <div>
                <Label>Annual budget (tuition + living)</Label>
                <Input value={form.budget} onChange={e => setForm(p => ({ ...p, budget: e.target.value }))} placeholder="e.g. $30,000/year" />
              </div>
              <div>
                <Label>Current class / year</Label>
                <Select value={form.current_class} onValueChange={v => setForm(p => ({ ...p, current_class: v }))}>
                  <SelectTrigger><SelectValue placeholder="e.g. Class 11" /></SelectTrigger>
                  <SelectContent>
                    {CLASS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Used to compute realistic prep timeline & target attempt year.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Three preferences</CardTitle>
              <CardDescription>What do you want to study? Pick a primary, plus optional 2nd and 3rd choices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="label-mono text-xs">1st preference</Label>
                <PrefSelect value={form.stream_pref_1} onChange={v => setForm(p => ({ ...p, stream_pref_1: v }))} exclude={[form.stream_pref_2, form.stream_pref_3].filter(Boolean)} placeholder="Select your top choice" />
              </div>
              <div>
                <Label className="label-mono text-xs">2nd preference</Label>
                <PrefSelect value={form.stream_pref_2} onChange={v => setForm(p => ({ ...p, stream_pref_2: v }))} exclude={[form.stream_pref_1, form.stream_pref_3].filter(Boolean)} placeholder="Optional" />
              </div>
              <div>
                <Label className="label-mono text-xs">3rd preference</Label>
                <PrefSelect value={form.stream_pref_3} onChange={v => setForm(p => ({ ...p, stream_pref_3: v }))} exclude={[form.stream_pref_1, form.stream_pref_2].filter(Boolean)} placeholder="Optional" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader><CardTitle className="font-heading text-lg">Target countries</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {COUNTRY_OPTIONS.map(item => (
                  <Badge
                    key={item}
                    variant={form.target_countries.includes(item) ? "default" : "outline"}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => toggleCountry(item)}
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
                <Input value={newExtra} onChange={e => setNewExtra(e.target.value)} placeholder="e.g. Debate Club President" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addExtra())} />
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

          <Button type="submit" className="w-full font-heading font-semibold text-base py-6" disabled={saving || !form.stream_pref_1}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save & continue
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
