import { createClient } from '@/lib/supabase/server'
import { StatsClient } from './StatsClient'

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      player1:players!matches_player1_id_fkey(id, name),
      player2:players!matches_player2_id_fkey(id, name),
      player3:players!matches_player3_id_fkey(id, name),
      player4:players!matches_player4_id_fkey(id, name),
      sets(*, games(*, points(*)))
    `)
    .eq('user_id', user!.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  return <StatsClient matches={matches ?? []} />
}
