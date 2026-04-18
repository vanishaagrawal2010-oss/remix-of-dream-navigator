ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS quiz_preferences jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS grade_tier text;