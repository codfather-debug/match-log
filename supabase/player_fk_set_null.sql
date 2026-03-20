-- Allow deleting a player without deleting their match history
-- (match records keep the data, player columns just become null)
ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_player1_id_fkey,
  DROP CONSTRAINT IF EXISTS matches_player2_id_fkey,
  DROP CONSTRAINT IF EXISTS matches_player3_id_fkey,
  DROP CONSTRAINT IF EXISTS matches_player4_id_fkey;

ALTER TABLE public.matches
  ADD CONSTRAINT matches_player1_id_fkey FOREIGN KEY (player1_id) REFERENCES public.players(id) ON DELETE SET NULL,
  ADD CONSTRAINT matches_player2_id_fkey FOREIGN KEY (player2_id) REFERENCES public.players(id) ON DELETE SET NULL,
  ADD CONSTRAINT matches_player3_id_fkey FOREIGN KEY (player3_id) REFERENCES public.players(id) ON DELETE SET NULL,
  ADD CONSTRAINT matches_player4_id_fkey FOREIGN KEY (player4_id) REFERENCES public.players(id) ON DELETE SET NULL;
