-- ============================================================
-- Match Log — Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Profiles (mirrors auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Players
-- ============================================================
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  handedness text check (handedness in ('right', 'left')),
  nationality text,
  created_at timestamptz default now()
);

alter table public.players enable row level security;

create policy "Users manage own players"
  on public.players for all using (auth.uid() = user_id);

-- ============================================================
-- Matches
-- ============================================================
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  match_type text not null check (match_type in ('singles', 'doubles')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  format jsonb not null default '{"sets":3,"tiebreak":true,"superTiebreak":false,"noAd":false}'::jsonb,
  player1_id uuid references public.players(id),
  player2_id uuid references public.players(id),
  player3_id uuid references public.players(id),
  player4_id uuid references public.players(id),
  winner text check (winner in ('team1', 'team2')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.matches enable row level security;

create policy "Users manage own matches"
  on public.matches for all using (auth.uid() = user_id);

-- ============================================================
-- Sets
-- ============================================================
create table if not exists public.sets (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade not null,
  set_number int not null default 1,
  team1_games int not null default 0,
  team2_games int not null default 0,
  is_tiebreak boolean not null default false,
  is_super_tiebreak boolean not null default false,
  winner text check (winner in ('team1', 'team2')),
  created_at timestamptz default now()
);

alter table public.sets enable row level security;

create policy "Users access sets via matches"
  on public.sets for all using (
    exists (select 1 from public.matches where id = sets.match_id and user_id = auth.uid())
  );

-- ============================================================
-- Games
-- ============================================================
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  set_id uuid references public.sets(id) on delete cascade not null,
  match_id uuid references public.matches(id) on delete cascade not null,
  game_number int not null default 1,
  server text not null check (server in ('player1', 'player2', 'player3', 'player4')) default 'player1',
  team1_points int not null default 0,
  team2_points int not null default 0,
  winner text check (winner in ('team1', 'team2')),
  is_tiebreak boolean not null default false,
  created_at timestamptz default now()
);

alter table public.games enable row level security;

create policy "Users access games via matches"
  on public.games for all using (
    exists (select 1 from public.matches where id = games.match_id and user_id = auth.uid())
  );

-- ============================================================
-- Points
-- ============================================================
create table if not exists public.points (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.games(id) on delete cascade not null,
  match_id uuid references public.matches(id) on delete cascade not null,
  point_number int not null default 1,
  server text not null check (server in ('player1', 'player2', 'player3', 'player4')),
  serve_number int not null check (serve_number in (1, 2)) default 1,
  serve_placement text check (serve_placement in ('wide', 'body', 'T')),
  serve_result text check (serve_result in ('ace', 'fault', 'double_fault', 'in_play')),
  rally_length int not null default 0,
  point_winner text check (point_winner in ('team1', 'team2')),
  outcome text check (outcome in ('winner', 'error', 'unforced_error', 'double_fault', 'ace')),
  last_shot_type text check (last_shot_type in (
    'forehand', 'backhand', 'forehand_volley', 'backhand_volley',
    'overhead', 'lob', 'drop_shot', 'serve'
  )),
  last_shot_player text check (last_shot_player in ('player1', 'player2', 'player3', 'player4')),
  error_direction text check (error_direction in ('long', 'wide', 'net')),
  court_side text check (court_side in ('deuce', 'ad')),
  score_before jsonb,
  created_at timestamptz default now()
);

alter table public.points enable row level security;

create policy "Users access points via matches"
  on public.points for all using (
    exists (select 1 from public.matches where id = points.match_id and user_id = auth.uid())
  );

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_players_user on public.players(user_id);
create index if not exists idx_matches_user on public.matches(user_id);
create index if not exists idx_sets_match on public.sets(match_id);
create index if not exists idx_games_set on public.games(set_id);
create index if not exists idx_games_match on public.games(match_id);
create index if not exists idx_points_game on public.points(game_id);
create index if not exists idx_points_match on public.points(match_id);
