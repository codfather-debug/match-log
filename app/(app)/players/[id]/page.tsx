import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { DeletePlayerButton } from './DeletePlayerButton'

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
      id, winner, match_type, status, started_at, created_at,
      player1:players!matches_player1_id_fkey(id, name),
      player2:players!matches_player2_id_fkey(id, name)
    `)
    .eq('user_id', user!.id)
    .or(`player2_id.eq.${id},player4_id.eq.${id}`)
    .order('created_at', { ascending: false })

  const completed = (matches ?? []).filter(m => m.status === 'completed')
  const wins = completed.filter(m => m.winner === 'team1').length
  const losses = completed.filter(m => m.winner === 'team2').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/players" className="text-zinc-400 hover:text-zinc-100">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-semibold">{player.name}</h1>
        </div>
        <DeletePlayerButton playerId={player.id} matchCount={(matches ?? []).length} />
      </div>

      {/* Player info */}
      <Card className="border-zinc-800">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 text-xl font-bold">
              {player.name[0].toUpperCase()}
            </div>
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

      {/* H2H summary */}
      {completed.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="p-4 text-center"><div className="text-3xl font-bold text-emerald-400">{wins}</div><div className="text-xs text-zinc-400 mt-0.5">Wins</div></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><div className="text-3xl font-bold text-red-400">{losses}</div><div className="text-xs text-zinc-400 mt-0.5">Losses</div></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><div className="text-3xl font-bold">{completed.length}</div><div className="text-xs text-zinc-400 mt-0.5">Matches</div></CardContent></Card>
          </div>

          <Button asChild variant="outline" className="w-full">
            <Link href={`/stats/vs/${id}`}>
              <BarChart3 className="h-4 w-4" />
              View detailed H2H stats
            </Link>
          </Button>
        </>
      )}

      {/* Match history */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-400">Match history</h2>
        {(matches ?? []).length === 0 ? (
          <p className="text-sm text-zinc-600">No matches against {player.name} yet.</p>
        ) : (
          <div className="space-y-2">
            {(matches ?? []).map(m => {
              const result = m.status === 'completed'
                ? m.winner === 'team1' ? 'W' : 'L'
                : null
              return (
                <Link key={m.id} href={`/matches/${m.id}`}>
                  <Card className="hover:border-zinc-700 transition-colors">
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="text-sm font-medium">
                          {(m.player1 as unknown as { name: string } | null)?.name ?? 'P1'} vs {(m.player2 as unknown as { name: string } | null)?.name ?? 'P2'}
                        </p>
                        <p className="text-xs text-zinc-500">{formatDate(m.created_at)} · {m.match_type}</p>
                      </div>
                      {result ? (
                        <Badge variant={result === 'W' ? 'success' : 'destructive'}>{result}</Badge>
                      ) : (
                        <Badge variant="serve" className="animate-pulse">Live</Badge>
                      )}
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
