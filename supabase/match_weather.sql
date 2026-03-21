-- Add weather snapshot to matches (captured when match starts)
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS weather jsonb;
