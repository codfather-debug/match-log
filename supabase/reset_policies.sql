-- Drop existing policies before re-running schema
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users manage own players" on public.players;
drop policy if exists "Users manage own matches" on public.matches;
drop policy if exists "Users access sets via matches" on public.sets;
drop policy if exists "Users access games via matches" on public.games;
drop policy if exists "Users access points via matches" on public.points;
