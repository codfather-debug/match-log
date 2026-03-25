import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { DeletePlayerButton } from './DeletePlayerButton'
import { AvatarUpload } from './AvatarUpload'
import { PlayerStatsClient } from './PlayerStatsClient'

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('id', id)
    .eq('user_id', user!.id)
    .single()

  if (!player) notFound()

  const { data: matches } = await supabase
    .from('matches')
    .select(`
      id, winner, match_type, status, started_at, created_at, surface,
      player1_id, player2_id, player3_id, player4_id,
      player1:players!matches_player1_id_fkey(id, name),
      player2:players!matches_player2_id_fkey(id, name),
      player3:players!matches_player3_id_fkey(id, name),
      player4:players!matches_player4_id_fkey(id, name),
      sets(*, games(*, points(*)))
    `)
    .eq('user_id', user!.id)
    .or(`player1_id.eq.${id},player2_id.eq.${id},player3_id.eq.${id},player4_id.eq.${id}`)
    .order('created_at', { ascending: false })

  const allMatches = matches ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/players" className="text-zinc-400 hover:text-zinc-100">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-semibold">{player.name}</h1>
        </div>
        <DeletePlayerButton playerId={player.id} matchCount={allMatches.length} />
      </div>

      {/* Player info */}
      <Card className="border-zinc-800">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-4">
            <AvatarUpload
              playerId={player.id}
              userId={user!.id}
              playerName={player.name}
              avatarUrl={player.avatar_url ?? null}
            />
            <div>
              <p className="text-base font-semibold">{player.name}</p>
              <p className="text-sm text-zinc-400">
                {[player.handedness && `${player.handedness}-handed`, player.nationality]
                  .filter(Boolean).join(' · ') || 'No details'}
              </p>
              <p className="text-xs text-zinc-600 mt-0.5">Added {formatDate(player.created_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-400">Stats</h2>
        <PlayerStatsClient
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          matches={allMatches as any}
          playerId={id}
        />
      </div>

      {/* Match history */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-400">Match history</h2>
        {allMatches.length === 0 ? (
          <p className="text-sm text-zinc-600">No matches found for {player.name}.</p>
        ) : (
          <div className="space-y-2">
            {allMatches.map(m => {
              const p1 = (m.player1 as unknown as { name: string } | null)?.name ?? 'P1'
              const p2 = (m.player2 as unknown as { name: string } | null)?.name
              const isTeam1 = m.player1_id === id || m.player3_id === id
              const result = m.status === 'completed' && m.winner
                ? (isTeam1 ? m.winner === 'team1' : m.winner === 'team2') ? 'W' : 'L'
                : null
              return (
                <Link key={m.id} href={`/matches/${m.id}`}>
                  <Card className="hover:border-zinc-700 transition-colors">
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="text-sm font-medium">
                          {p2 ? `${p1} vs ${p2}` : p1}
                        </p>
                        <p className="text-xs text-zinc-500">{formatDate(m.created_at)} · {m.match_type}</p>
                      </div>
                      {result ? (
                        <Badge variant={result === 'W' ? 'success' : 'destructive'}>{result}</Badge>
                      ) : m.status !== 'completed' ? (
                        <Badge variant="serve" className="animate-pulse">Live</Badge>
                      ) : null}
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
