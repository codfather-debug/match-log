-- Add 'return' to the last_shot_type check constraint on points table
ALTER TABLE public.points
  DROP CONSTRAINT IF EXISTS points_last_shot_type_check;

ALTER TABLE public.points
  ADD CONSTRAINT points_last_shot_type_check
    CHECK (last_shot_type IN (
      'forehand', 'backhand', 'forehand_volley', 'backhand_volley',
      'overhead', 'lob', 'drop_shot', 'serve', 'return'
    ));
