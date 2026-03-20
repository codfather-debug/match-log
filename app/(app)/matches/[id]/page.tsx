import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { MatchClient } from './MatchClient'

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: match } = await supabase
    .from('matches')
    .select(`
      *,
      player1:players!matches_player1_id_fkey(id, name),
      player2:players!matches_player2_id_fkey(id, name),
      sets(*, games(*, points(*)))
    `)
    .eq('id', id)
    .single()

  if (!match) notFound()

  return (
    <MatchClient
      id={id}
      p1={match.player1?.name ?? 'P1'}
      p2={match.player2?.name ?? 'P2'}
      status={match.status}
      winner={match.winner ?? null}
      matchType={match.match_type}
      createdAt={match.created_at}
      sets={match.sets ?? []}
    />
  )
}
