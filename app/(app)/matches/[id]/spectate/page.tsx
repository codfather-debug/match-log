import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { SpectatorClient } from './SpectatorClient'

export default async function SpectatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: match } = await supabase
    .from('matches')
    .select(`
      id, status, winner, match_type,
      player1:players!matches_player1_id_fkey(name),
      player2:players!matches_player2_id_fkey(name),
      player3:players!matches_player3_id_fkey(name),
      player4:players!matches_player4_id_fkey(name),
      sets(id, set_number, team1_games, team2_games, winner,
        games(id, server, team1_points, team2_points, winner, is_tiebreak,
          points(id, point_winner, outcome, serve_placement)
        )
      )
    `)
    .eq('id', id)
    .single()

  if (!match) notFound()

  return <SpectatorClient matchId={id} initial={match as any} />
}
