// Loads colleges from Supabase and merges them with the built-in list.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ALL_UNIS, type University } from "@/data/universities";

const rowToUni = (r: any): University => ({
  name: r.name,
  country: r.country,
  program: r.program || r.stream || r.degree,
  degree: r.degree,
  stream: r.stream,
  deadline: r.deadline || "Check the college website",
  scholarshipUrl: r.website || "", // empty => the card falls back to a Google search
  match: 60,
  tuition: r.tuition_text || "Check the college website",
  acceptanceRate: r.acceptance_rate || "Not published",
  difficulty: r.difficulty || "Moderate",
  ranking: r.ranking ?? 9999, // 9999 means "not ranked"
  city: r.city || undefined,
  hostel: r.hostel || undefined,
  campus: r.campus || undefined,
});

const keyOf = (u: University) => `${u.name}|${u.country}|${u.degree}|${u.stream}`.toLowerCase();

export const useColleges = () => {
  const [dbColleges, setDbColleges] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    // The table is new, so the generated types do not know it yet
    const { data, error } = await (supabase as any).from("colleges").select("*").limit(5000);
    if (!error && data) setDbColleges((data as any[]).map(rowToUni));
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Built-in curated list wins when the same college+course appears twice
  const pool: University[] = [...ALL_UNIS];
  const seen = new Set(pool.map(keyOf));
  for (const u of dbColleges) {
    if (!seen.has(keyOf(u))) { seen.add(keyOf(u)); pool.push(u); }
  }

  return { pool, dbCount: dbColleges.length, loading, reload };
};