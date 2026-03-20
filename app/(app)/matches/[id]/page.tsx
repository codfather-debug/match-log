import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Point, PlayerSlot } from '@/types/tennis'

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
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

  const p1 = match.player1?.name ?? 'P1'
  const p2 = match.player2?.name ?? 'P2'

  const allPoints: Point[] = match.sets
    ?.flatMap((s: { games: { points: Point[] }[] }) => s.games?.flatMap((g) => g.points ?? []) ?? [])
    ?? []

  // Stats
  const team1Points = allPoints.filter((p: Point) => p.point_winner === 'team1').length
  const team2Points = allPoints.filter((p: Point) => p.point_winner === 'team2').length
  const aces1 = allPoints.filter((p: Point) => p.outcome === 'ace' && p.server === 'player1').length
  const aces2 = allPoints.filter((p: Point) => p.outcome === 'ace' && p.server === 'player2').length
  const winners1 = allPoints.filter((p: Point) => p.outcome === 'winner' && p.point_winner === 'team1').length
  const winners2 = allPoints.filter((p: Point) => p.outcome === 'winner' && p.point_winner === 'team2').length
  const ue1 = allPoints.filter((p: Point) => p.outcome === 'unforced_error' && p.point_winner === 'team2').length
  const ue2 = allPoints.filter((p: Point) => p.outcome === 'unforced_error' && p.point_winner === 'team1').length
  const df1 = allPoints.filter((p: Point) => p.outcome === 'double_fault' && p.server === 'player1').length
  const df2 = allPoints.filter((p: Point) => p.outcome === 'double_fault' && p.server === 'player2').length

  const firstServe1 = allPoints.filter((p: Point) => (p.server === 'player1') && p.serve_number === 1)
  const firstServeIn1 = firstServe1.filter((p: Point) => p.serve_result !== 'fault').length
  const fs1pct = firstServe1.length ? Math.round((firstServeIn1 / firstServe1.length) * 100) : 0

  const firstServe2 = allPoints.filter((p: Point) => (p.server === 'player2') && p.serve_number === 1)
  const firstServeIn2 = firstServe2.filter((p: Point) => p.serve_result !== 'fault').length
  const fs2pct = firstServe2.length ? Math.round((firstServeIn2 / firstServe2.length) * 100) : 0

  const avgRally = allPoints.length
    ? (allPoints.reduce((s: number, p: Point) => s + (p.rally_length ?? 0), 0) / allPoints.length).toFixed(1)
    : '—'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/matches" className="text-zinc-400 hover:text-zinc-100">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-semibold">
            {p1} vs {p2}
          </h1>
        </div>
        {match.status === 'in_progress' && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/matches/${id}/live`}>
              <Radio className="h-4 w-4" />
              Live
            </Link>
          </Button>
        )}
      </div>

      <div className="text-xs text-zinc-500">
        {match.match_type} · {formatDate(match.created_at)} ·{' '}
        {match.status === 'in_progress' ? (
          <Badge variant="serve" className="animate-pulse">Live</Badge>
        ) : match.status === 'completed' ? (
          <Badge variant="success">Completed</Badge>
        ) : (
          <Badge variant="outline">Pending</Badge>
        )}
      </div>

      {/* Set scores */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-[1fr_repeat(6,_auto)] items-center gap-3 text-sm">
            <div />
            {match.sets?.map((_: unknown, i: number) => (
              <div key={i} className="text-center text-xs text-zinc-500">S{i + 1}</div>
            ))}
            <div className="font-medium">{p1}</div>
            {match.sets?.map((s: { team1_games: number; winner: string | null }, i: number) => (
              <div key={i} className={`text-center font-mono font-semibold ${s.winner === 'team1' ? 'text-white' : 'text-zinc-400'}`}>
                {s.team1_games}
              </div>
            ))}
            <div className="font-medium">{p2}</div>
            {match.sets?.map((s: { team2_games: number; winner: string | null }, i: number) => (
              <div key={i} className={`text-center font-mono font-semibold ${s.winner === 'team2' ? 'text-white' : 'text-zinc-400'}`}>
                {s.team2_games}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Match stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <StatRow label="Points won" v1={team1Points} v2={team2Points} />
          <StatRow label="Aces" v1={aces1} v2={aces2} />
          <StatRow label="Double faults" v1={df1} v2={df2} lower />
          <StatRow label="Winners" v1={winners1} v2={winners2} />
          <StatRow label="Unforced errors" v1={ue1} v2={ue2} lower />
          <StatRow label="1st serve %" v1={`${fs1pct}%`} v2={`${fs2pct}%`} />
          <div className="flex items-center justify-center gap-2 pt-1 text-xs text-zinc-500">
            <span>Avg rally: <span className="text-zinc-300">{avgRally} shots</span></span>
            <span>·</span>
            <span>Total points: <span className="text-zinc-300">{allPoints.length}</span></span>
          </div>
        </CardContent>
      </Card>

      {/* Point log */}
      {allPoints.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-400">Point log</h2>
          <div className="space-y-1">
            {[...allPoints].reverse().map((pt: Point, i: number) => (
              <PointRow key={pt.id} point={pt} index={allPoints.length - i} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatRow({ label, v1, v2, lower }: { label: string; v1: string | number; v2: string | number; lower?: boolean }) {
  const n1 = typeof v1 === 'number' ? v1 : parseFloat(v1)
  const n2 = typeof v2 === 'number' ? v2 : parseFloat(v2)
  const t1Better = lower ? n1 < n2 : n1 > n2
  const t2Better = lower ? n2 < n1 : n2 > n1
  return (
    <div className="flex items-center gap-3">
      <span className={`w-10 text-right font-mono font-medium ${t1Better ? 'text-white' : 'text-zinc-400'}`}>{v1}</span>
      <span className="flex-1 text-center text-xs text-zinc-500">{label}</span>
      <span className={`w-10 text-left font-mono font-medium ${t2Better ? 'text-white' : 'text-zinc-400'}`}>{v2}</span>
    </div>
  )
}

function PointRow({ point, index }: { point: Point; index: number }) {
  const outcomeLabel: Record<string, string> = {
    ace: 'Ace',
    winner: 'Winner',
    error: 'Error',
    unforced_error: 'UE',
    double_fault: 'DF',
  }
  const shotLabel: Record<string, string> = {
    forehand: 'FH',
    backhand: 'BH',
    forehand_volley: 'FH Vol',
    backhand_volley: 'BH Vol',
    overhead: 'OH',
    lob: 'Lob',
    drop_shot: 'Drop',
    serve: 'Serve',
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-zinc-800/50 px-3 py-2 text-xs">
      <span className="w-5 text-zinc-600">#{index}</span>
      <span className="text-zinc-500">{point.serve_number}st</span>
      {point.outcome && (
        <Badge variant={point.outcome === 'winner' || point.outcome === 'ace' ? 'success' : point.outcome === 'unforced_error' || point.outcome === 'error' ? 'destructive' : 'default'} className="text-xs">
          {outcomeLabel[point.outcome] ?? point.outcome}
        </Badge>
      )}
      {point.last_shot_type && (
        <span className="text-zinc-400">{shotLabel[point.last_shot_type] ?? point.last_shot_type}</span>
      )}
      {point.error_direction && (
        <span className="text-zinc-500">· {point.error_direction}</span>
      )}
      <span className="ml-auto text-zinc-600">{point.rally_length}x</span>
      <span className={`font-medium ${point.point_winner === 'team1' ? 'text-white' : 'text-zinc-400'}`}>
        {point.point_winner === 'team1' ? 'P1' : 'P2'}
      </span>
    </div>
  )
}
