import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Match } from '@/types/tennis'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      player1:players!matches_player1_id_fkey(id, name),
      player2:players!matches_player2_id_fkey(id, name),
      sets(*)
    `)
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: stats } = await supabase
    .from('matches')
    .select('id, status, winner')
    .eq('user_id', user!.id)

  const total = stats?.length ?? 0
  const completed = stats?.filter((m) => m.status === 'completed').length ?? 0
  const inProgress = stats?.filter((m) => m.status === 'in_progress').length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <Button asChild size="sm">
          <Link href="/matches/new">
            <Plus className="h-4 w-4" />
            New match
          </Link>
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total" value={total} />
        <StatCard label="In progress" value={inProgress} />
        <StatCard label="Completed" value={completed} />
      </div>

      {/* Recent matches */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-400">Recent matches</h2>
        {matches && matches.length > 0 ? (
          <div className="space-y-2">
            {matches.map((match) => (
              <MatchRow key={match.id} match={match as unknown as Match} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <Activity className="h-8 w-8 text-zinc-600" />
              <p className="text-sm text-zinc-400">No matches yet. Start tracking!</p>
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
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-zinc-400">{label}</div>
      </CardContent>
    </Card>
  )
}

function MatchRow({ match }: { match: Match }) {
  const p1 = match.player1?.name ?? 'Player 1'
  const p2 = match.player2?.name ?? 'Player 2'

  return (
    <Link href={match.status === 'in_progress' ? `/matches/${match.id}/live` : `/matches/${match.id}`}>
      <Card className="transition-colors hover:border-zinc-700">
        <CardContent className="flex items-center justify-between p-4">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">
              {p1} vs {p2}
            </div>
            <div className="text-xs text-zinc-500">{formatDate(match.created_at)}</div>
          </div>
          <div className="flex items-center gap-2">
            {match.status === 'in_progress' && (
              <Badge variant="serve" className="animate-pulse">Live</Badge>
            )}
            {match.status === 'completed' && <Badge variant="success">Done</Badge>}
            {match.status === 'pending' && <Badge variant="outline">Pending</Badge>}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
