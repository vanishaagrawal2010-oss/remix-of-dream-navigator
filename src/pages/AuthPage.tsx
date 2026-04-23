import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { STUDY_PREFERENCES } from "@/data/universities";

const CLASS_OPTIONS = ["Class 9", "Class 10", "Class 11", "Class 12", "Gap Year", "1st Year UG", "2nd Year UG", "3rd Year UG", "Final Year UG", "Postgrad"];

const AuthPage = () => {
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Auth fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Profile fields (sign-up only)
  const [fullName, setFullName] = useState("");
  const [school, setSchool] = useState("");
  const [grades, setGrades] = useState("");
  const [currentClass, setCurrentClass] = useState("");
  const [pref1, setPref1] = useState("");
  const [pref2, setPref2] = useState("");
  const [pref3, setPref3] = useState("");

  if (authLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) toast({ title: "Sign-in failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Sign-up: create account, then write the merged profile fields
    const { error } = await signUp(email, password);
    if (error) {
      toast({ title: "Sign-up failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Wait for the session to settle (handle_new_user trigger creates the profile row)
    const { data: { user: created } } = await supabase.auth.getUser();
    if (created) {
      const p1 = STUDY_PREFERENCES.find(p => p.value === pref1);
      await supabase.from("profiles").update({
        full_name: fullName || null,
        school: school || null,
        grades: grades || null,
        current_class: currentClass || null,
        stream_pref_1: pref1 || null,
        stream_pref_2: pref2 || null,
        stream_pref_3: pref3 || null,
        // Mirror first preference into legacy degree/stream so recs/roadmap still work
        degree_type: p1?.degree || null,
        stream: p1?.stream || null,
      }).eq("user_id", created.id);
    }

    toast({ title: "Welcome aboard.", description: "Your atelier has been opened." });
    setLoading(false);
  };

  const usedPrefs = new Set([pref1, pref2, pref3].filter(Boolean));
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
    <div className="flex min-h-screen items-center justify-center p-4 py-10">
      <Card className="glass-card w-full max-w-xl relative">
        <CardHeader className="text-center space-y-3 pt-10">
          <p className="label-mono text-muted-foreground">Maison Guide · Est. 2026</p>
          <CardTitle className="font-heading text-4xl font-medium tracking-tight">
            {isLogin ? "Welcome back." : "Begin your journey."}
          </CardTitle>
          <CardDescription className="text-base">
            {isLogin
              ? "Sign in to continue your application atelier."
              : "Tell us a little about yourself — one form, one minute, fully personalised from the first click."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="label-mono text-xs">Account</Label>
              <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input type="password" placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>

            {!isLogin && (
              <div className="space-y-4 pt-2 border-t border-border">
                <Label className="label-mono text-xs block pt-3">About you</Label>
                <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                <Input placeholder="School / college" value={school} onChange={(e) => setSchool(e.target.value)} required />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input placeholder="Grades (e.g. 92%, GPA 3.8, AAA)" value={grades} onChange={(e) => setGrades(e.target.value)} required />
                  <Select value={currentClass} onValueChange={setCurrentClass}>
                    <SelectTrigger><SelectValue placeholder="Current class / year" /></SelectTrigger>
                    <SelectContent>
                      {CLASS_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <Label className="label-mono text-xs block pt-2">Three preferences — degree & stream</Label>
                <p className="text-xs text-muted-foreground -mt-2">Your 1st choice is primary; 2nd and 3rd widen your shortlist.</p>
                <PrefSelect value={pref1} onChange={setPref1} exclude={[pref2, pref3].filter(Boolean)} placeholder="1st preference" />
                <PrefSelect value={pref2} onChange={setPref2} exclude={[pref1, pref3].filter(Boolean)} placeholder="2nd preference (optional)" />
                <PrefSelect value={pref3} onChange={setPref3} exclude={[pref1, pref2].filter(Boolean)} placeholder="3rd preference (optional)" />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || (!isLogin && (!pref1 || usedPrefs.size < [pref1, pref2, pref3].filter(Boolean).length))}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.25} />}
              {isLogin ? "Sign in" : "Begin your journey"}
            </Button>
          </form>
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isLogin ? "New here? Create your account →" : "Already have an account? Sign in →"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
