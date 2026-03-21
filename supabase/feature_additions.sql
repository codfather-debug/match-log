ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS surface text;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS rating integer;
ALTER TABLE public.points ADD COLUMN IF NOT EXISTS winner_direction text;
