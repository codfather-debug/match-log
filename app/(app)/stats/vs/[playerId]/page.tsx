import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { HeadToHeadClient } from './HeadToHeadClient'

export default async function HeadToHeadPage({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: opponent } = await supabase
    .from('players')
    .select('id, name, handedness, nationality')
    .eq('id', playerId)
    .eq('user_id', user!.id)
    .single()

  if (!opponent) notFound()

  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      player1:players!matches_player1_id_fkey(id, name),
      player2:players!matches_player2_id_fkey(id, name),
      sets(*, games(*, points(*)))
    `)
    .eq('user_id', user!.id)
    .eq('player2_id', playerId)
    .order('created_at', { ascending: false })

  return <HeadToHeadClient opponent={opponent} matches={matches ?? []} />
}
