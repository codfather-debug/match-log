-- Add receiver side columns to sets table for doubles individual stats
alter table public.sets
  add column if not exists team1_receiver_deuce text check (team1_receiver_deuce in ('player1', 'player3')),
  add column if not exists team2_receiver_deuce text check (team2_receiver_deuce in ('player2', 'player4'));
