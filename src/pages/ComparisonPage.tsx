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

  const resetForm = () => {
    setComparison(null);
    setVerdictVisible(false);
    setStream("");
    setCollegeA("");
    setCollegeB("");
  };

  return (
    <div className="cp-page">
      {loading && <Loader fullscreen size="lg" />}

      <div className="cp-container">

        {/* ── Search form ── */}
        {!comparison && (
          <>
            <div className="cp-hero">
              <p className="cp-eyebrow">The Atelier · College Comparison</p>
              <h1 className="cp-title">Map Your Paths.</h1>
              <p className="cp-subtitle">Two colleges. One stream. One truth.</p>
            </div>

            <form onSubmit={handleCompare} className="cp-form">
              <FloatingInput label="Stream / Course" value={stream} onChange={setStream} placeholder="e.g. Computer Science, Design, MBA" disabled={loading} />
              <FloatingInput label="First College" value={collegeA} onChange={setCollegeA} placeholder="e.g. IIT Bombay" disabled={loading} />
              <FloatingInput label="Second College" value={collegeB} onChange={setCollegeB} placeholder="e.g. BITS Pilani" disabled={loading} />
              <button type="submit" disabled={loading} className="cp-btn">Compare</button>
            </form>
          </>
        )}

        {/* ── Results ── */}
        {comparison && (
          <div className="cp-results">

            <button onClick={resetForm} className="cp-back">← Compare Again</button>
            <p className="cp-stream-tag">{stream}</p>

            {/* ════════════════════════════════════
                DESKTOP: 3-column grid table
            ════════════════════════════════════ */}
            <div className="dt-wrap">
              <div className="dt-header-row">
                <div />
                {[comparison.collegeA, comparison.collegeB].map((c) => (
                  <div key={c.name} className="dt-col-header">
                    <p className="dt-college-name">{c.name}</p>
                    <p className="dt-college-loc">{c.location}</p>
                  </div>
                ))}
              </div>
              <div className="dt-rule" />

              {FACTORS.map(({ key, label }, i) => (
                <div key={key} className={`dt-row ${i % 2 !== 0 ? "dt-row-alt" : ""}`}>
                  <div className="dt-label-cell"><p className="dt-label">{label}</p></div>
                  {[comparison.collegeA, comparison.collegeB].map((c) => (
                    <div key={c.name} className="dt-val-cell">
                      <p className="dt-val">{(c as any)[key] || "Data not available"}</p>
                      {key === "average_salary" && c.salary_source && (
                        <p className="dt-source">{c.salary_source}</p>
                      )}
                    </div>
                  ))}
                </div>
              ))}

              <div className="dt-row">
                <div className="dt-label-cell"><p className="dt-label">Top Recruiters</p></div>
                {[comparison.collegeA, comparison.collegeB].map((c) => (
                  <div key={c.name} className="dt-val-cell">
                    <div className="tag-row">
                      {c.top_recruiters?.map((r) => <span key={r} className="tag">{r}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ════════════════════════════════════
                MOBILE: stacked factor cards
            ════════════════════════════════════ */}
            <div className="mob-wrap">

              {/* College legend */}
              <div className="mob-legend">
                <div className="mob-legend-item">
                  <span className="mob-dot mob-dot-a" />
                  <div>
                    <p className="mob-legend-name">{comparison.collegeA.name}</p>
                    <p className="mob-legend-loc">{comparison.collegeA.location}</p>
                  </div>
                </div>
                <div className="mob-legend-item">
                  <span className="mob-dot mob-dot-b" />
                  <div>
                    <p className="mob-legend-name">{comparison.collegeB.name}</p>
                    <p className="mob-legend-loc">{comparison.collegeB.location}</p>
                  </div>
                </div>
              </div>

              {/* One card per factor — full width, stacked entries */}
              {FACTORS.map(({ key, label }) => (
                <div key={key} className="mob-card">
                  <p className="mob-card-label">{label}</p>
                  <div className="mob-card-body">
                    <div className="mob-entry">
                      <span className="mob-dot mob-dot-a mob-dot-sm" />
                      <div className="mob-entry-inner">
                        <p className="mob-entry-college">{comparison.collegeA.name}</p>
                        <p className="mob-entry-val">{(comparison.collegeA as any)[key] || "Data not available"}</p>
                        {key === "average_salary" && comparison.collegeA.salary_source && (
                          <p className="mob-source">{comparison.collegeA.salary_source}</p>
                        )}
                      </div>
                    </div>
                    <div className="mob-sep" />
                    <div className="mob-entry">
                      <span className="mob-dot mob-dot-b mob-dot-sm" />
                      <div className="mob-entry-inner">
                        <p className="mob-entry-college">{comparison.collegeB.name}</p>
                        <p className="mob-entry-val">{(comparison.collegeB as any)[key] || "Data not available"}</p>
                        {key === "average_salary" && comparison.collegeB.salary_source && (
                          <p className="mob-source">{comparison.collegeB.salary_source}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Recruiters card */}
              <div className="mob-card">
                <p className="mob-card-label">Top Recruiters</p>
                <div className="mob-card-body">
                  <div className="mob-entry">
                    <span className="mob-dot mob-dot-a mob-dot-sm" />
                    <div className="mob-entry-inner">
                      <p className="mob-entry-college">{comparison.collegeA.name}</p>
                      <div className="tag-row" style={{ marginTop: 6 }}>
                        {comparison.collegeA.top_recruiters?.map((r) => <span key={r} className="tag">{r}</span>)}
                      </div>
                    </div>
                  </div>
                  <div className="mob-sep" />
                  <div className="mob-entry">
                    <span className="mob-dot mob-dot-b mob-dot-sm" />
                    <div className="mob-entry-inner">
                      <p className="mob-entry-college">{comparison.collegeB.name}</p>
                      <div className="tag-row" style={{ marginTop: 6 }}>
                        {comparison.collegeB.top_recruiters?.map((r) => <span key={r} className="tag">{r}</span>)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* ── Verdict ── */}
            <div className="verdict-wrap">
              <div className={`verdict-line ${verdictVisible ? "verdict-line-on" : ""}`} />
              {verdictVisible && comparison.verdict && (
                <div className="verdict-body">
                  <p className="verdict-text">
                    Based on your unique profile and aptitude matrix,{" "}
                    <em className="verdict-pick">{comparison.verdict.recommended_college}</em>{" "}
                    is your optimal path.
                  </p>
                  <p className="verdict-reason">{comparison.verdict.reasoning}</p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      <style>{`
        /* ─── Page ─── */
        .cp-page {
          min-height: 100vh;
          background: #FDFBF7;
          font-family: 'Inter', 'Plus Jakarta Sans', sans-serif;
          padding: 48px 24px;
          box-sizing: border-box;
        }
        .cp-container { max-width: 900px; margin: 0 auto; }

        /* ─── Hero ─── */
        .cp-hero { text-align: center; margin-bottom: 56px; }
        .cp-eyebrow {
          font-family: 'Cormorant Garamond', serif;
          font-size: 11px; letter-spacing: 0.28em;
          color: #1B3322; opacity: 0.5;
          text-transform: uppercase; margin-bottom: 16px;
        }
        .cp-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(36px,6vw,64px); font-weight: 400;
          color: #1B3322; line-height: 1.1; margin: 0;
        }
        .cp-subtitle {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic; font-size: 15px;
          color: #1B3322; opacity: 0.45; margin-top: 16px;
        }

        /* ─── Form ─── */
        .cp-form { max-width: 480px; margin: 0 auto; }
        .cp-btn {
          width: 100%; padding: 16px 0;
          background: #1B3322; color: #FDFBF7;
          border: none; font-size: 11px;
          letter-spacing: 0.28em; text-transform: uppercase;
          font-family: 'Inter', sans-serif;
          cursor: pointer; margin-top: 8px;
          transition: opacity 0.2s ease;
        }
        .cp-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ─── Results wrapper ─── */
        .cp-results { animation: slideUp 0.4s cubic-bezier(0.4,0,0.2,1) forwards; }
        .cp-back {
          background: transparent; border: none;
          color: #1B3322; opacity: 0.4;
          font-size: 11px; letter-spacing: 0.2em;
          text-transform: uppercase; cursor: pointer;
          font-family: 'Inter', sans-serif;
          margin-bottom: 32px; padding: 0; display: block;
        }
        .cp-stream-tag {
          font-size: 11px; letter-spacing: 0.25em;
          color: #1B3322; opacity: 0.4;
          text-transform: uppercase; margin-bottom: 24px;
          font-family: 'Inter', sans-serif;
        }

        /* ─── Tags ─── */
        .tag-row { display: flex; flex-wrap: wrap; gap: 6px; }
        .tag {
          font-size: 11px; color: #1B3322;
          background: rgba(27,51,34,0.07);
          padding: 3px 10px; border-radius: 2px;
          letter-spacing: 0.04em;
        }

        /* ═══════════════════════════
           DESKTOP TABLE
        ═══════════════════════════ */
        .dt-wrap { display: block; }
        .mob-wrap { display: none; }

        .dt-header-row { display: grid; grid-template-columns: 180px 1fr 1fr; }
        .dt-col-header { padding: 0 20px 20px; }
        .dt-college-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px; font-weight: 500;
          color: #1B3322; margin: 0; line-height: 1.2;
        }
        .dt-college-loc {
          font-size: 11px; color: #1B3322;
          opacity: 0.4; margin: 6px 0 0; letter-spacing: 0.08em;
        }
        .dt-rule { height: 1px; background: rgba(27,51,34,0.15); }
        .dt-row {
          display: grid;
          grid-template-columns: 180px 1fr 1fr;
          border-bottom: 1px solid rgba(27,51,34,0.07);
        }
        .dt-row-alt { background: rgba(27,51,34,0.018); }
        .dt-label-cell { padding: 18px 16px 18px 0; }
        .dt-label {
          font-size: 10px; font-weight: 600;
          color: #1B3322; opacity: 0.6; margin: 0;
          letter-spacing: 0.14em; text-transform: uppercase;
        }
        .dt-val-cell { padding: 18px 20px; }
        .dt-val {
          font-size: 13px; color: #1B3322;
          opacity: 0.72; margin: 0; line-height: 1.65;
        }
        .dt-source {
          font-size: 10px; color: #1B3322;
          opacity: 0.3; margin: 4px 0 0; font-style: italic;
        }

        /* ═══════════════════════════
           MOBILE STYLES
        ═══════════════════════════ */
        @media (max-width: 640px) {
          .cp-page { padding: 24px 14px 56px; }
          .cp-hero { margin-bottom: 32px; }

          /* Switch layouts */
          .dt-wrap { display: none; }
          .mob-wrap { display: block; }

          /* College legend at top */
          .mob-legend {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 14px 16px;
            background: rgba(27,51,34,0.04);
            border: 1px solid rgba(27,51,34,0.09);
            border-radius: 8px;
            margin-bottom: 18px;
          }
          .mob-legend-item {
            display: flex;
            align-items: flex-start;
            gap: 10px;
          }
          .mob-dot {
            flex-shrink: 0;
            border-radius: 50%;
          }
          .mob-dot-a {
            width: 9px; height: 9px;
            background: #1B3322;
            margin-top: 3px;
          }
          .mob-dot-b {
            width: 9px; height: 9px;
            background: transparent;
            border: 2px solid #1B3322;
            margin-top: 3px;
          }
          .mob-dot-sm {
            width: 7px; height: 7px;
            margin-top: 5px;
          }
          .mob-legend-name {
            font-family: 'Cormorant Garamond', serif;
            font-size: 15px; font-weight: 600;
            color: #1B3322; margin: 0; line-height: 1.25;
          }
          .mob-legend-loc {
            font-size: 11px; color: #1B3322;
            opacity: 0.4; margin: 2px 0 0;
          }

          /* Factor cards */
          .mob-card {
            border: 1px solid rgba(27,51,34,0.1);
            border-radius: 7px;
            margin-bottom: 10px;
            background: #fff;
            overflow: hidden;
          }
          .mob-card-label {
            font-size: 9px; font-weight: 700;
            color: #1B3322; opacity: 0.5;
            text-transform: uppercase; letter-spacing: 0.2em;
            margin: 0; padding: 8px 14px;
            background: rgba(27,51,34,0.035);
            border-bottom: 1px solid rgba(27,51,34,0.08);
            font-family: 'Inter', sans-serif;
          }
          .mob-card-body { padding: 0; }

          /* Each college row inside card */
          .mob-entry {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 12px 14px;
          }
          .mob-entry-inner {
            flex: 1;
            /* Critical: prevents text from overflowing */
            min-width: 0;
            overflow-wrap: break-word;
            word-break: break-word;
          }
          .mob-entry-college {
            font-size: 10px; font-weight: 600;
            color: #1B3322; opacity: 0.38;
            text-transform: uppercase; letter-spacing: 0.1em;
            margin: 0 0 4px;
            font-family: 'Inter', sans-serif;
            /* Truncate very long names */
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .mob-entry-val {
            font-size: 13px;
            color: #1B3322; opacity: 0.84;
            margin: 0; line-height: 1.62;
            font-family: 'Inter', sans-serif;
            /* Let long text like admission criteria wrap freely */
            overflow-wrap: break-word;
            word-break: break-word;
            hyphens: auto;
          }
          .mob-source {
            font-size: 10px; color: #1B3322;
            opacity: 0.3; margin: 4px 0 0; font-style: italic;
          }

          /* Divider between two college entries */
          .mob-sep {
            height: 1px;
            background: rgba(27,51,34,0.07);
            margin: 0 14px;
          }

          /* Tags on mobile */
          .tag { font-size: 10px; padding: 3px 8px; }

          /* Verdict tightening */
          .verdict-wrap { margin-top: 36px !important; }
          .verdict-body { padding: 32px 0 !important; }
          .verdict-text { font-size: clamp(16px, 4.5vw, 22px) !important; }
          .verdict-reason { font-size: 13px !important; }
        }

        /* ─── Verdict (shared) ─── */
        .verdict-wrap { margin-top: 56px; text-align: center; }
        .verdict-line {
          height: 1px; background: rgba(27,51,34,0.2);
          width: 0%; margin: 0 auto;
          transition: width 1s cubic-bezier(0.4,0,0.2,1);
        }
        .verdict-line-on { width: 100%; }
        .verdict-body {
          padding: 48px 24px;
          animation: slideUp 0.4s cubic-bezier(0.4,0,0.2,1) forwards;
        }
        .verdict-text {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(18px, 3vw, 26px); font-weight: 400;
          color: #1B3322; opacity: 0.65; margin: 0;
          letter-spacing: 0.02em; line-height: 1.6;
        }
        .verdict-pick {
          font-weight: 600; color: #1B3322;
          opacity: 1; font-style: italic;
        }
        .verdict-reason {
          font-size: 12px; color: #1B3322; opacity: 0.35;
          font-style: italic;
          font-family: 'Cormorant Garamond', serif;
          max-width: 500px; margin: 16px auto 0; line-height: 1.7;
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