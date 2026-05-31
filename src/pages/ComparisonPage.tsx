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
      const quizPrefs = ((profile as any)?.quiz_preferences || {}) as Record<string, string>;
      const gradeTier = (profile as any)?.grade_tier || deriveGradeTier(profile?.grades);
      const profilePayload = profile
        ? {
            name: profile.full_name,
            grades: profile.grades,
            grade_tier: gradeTier,
            budget: profile.budget,
            interests: profile.interests,
            target_countries: profile.target_countries,
            extracurriculars: profile.extracurriculars,
            hostel_priority: quizPrefs.hostel_priority,
            fees_priority: quizPrefs.fees_priority,
            city_type: quizPrefs.city_type,
            campus_type: quizPrefs.campus_type,
            career_goal: quizPrefs.career_goal,
            study_intensity: quizPrefs.study_intensity,
            work_style: quizPrefs.work_style,
          }
        : null;

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
    <div className="comparison-page">
      {loading && <Loader fullscreen size="lg" />}

      <div className="comparison-container">

        {!comparison && (
          <>
            <div className="comparison-hero">
              <p className="comparison-eyebrow">The Atelier · College Comparison</p>
              <h1 className="comparison-title">Map Your Paths.</h1>
              <p className="comparison-subtitle">Two colleges. One stream. One truth.</p>
            </div>

            <form onSubmit={handleCompare} className="comparison-form">
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

              <button type="submit" disabled={loading} className="comparison-btn">
                Compare
              </button>
            </form>
          </>
        )}

        {comparison && (
          <div className="results-wrapper">

            <button
              onClick={() => {
                setComparison(null);
                setVerdictVisible(false);
                setStream("");
                setCollegeA("");
                setCollegeB("");
              }}
              className="back-btn"
            >
              ← Compare Again
            </button>

            <p className="results-stream-label">{stream}</p>

            {/* ── Desktop table layout ── */}
            <div className="desktop-table">
              {/* Header row */}
              <div className="dt-header-row">
                <div className="dt-label-cell" />
                {[comparison.collegeA, comparison.collegeB].map((college) => (
                  <div key={college.name} className="dt-college-header">
                    <p className="dt-college-name">{college.name}</p>
                    <p className="dt-college-location">{college.location}</p>
                  </div>
                ))}
              </div>

              <div className="dt-divider" />

              {FACTORS.map(({ key, label }, i) => (
                <div key={key} className={`dt-row ${i % 2 !== 0 ? "dt-row-alt" : ""}`}>
                  <div className="dt-label-cell">
                    <p className="dt-label">{label}</p>
                  </div>
                  {[comparison.collegeA, comparison.collegeB].map((college) => (
                    <div key={college.name} className="dt-value-cell">
                      <p className="dt-value">{(college as any)[key] || "Data not available"}</p>
                      {key === "average_salary" && college.salary_source && (
                        <p className="dt-source">{college.salary_source}</p>
                      )}
                    </div>
                  ))}
                </div>
              ))}

              {/* Top Recruiters desktop */}
              <div className="dt-row">
                <div className="dt-label-cell">
                  <p className="dt-label">Top Recruiters</p>
                </div>
                {[comparison.collegeA, comparison.collegeB].map((college) => (
                  <div key={college.name} className="dt-value-cell">
                    <div className="recruiter-tags">
                      {college.top_recruiters?.map((r) => (
                        <span key={r} className="recruiter-tag">{r}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Mobile card layout ── */}
            <div className="mobile-cards">
              {/* College name headers */}
              <div className="mobile-college-headers">
                {[comparison.collegeA, comparison.collegeB].map((college, idx) => (
                  <div key={college.name} className={`mobile-college-header ${idx === 0 ? "mobile-college-a" : "mobile-college-b"}`}>
                    <p className="mobile-college-name">{college.name}</p>
                    <p className="mobile-college-location">{college.location}</p>
                  </div>
                ))}
              </div>

              {/* Factor rows */}
              {FACTORS.map(({ key, label }, i) => (
                <div key={key} className={`mobile-factor ${i % 2 !== 0 ? "mobile-factor-alt" : ""}`}>
                  <p className="mobile-factor-label">{label}</p>
                  <div className="mobile-factor-values">
                    {[comparison.collegeA, comparison.collegeB].map((college) => (
                      <div key={college.name} className="mobile-factor-value-block">
                        <p className="mobile-college-tag">{college.name.split(" ").slice(0, 2).join(" ")}</p>
                        <p className="mobile-factor-value">{(college as any)[key] || "N/A"}</p>
                        {key === "average_salary" && college.salary_source && (
                          <p className="dt-source">{college.salary_source}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Top Recruiters mobile */}
              <div className="mobile-factor">
                <p className="mobile-factor-label">Top Recruiters</p>
                <div className="mobile-factor-values">
                  {[comparison.collegeA, comparison.collegeB].map((college) => (
                    <div key={college.name} className="mobile-factor-value-block">
                      <p className="mobile-college-tag">{college.name.split(" ").slice(0, 2).join(" ")}</p>
                      <div className="recruiter-tags">
                        {college.top_recruiters?.map((r) => (
                          <span key={r} className="recruiter-tag">{r}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Verdict ── */}
            <div className="verdict-section">
              <div className={`verdict-line ${verdictVisible ? "verdict-line-visible" : ""}`} />

              {verdictVisible && comparison.verdict && (
                <div className="verdict-content">
                  <p className="verdict-text">
                    Based on your unique profile and aptitude matrix,{" "}
                    <span className="verdict-highlight">
                      {comparison.verdict.recommended_college}
                    </span>{" "}
                    is your optimal path.
                  </p>
                  <p className="verdict-reasoning">{comparison.verdict.reasoning}</p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      <style>{`
        /* ── Base ── */
        .comparison-page {
          min-height: 100vh;
          background: #FDFBF7;
          font-family: 'Inter', 'Plus Jakarta Sans', sans-serif;
          padding: 48px 24px;
        }
        .comparison-container {
          max-width: 900px;
          margin: 0 auto;
        }

        /* ── Hero ── */
        .comparison-hero { text-align: center; margin-bottom: 56px; }
        .comparison-eyebrow {
          font-family: 'Cormorant Garamond', 'Georgia', serif;
          font-size: 11px;
          letter-spacing: 0.28em;
          color: #1B3322;
          opacity: 0.5;
          text-transform: uppercase;
          margin-bottom: 16px;
        }
        .comparison-title {
          font-family: 'Cormorant Garamond', 'Lora', 'Georgia', serif;
          font-size: clamp(36px, 6vw, 64px);
          font-weight: 400;
          color: #1B3322;
          line-height: 1.1;
          margin: 0;
        }
        .comparison-subtitle {
          font-family: 'Cormorant Garamond', 'Georgia', serif;
          font-style: italic;
          font-size: 15px;
          color: #1B3322;
          opacity: 0.45;
          margin-top: 16px;
        }

        /* ── Form ── */
        .comparison-form { max-width: 480px; margin: 0 auto; }
        .comparison-btn {
          width: 100%;
          padding: 16px 0;
          background: #1B3322;
          color: #FDFBF7;
          border: none;
          font-size: 11px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          margin-top: 8px;
          transition: opacity 0.2s ease;
        }
        .comparison-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── Results wrapper ── */
        .results-wrapper { animation: slideUp 0.4s cubic-bezier(0.4,0,0.2,1) forwards; }
        .back-btn {
          background: transparent;
          border: none;
          color: #1B3322;
          opacity: 0.4;
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          margin-bottom: 32px;
          padding: 0;
        }
        .results-stream-label {
          font-size: 11px;
          letter-spacing: 0.25em;
          color: #1B3322;
          opacity: 0.4;
          text-transform: uppercase;
          margin-bottom: 24px;
          font-family: 'Inter', sans-serif;
        }

        /* ── Desktop table ── */
        .desktop-table { display: block; }
        .mobile-cards { display: none; }

        .dt-header-row {
          display: grid;
          grid-template-columns: 180px 1fr 1fr;
          gap: 0;
        }
        .dt-label-cell { /* empty spacer in header */ }
        .dt-college-header { padding: 0 20px 20px; }
        .dt-college-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          font-weight: 500;
          color: #1B3322;
          margin: 0;
          line-height: 1.2;
        }
        .dt-college-location {
          font-size: 11px;
          color: #1B3322;
          opacity: 0.4;
          margin: 6px 0 0;
          letter-spacing: 0.08em;
        }
        .dt-divider {
          height: 1px;
          background: rgba(27,51,34,0.15);
          margin-bottom: 0;
        }
        .dt-row {
          display: grid;
          grid-template-columns: 180px 1fr 1fr;
          border-bottom: 1px solid rgba(27,51,34,0.07);
        }
        .dt-row-alt { background: rgba(27,51,34,0.018); }
        .dt-label-cell { padding: 18px 16px 18px 0; }
        .dt-label {
          font-size: 10px;
          font-weight: 600;
          color: #1B3322;
          opacity: 0.6;
          margin: 0;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .dt-value-cell { padding: 18px 20px; }
        .dt-value {
          font-size: 13px;
          color: #1B3322;
          opacity: 0.72;
          margin: 0;
          line-height: 1.65;
        }
        .dt-source {
          font-size: 10px;
          color: #1B3322;
          opacity: 0.3;
          margin: 4px 0 0;
          font-style: italic;
        }

        /* ── Recruiters ── */
        .recruiter-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .recruiter-tag {
          font-size: 11px;
          color: #1B3322;
          background: rgba(27,51,34,0.07);
          padding: 3px 10px;
          border-radius: 2px;
          letter-spacing: 0.04em;
        }

        /* ── Verdict ── */
        .verdict-section { margin-top: 56px; text-align: center; }
        .verdict-line {
          height: 1px;
          background: rgba(27,51,34,0.2);
          width: 0%;
          margin: 0 auto;
          transition: width 1s cubic-bezier(0.4,0,0.2,1);
        }
        .verdict-line-visible { width: 100%; }
        .verdict-content {
          padding: 48px 24px;
          animation: slideUp 0.4s cubic-bezier(0.4,0,0.2,1) forwards;
        }
        .verdict-text {
          font-family: 'Cormorant Garamond', 'Lora', serif;
          font-size: clamp(18px, 3vw, 26px);
          font-weight: 400;
          color: #1B3322;
          opacity: 0.6;
          margin: 0;
          letter-spacing: 0.02em;
          line-height: 1.6;
        }
        .verdict-highlight {
          font-weight: 600;
          color: #1B3322;
          opacity: 1;
          font-style: italic;
        }
        .verdict-reasoning {
          font-size: 12px;
          color: #1B3322;
          opacity: 0.35;
          font-style: italic;
          font-family: 'Cormorant Garamond', serif;
          max-width: 500px;
          margin: 16px auto 0;
          line-height: 1.7;
        }

        /* ── Mobile layout ── */
        @media (max-width: 640px) {
          .comparison-page { padding: 32px 16px; }
          .comparison-hero { margin-bottom: 40px; }

          .desktop-table { display: none; }
          .mobile-cards { display: block; }

          /* Two-column college name headers */
          .mobile-college-headers {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 4px;
          }
          .mobile-college-header {
            padding: 14px 12px;
            border-radius: 4px 4px 0 0;
          }
          .mobile-college-a { background: rgba(27,51,34,0.06); }
          .mobile-college-b { background: rgba(27,51,34,0.11); }
          .mobile-college-name {
            font-family: 'Cormorant Garamond', serif;
            font-size: 14px;
            font-weight: 600;
            color: #1B3322;
            margin: 0;
            line-height: 1.25;
          }
          .mobile-college-location {
            font-size: 10px;
            color: #1B3322;
            opacity: 0.45;
            margin: 4px 0 0;
            letter-spacing: 0.05em;
          }

          /* Each factor block */
          .mobile-factor {
            border-bottom: 1px solid rgba(27,51,34,0.07);
            padding: 14px 0;
          }
          .mobile-factor-alt { background: rgba(27,51,34,0.018); }
          .mobile-factor-label {
            font-size: 9px;
            font-weight: 700;
            color: #1B3322;
            opacity: 0.5;
            text-transform: uppercase;
            letter-spacing: 0.16em;
            margin: 0 0 10px;
            font-family: 'Inter', sans-serif;
          }
          .mobile-factor-values {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .mobile-factor-value-block {
            background: rgba(27,51,34,0.03);
            border-radius: 3px;
            padding: 10px 12px;
          }
          .mobile-college-tag {
            font-size: 9px;
            font-weight: 600;
            color: #1B3322;
            opacity: 0.35;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin: 0 0 5px;
            font-family: 'Inter', sans-serif;
          }
          .mobile-factor-value {
            font-size: 12px;
            color: #1B3322;
            opacity: 0.8;
            margin: 0;
            line-height: 1.55;
            font-family: 'Inter', sans-serif;
          }

          .verdict-content { padding: 36px 0; }
          .verdict-section { margin-top: 40px; }
          .verdict-reasoning { font-size: 13px; }

          .recruiter-tags { gap: 4px; }
          .recruiter-tag { font-size: 10px; padding: 3px 7px; }
        }

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