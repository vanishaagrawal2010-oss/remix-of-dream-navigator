
-- Add three ranked stream/degree preferences to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stream_pref_1 TEXT,
  ADD COLUMN IF NOT EXISTS stream_pref_2 TEXT,
  ADD COLUMN IF NOT EXISTS stream_pref_3 TEXT;

-- Persistent shortlist of liked colleges per user
CREATE TABLE IF NOT EXISTS public.shortlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  college_name TEXT NOT NULL,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, college_name)
);

ALTER TABLE public.shortlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own shortlist"
  ON public.shortlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users add to their own shortlist"
  ON public.shortlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users remove from their own shortlist"
  ON public.shortlists FOR DELETE
  USING (auth.uid() = user_id);

-- Realtime for shortlists
ALTER TABLE public.shortlists REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shortlists;
