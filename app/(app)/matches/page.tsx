import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

export default async function MatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      player1:players!matches_player1_id_fkey(id, name),
      player2:players!matches_player2_id_fkey(id, name),
      sets(set_number, team1_games, team2_games, winner)
    `)
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Matches</h1>
        <Button asChild size="sm">
          <Link href="/matches/new">
            <Plus className="h-4 w-4" />
            New match
          </Link>
        </Button>
      </div>

      {matches && matches.length > 0 ? (
        <div className="space-y-2">
          {matches.map((match) => {
            const p1 = match.player1?.name ?? 'Player 1'
            const p2 = match.player2?.name ?? 'Player 2'
            const sets = match.sets ?? []
            const setScores = sets
              .sort((a: {set_number: number}, b: {set_number: number}) => a.set_number - b.set_number)
              .map((s: {team1_games: number, team2_games: number}) => `${s.team1_games}-${s.team2_games}`)
              .join('  ')

            return (
              <Link
                key={match.id}
                href={match.status === 'in_progress' ? `/matches/${match.id}/live` : `/matches/${match.id}`}
              >
                <Card className="transition-colors hover:border-zinc-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {p1} vs {p2}
                        </div>
                        {setScores && (
                          <div className="font-mono text-sm text-zinc-300">{setScores}</div>
                        )}
                        <div className="text-xs text-zinc-500">
                          {match.match_type} · {formatDate(match.created_at)}
                        </div>
                      </div>
                      <div>
                        {match.status === 'in_progress' && (
                          <Badge variant="serve" className="animate-pulse">Live</Badge>
                        )}
                        {match.status === 'completed' && <Badge variant="success">Done</Badge>}
                        {match.status === 'pending' && <Badge variant="outline">Pending</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <ListChecks className="h-8 w-8 text-zinc-600" />
            <p className="text-sm text-zinc-400">No matches yet.</p>
            <Button asChild size="sm">
              <Link href="/matches/new">
                <Plus className="h-4 w-4" />
                New match
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
