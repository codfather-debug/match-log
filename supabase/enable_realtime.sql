-- Enable Supabase Realtime for live score subscriptions
-- Run this in your Supabase SQL editor
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
