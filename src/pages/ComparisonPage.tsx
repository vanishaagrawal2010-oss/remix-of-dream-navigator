import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { deriveGradeTier } from "@/data/universities";
import Loader from "@/components/Loader";

type CollegeData = {
  name: string;
  location: string;
  nirf_rank: string;
  years_of_study: string;
  flexibility: string;
  average_salary: string;
  highest_package: string;
  salary_source: string;
  career_growth: string;
  higher_studies: string;
  top_recruiters: string[];
  placement_percentage: string;
  acceptance_rate: string;
  admission_difficulty: string;
  admission_criteria: string;
  data_verified: boolean;
};

type Comparison = {
  collegeA: CollegeData;
  collegeB: CollegeData;
  verdict: {
    recommended_college: string;
    reasoning: string;
  };
};

const FACTORS = [
  { key: "nirf_rank", label: "NIRF Rank" },
  { key: "years_of_study", label: "Years of Study" },
  { key: "admission_difficulty", label: "Admission Difficulty" },
  { key: "acceptance_rate", label: "Acceptance Rate" },
  { key: "admission_criteria", label: "Admission Criteria" },
  { key: "flexibility", label: "Flexibility" },
  { key: "average_salary", label: "Average Salary" },
  { key: "highest_package", label: "Highest Package" },
  { key: "placement_percentage", label: "Placement %" },
  { key: "career_growth", label: "Career Growth" },
  { key: "higher_studies", label: "Higher Studies" },
];

const FloatingInput = ({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled: boolean;
}) => {
  const [focused, setFocused] = useState(false);
  const isFloated = focused || value.length > 0;

  return (
    <div style={{ position: "relative", marginBottom: 36, paddingTop: 16 }}>
      <label
        style={{
          position: "absolute",
          top: isFloated ? 0 : 28,
          left: 0,
          fontSize: isFloated ? 10 : 15,
          letterSpacing: isFloated ? "0.2em" : "0.03em",
          color: "#1B3322",
          opacity: isFloated ? 0.6 : 0.35,
          textTransform: isFloated ? "uppercase" : "none",
          transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
          pointerEvents: "none",
          fontFamily: isFloated ? "'Inter', sans-serif" : "'Cormorant Garamond', serif",
          fontStyle: isFloated ? "normal" : "italic",
        }}
      >
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={focused && !value ? placeholder : ""}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          borderBottom: `1px solid rgba(27,51,34,${focused ? "0.7" : "0.2"})`,
          outline: "none",
          fontSize: 15,
          color: "#1B3322",
          padding: "10px 0 8px",
          fontFamily: "'Inter', sans-serif",
          boxSizing: "border-box",
          transition: "border-color 0.2s ease",
        }}
      />
    </div>
  );
};

