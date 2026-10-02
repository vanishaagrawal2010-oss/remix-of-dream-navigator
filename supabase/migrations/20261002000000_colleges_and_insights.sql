-- =====================================================================
-- Bigger college database + student-life insights + discovery log
-- Paste this whole file into Supabase > SQL Editor > Run
-- =====================================================================

-- 1) Colleges (grows automatically as students use the app)
CREATE TABLE IF NOT EXISTS public.colleges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,              -- name|country|degree|stream, lower-case
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT,
  state TEXT,
  program TEXT,
  degree TEXT NOT NULL,
  stream TEXT NOT NULL,
  tuition_text TEXT,                      -- e.g. "₹2,00,000/yr"
  acceptance_rate TEXT,
  difficulty TEXT NOT NULL DEFAULT 'Moderate'
    CHECK (difficulty IN ('Easy','Moderate','Hard','Very Hard')),
  ranking INTEGER,
  hostel TEXT CHECK (hostel IN ('Excellent','Good','Average','Limited')),
  campus TEXT CHECK (campus IN ('Sprawling','Modern','Compact','Urban')),
  deadline TEXT,
  website TEXT,                           -- NULL when the link failed our check
  entrance_exams TEXT,
  college_type TEXT,                      -- Government / Private / Deemed / Niche ...
  source TEXT NOT NULL DEFAULT 'ai',      -- 'ai' or 'official'
  verified BOOLEAN NOT NULL DEFAULT false,
  last_checked TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS colleges_country_idx ON public.colleges (country);
CREATE INDEX IF NOT EXISTS colleges_stream_idx ON public.colleges (degree, stream);

ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

-- Any signed-in student can read. Only the server (edge function) can write.
DROP POLICY IF EXISTS "Signed-in users can read colleges" ON public.colleges;
CREATE POLICY "Signed-in users can read colleges"
  ON public.colleges FOR SELECT TO authenticated USING (true);

-- 2) Student-life summaries (one per college, refreshed every ~90 days)
CREATE TABLE IF NOT EXISTS public.college_insights (
  name_key TEXT NOT NULL PRIMARY KEY,     -- "name|country", lower-case
  college_name TEXT NOT NULL,
  country TEXT NOT NULL,
  summary JSONB NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.college_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signed-in users can read insights" ON public.college_insights;
CREATE POLICY "Signed-in users can read insights"
  ON public.college_insights FOR SELECT TO authenticated USING (true);

-- 3) Log of discovery runs, so we never repeat the same AI search too often
CREATE TABLE IF NOT EXISTS public.discovery_runs (
  run_key TEXT NOT NULL PRIMARY KEY,      -- country|degree|stream, lower-case
  ran_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  added INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.discovery_runs ENABLE ROW LEVEL SECURITY;
-- no policies: only the server (service role) touches this table

-- 4) Reviews written by your own students (the long-term, best data source)
CREATE TABLE IF NOT EXISTS public.college_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name_key TEXT NOT NULL,                 -- "name|country", lower-case
  hostel INTEGER CHECK (hostel BETWEEN 1 AND 5),
  food INTEGER CHECK (food BETWEEN 1 AND 5),
  faculty INTEGER CHECK (faculty BETWEEN 1 AND 5),
  placements INTEGER CHECK (placements BETWEEN 1 AND 5),
  campus_life INTEGER CHECK (campus_life BETWEEN 1 AND 5),
  comment TEXT,
  status TEXT,                            -- 'current student', 'alumnus', 'applicant'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, name_key)
);
ALTER TABLE public.college_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signed-in users can read reviews" ON public.college_reviews;
CREATE POLICY "Signed-in users can read reviews"
  ON public.college_reviews FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users add their own review" ON public.college_reviews;
CREATE POLICY "Users add their own review"
  ON public.college_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users edit their own review" ON public.college_reviews;
CREATE POLICY "Users edit their own review"
  ON public.college_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);