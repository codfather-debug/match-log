import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { LiveTracker } from './LiveTracker'

export default async function LivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: match } = await supabase
    .from('matches')
    .select(`
      *,
      player1:players!matches_player1_id_fkey(id, name),
      player2:players!matches_player2_id_fkey(id, name),
      player3:players!matches_player3_id_fkey(id, name),
      player4:players!matches_player4_id_fkey(id, name),
      sets(*, games(*, points(*)))
    `)
    .eq('id', id)
    .single()

  if (!match) notFound()

  return <LiveTracker match={match} />
}