const ComparisonPage = () => {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [stream, setStream] = useState("");
  const [collegeA, setCollegeA] = useState("");
  const [collegeB, setCollegeB] = useState("");
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [verdictVisible, setVerdictVisible] = useState(false);

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stream.trim() || !collegeA.trim() || !collegeB.trim()) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    setComparison(null);
    setVerdictVisible(false);

    try {
      // Build a rich profile snapshot for the AI so it gives a personalised verdict
      const quizPrefs = ((profile as any)?.quiz_preferences || {}) as Record<string, string>;
      const gradeTier = (profile as any)?.grade_tier || deriveGradeTier(profile?.grades);
const profilePayload = profile ? {
  name: profile.full_name,
  grades: profile.grades,
  grade_tier: gradeTier,
  // NOTE: intentionally NOT sending stream/degree preferences —
  // the user typed their own stream in the search box, so the
  // verdict should be based on that, not their profile course.
  budget: profile.budget,
  interests: profile.interests,
  target_countries: profile.target_countries,
  extracurriculars: profile.extracurriculars,
  // Lifestyle preferences from quiz (still relevant regardless of stream)
  hostel_priority: quizPrefs.hostel_priority,
  fees_priority: quizPrefs.fees_priority,
  city_type: quizPrefs.city_type,
  campus_type: quizPrefs.campus_type,
  career_goal: quizPrefs.career_goal,
  study_intensity: quizPrefs.study_intensity,
  work_style: quizPrefs.work_style,
} : null;
      const { data, error } = await supabase.functions.invoke("college-comparison", {
        body: {
          collegeA: collegeA.trim(),
          collegeB: collegeB.trim(),
          stream: stream.trim(),
          profile: profilePayload,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.comparison) throw new Error("No comparison data returned");

      setComparison(data.comparison);
      setTimeout(() => setVerdictVisible(true), 800);
    } catch (e: any) {
      toast({
        title: "Please try again",
        description: e.message || "Could not generate comparison",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FDFBF7",
        fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
        padding: "48px 24px",
      }}
    >
      {loading && <Loader fullscreen size="lg" />}

      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {!comparison && (
          <>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <p style={{
                fontFamily: "'Cormorant Garamond', 'Georgia', serif",
                fontSize: 11,
                letterSpacing: "0.28em",
                color: "#1B3322",
                opacity: 0.5,
                textTransform: "uppercase",
                marginBottom: 16,
              }}>
                The Atelier · College Comparison
              </p>
              <h1 style={{
                fontFamily: "'Cormorant Garamond', 'Lora', 'Georgia', serif",
                fontSize: "clamp(36px, 6vw, 64px)",
                fontWeight: 400,
                color: "#1B3322",
                lineHeight: 1.1,
                margin: 0,
              }}>
                Map Your Paths.
              </h1>
              <p style={{
                fontFamily: "'Cormorant Garamond', 'Georgia', serif",
                fontStyle: "italic",
                fontSize: 15,
                color: "#1B3322",
                opacity: 0.45,
                marginTop: 16,
              }}>
                Two colleges. One stream. One truth.
              </p>
            </div>

            <form onSubmit={handleCompare} style={{ maxWidth: 480, margin: "0 auto" }}>
              <FloatingInput
                label="Stream / Course"
                value={stream}
                onChange={setStream}
                placeholder="e.g. Computer Science, Design, MBA"
                disabled={loading}
              />
              <FloatingInput
                label="First College"
                value={collegeA}
                onChange={setCollegeA}
                placeholder="e.g. IIT Bombay"
                disabled={loading}
              />
              <FloatingInput
                label="Second College"
                value={collegeB}
                onChange={setCollegeB}
                placeholder="e.g. BITS Pilani"
                disabled={loading}
              />

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "16px 0",
                  background: "#1B3322",
                  color: "#FDFBF7",
                  border: "none",
                  fontSize: 11,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  fontFamily: "'Inter', sans-serif",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                  marginTop: 8,
                  transition: "opacity 0.2s ease",
                }}
              >
                Compare
              </button>
            </form>
          </>
        )}

        {comparison && (
          <div style={{ animation: "slideUp 0.4s cubic-bezier(0.4,0,0.2,1) forwards" }}>

            <button
              onClick={() => {
                setComparison(null);
                setVerdictVisible(false);
                setStream("");
                setCollegeA("");
                setCollegeB("");
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "#1B3322",
                opacity: 0.4,
                fontSize: 11,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                marginBottom: 32,
                padding: 0,
              }}
            >
              ← Compare Again
            </button>

            <p style={{
              fontSize: 11,
              letterSpacing: "0.25em",
              color: "#1B3322",
              opacity: 0.4,
              textTransform: "uppercase",
              marginBottom: 24,
              fontFamily: "'Inter', sans-serif",
            }}>
              {stream}
            </p>

            <div style={{
              display: "grid",
              gridTemplateColumns: "180px 1fr 1fr",
              gap: 0,
            }}>
              <div />
              {[comparison.collegeA, comparison.collegeB].map((college) => (
                <div key={college.name} style={{ padding: "0 20px 20px" }}>
                  <p style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 20,
                    fontWeight: 500,
                    color: "#1B3322",
                    margin: 0,
                    lineHeight: 1.2,
                  }}>
                    {college.name}
                  </p>
                  <p style={{
                    fontSize: 11,
                    color: "#1B3322",
                    opacity: 0.4,
                    margin: "6px 0 0",
                    letterSpacing: "0.08em",
                  }}>
                    {college.location}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ height: 1, background: "rgba(27,51,34,0.15)", marginBottom: 0 }} />

            {FACTORS.map(({ key, label }, i) => (
              <div
                key={key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "180px 1fr 1fr",
                  borderBottom: "1px solid rgba(27,51,34,0.07)",
                  background: i % 2 === 0 ? "transparent" : "rgba(27,51,34,0.018)",
                }}
              >
                <div style={{ padding: "18px 16px 18px 0" }}>
                  <p style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#1B3322",
                    opacity: 0.6,
                    margin: 0,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                  }}>
                    {label}
                  </p>
                </div>
                {[comparison.collegeA, comparison.collegeB].map((college) => (
                  <div key={college.name} style={{ padding: "18px 20px" }}>
                    <p style={{
                      fontSize: 13,
                      color: "#1B3322",
                      opacity: 0.72,
                      margin: 0,
                      lineHeight: 1.65,
                    }}>
                      {(college as any)[key] || "Data not available"}
                    </p>
                    {key === "average_salary" && college.salary_source && (
                      <p style={{
                        fontSize: 10,
                        color: "#1B3322",
                        opacity: 0.3,
                        margin: "4px 0 0",
                        fontStyle: "italic",
                      }}>
                        {college.salary_source}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ))}

            {/* Top Recruiters */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "180px 1fr 1fr",
              borderBottom: "1px solid rgba(27,51,34,0.07)",
            }}>
              <div style={{ padding: "18px 16px 18px 0" }}>
                <p style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#1B3322",
                  opacity: 0.6,
                  margin: 0,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}>
                  Top Recruiters
                </p>
              </div>
              {[comparison.collegeA, comparison.collegeB].map((college) => (
                <div key={college.name} style={{ padding: "18px 20px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {college.top_recruiters?.map((r) => (
                      <span key={r} style={{
                        fontSize: 11,
                        color: "#1B3322",
                        background: "rgba(27,51,34,0.07)",
                        padding: "3px 10px",
                        borderRadius: 2,
                        letterSpacing: "0.04em",
                      }}>
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Verdict */}
            <div style={{ marginTop: 56, textAlign: "center" }}>
              <div style={{
                height: 1,
                background: "rgba(27,51,34,0.2)",
                width: verdictVisible ? "100%" : "0%",
                margin: "0 auto",
                transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
              }} />

              {verdictVisible && comparison.verdict && (
                <div style={{
                  padding: "48px 24px",
                  animation: "slideUp 0.4s cubic-bezier(0.4,0,0.2,1) forwards",
                }}>
                  <p style={{
                    fontFamily: "'Cormorant Garamond', 'Lora', serif",
                    fontSize: "clamp(18px, 3vw, 26px)",
                    fontWeight: 400,
                    color: "#1B3322",
                    opacity: 0.6,
                    margin: 0,
                    letterSpacing: "0.02em",
                    lineHeight: 1.6,
                  }}>
                    Based on your unique profile and aptitude matrix,{" "}
                    <span style={{
                      fontWeight: 600,
                      color: "#1B3322",
                      opacity: 1,
                      fontStyle: "italic",
                    }}>
                      {comparison.verdict.recommended_college}
                    </span>{" "}
                    is your optimal path.
                  </p>
                  <p style={{
                    fontSize: 12,
                    color: "#1B3322",
                    opacity: 0.35,
                    marginTop: 16,
                    fontStyle: "italic",
                    fontFamily: "'Cormorant Garamond', serif",
                    maxWidth: 500,
                    margin: "16px auto 0",
                    lineHeight: 1.7,
                  }}>
                    {comparison.verdict.reasoning}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        input::placeholder {
          color: rgba(27,51,34,0.2);
          font-style: italic;
          font-family: 'Cormorant Garamond', serif;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
};

export default ComparisonPage;