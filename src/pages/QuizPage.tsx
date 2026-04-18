import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Sparkles, ArrowRight, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { deriveGradeTier } from "@/data/universities";

type Question = {
  id: string;
  text: string;
  hint: string;
  options: { value: string; label: string }[];
};

// Inspired by Holland-codes & Career Counselling Master Guide framework
const QUESTIONS: Question[] = [
  {
    id: "fees_priority",
    text: "How important is low tuition fee?",
    hint: "Budget will heavily filter your recommendations.",
    options: [
      { value: "critical", label: "Critical — only show me affordable colleges" },
      { value: "important", label: "Important — but I'll consider others" },
      { value: "neutral", label: "Doesn't matter — I have full funding" },
    ],
  },
  {
    id: "city_type",
    text: "What kind of city do you want to study in?",
    hint: "This affects lifestyle and internship opportunities.",
    options: [
      { value: "metro", label: "Big metro (Mumbai, Delhi, Bangalore, NYC, London)" },
      { value: "tier2", label: "Mid-size city — quieter but well-connected" },
      { value: "small", label: "Small town — focused academic environment" },
      { value: "any", label: "Doesn't matter" },
    ],
  },
  {
    id: "campus_type",
    text: "What kind of campus do you prefer?",
    hint: "Big vs small affects your daily experience deeply.",
    options: [
      { value: "Sprawling", label: "Sprawling green campus with everything inside" },
      { value: "Modern", label: "Modern, tech-forward facilities" },
      { value: "Urban", label: "Urban — integrated with the city" },
      { value: "Compact", label: "Compact — close-knit & easy to navigate" },
    ],
  },
  {
    id: "hostel_priority",
    text: "How important are good hostel facilities?",
    hint: "Especially for outstation students.",
    options: [
      { value: "critical", label: "Critical — I need excellent hostel" },
      { value: "important", label: "Important — but a decent one is fine" },
      { value: "neutral", label: "Not needed — I'll live off-campus / locally" },
    ],
  },
  {
    id: "work_style",
    text: "How do you naturally work and learn best?",
    hint: "From the Career Master Guide aptitude framework.",
    options: [
      { value: "investigative", label: "Analytical — I love solving complex problems" },
      { value: "realistic", label: "Hands-on — I learn by building & doing" },
      { value: "artistic", label: "Creative — I express ideas visually or through writing" },
      { value: "social", label: "Social — I thrive helping & teaching others" },
      { value: "enterprising", label: "Enterprising — I love leading & business" },
      { value: "conventional", label: "Structured — I prefer organized, detail-oriented work" },
    ],
  },
  {
    id: "career_goal",
    text: "What's your primary career goal?",
    hint: "This shapes which colleges fit your trajectory.",
    options: [
      { value: "research", label: "Research / academia / PhD path" },
      { value: "industry", label: "High-paying industry job (FAANG, Big-4, MNCs)" },
      { value: "startup", label: "Build my own startup / be my own boss" },
      { value: "stable", label: "Stable government / public sector role" },
      { value: "social_impact", label: "Social impact / NGO / public service" },
    ],
  },
  {
    id: "risk_appetite",
    text: "How do you handle uncertainty in your career?",
    hint: "Be honest — this changes which colleges suit you.",
    options: [
      { value: "high", label: "I love risk — willing to try new fields, switch streams" },
      { value: "medium", label: "Calculated risks — I plan but stay flexible" },
      { value: "low", label: "I prefer a clear, predictable roadmap" },
    ],
  },
  {
    id: "study_intensity",
    text: "How intense do you want your college experience to be?",
    hint: "Top colleges = high pressure. Easier colleges = balanced life.",
    options: [
      { value: "intense", label: "Highly intense — I want to be pushed to my limits" },
      { value: "balanced", label: "Balanced — academics + extracurriculars + chill time" },
      { value: "relaxed", label: "Relaxed — I want to enjoy college, not stress" },
    ],
  },
];

const QuizPage = () => {
  const { profile, updateProfile } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const current = QUESTIONS[currentIndex];
  const progress = ((currentIndex + 1) / QUESTIONS.length) * 100;
  const currentAnswer = answers[current.id];

  const handleNext = () => {
    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const grade_tier = deriveGradeTier(profile?.grades);
    const { error } = await updateProfile({
      quiz_preferences: answers as any,
      grade_tier,
    } as any) || {};
    if (error) {
      toast({ title: "Could not save quiz", variant: "destructive" });
    } else {
      setDone(true);
      setTimeout(() => navigate("/dashboard"), 1500);
    }
    setSubmitting(false);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Card className="glass-card max-w-md text-center">
            <CardContent className="p-8">
              <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4" />
              <h2 className="font-heading text-2xl font-bold mb-2">Quiz Complete!</h2>
              <p className="text-muted-foreground">Your recommendations are now personalised. Redirecting...</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-heading text-3xl font-bold gradient-text">Aptitude & Preferences Quiz</h1>
          <p className="mt-2 text-muted-foreground">8 quick questions to truly personalise your recommendations</p>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Question {currentIndex + 1} of {QUESTIONS.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-heading text-xl">{current.text}</CardTitle>
                <CardDescription>{current.hint}</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={currentAnswer || ""}
                  onValueChange={(v) => setAnswers(a => ({ ...a, [current.id]: v }))}
                  className="space-y-3"
                >
                  {current.options.map(opt => (
                    <Label
                      key={opt.value}
                      htmlFor={opt.value}
                      className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-all hover:border-primary/40 ${
                        currentAnswer === opt.value ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <RadioGroupItem value={opt.value} id={opt.value} />
                      <span className="text-sm font-normal">{opt.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Previous
          </Button>
          <Button onClick={handleNext} disabled={!currentAnswer || submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {currentIndex === QUESTIONS.length - 1 ? "Finish" : "Next"}
            {currentIndex < QUESTIONS.length - 1 && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
