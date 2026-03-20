-- Add notes column to matches
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS notes text;

-- Allow 'practice' as a match type
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_match_type_check;
ALTER TABLE public.matches ADD CONSTRAINT matches_match_type_check
  CHECK (match_type IN ('singles', 'doubles', 'practice'));

-- Allow 'return' as a shot type (if not already applied)
ALTER TABLE public.points DROP CONSTRAINT IF EXISTS points_last_shot_type_check;
ALTER TABLE public.points ADD CONSTRAINT points_last_shot_type_check
  CHECK (last_shot_type IN (
    'forehand', 'backhand', 'forehand_volley', 'backhand_volley',
    'overhead', 'lob', 'drop_shot', 'serve', 'return'
  ));
