'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Radio, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Point } from '@/types/tennis'

type GameRow = { id: string; server: string; is_tiebreak: boolean; points: Point[] }
type SetRow = {
  id: string; set_number: number; team1_games: number; team2_games: number
  winner: string | null; is_tiebreak: boolean; is_super_tiebreak: boolean
  games: GameRow[]
}

type Props = {
  id: string
  p1: string
  p2: string
  status: string
  winner: string | null
  matchType: string
  createdAt: string
  sets: SetRow[]
}

function computeStats(points: Point[]) {
  const p1Pts = points.filter(p => p.server === 'player1')
  const p2Pts = points.filter(p => p.server === 'player2')
  const fs1In = p1Pts.filter(p => p.serve_number === 1).length
  const fs2In = p2Pts.filter(p => p.serve_number === 1).length
  const ss1Total = p1Pts.filter(p => p.serve_number === 2).length
  const ss2Total = p2Pts.filter(p => p.serve_number === 2).length

  return {
    team1Points: points.filter(p => p.point_winner === 'team1').length,
    team2Points: points.filter(p => p.point_winner === 'team2').length,
    aces1: points.filter(p => p.outcome === 'ace' && p.server === 'player1').length,
    aces2: points.filter(p => p.outcome === 'ace' && p.server === 'player2').length,
    winners1: points.filter(p => p.outcome === 'winner' && p.point_winner === 'team1').length,
    winners2: points.filter(p => p.outcome === 'winner' && p.point_winner === 'team2').length,
    ue1: points.filter(p => p.outcome === 'unforced_error' && p.point_winner === 'team2').length,
    ue2: points.filter(p => p.outcome === 'unforced_error' && p.point_winner === 'team1').length,
    df1: points.filter(p => p.outcome === 'double_fault' && p.server === 'player1').length,
    df2: points.filter(p => p.outcome === 'double_fault' && p.server === 'player2').length,
    fs1In, fs2In,
    fs1pct: p1Pts.length ? Math.round((fs1In / p1Pts.length) * 100) : 0,
    fs2pct: p2Pts.length ? Math.round((fs2In / p2Pts.length) * 100) : 0,
    fsWon1: p1Pts.filter(p => p.serve_number === 1 && p.point_winner === 'team1').length,
    ssWon1: p1Pts.filter(p => p.serve_number === 2 && p.point_winner === 'team1').length,
    fsWon2: p2Pts.filter(p => p.serve_number === 1 && p.point_winner === 'team2').length,
    ssWon2: p2Pts.filter(p => p.serve_number === 2 && p.point_winner === 'team2').length,
    ss1Total, ss2Total,
    fsRetWon1: p2Pts.filter(p => p.serve_number === 1 && p.point_winner === 'team1').length,
    ssRetWon1: p2Pts.filter(p => p.serve_number === 2 && p.point_winner === 'team1').length,
    fsRetWon2: p1Pts.filter(p => p.serve_number === 1 && p.point_winner === 'team2').length,
    ssRetWon2: p1Pts.filter(p => p.serve_number === 2 && p.point_winner === 'team2').length,
    avgRally: points.length
      ? (points.reduce((s, p) => s + (p.rally_length ?? 0), 0) / points.length).toFixed(1)
      : '—',
  }
}

export function MatchClient({ id, p1, p2, status, winner, matchType, createdAt, sets }: Props) {
  const router = useRouter()
  const [activeSet, setActiveSet] = useState<'all' | number>('all')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    // Delete in dependency order (points → games → sets → match)
    const setIds = sets.map(s => s.id)
    const gameIds = sets.flatMap(s => s.games.map(g => g.id))
    if (gameIds.length) await supabase.from('points').delete().in('game_id', gameIds)
    if (gameIds.length) await supabase.from('games').delete().in('id', gameIds)
    if (setIds.length) await supabase.from('sets').delete().in('id', setIds)
    await supabase.from('matches').delete().eq('id', id)
    router.push('/matches')
  }

  const allPoints: Point[] = sets.flatMap(s => s.games.flatMap(g => g.points ?? []))
  const filteredPoints: Point[] = activeSet === 'all'
    ? allPoints
    : (sets.find(s => s.set_number === activeSet)?.games.flatMap(g => g.points ?? []) ?? [])

  const s = computeStats(filteredPoints)

  const t1Sets = sets.filter(s => s.winner === 'team1').length
  const t2Sets = sets.filter(s => s.winner === 'team2').length
  const winnerName = winner === 'team1' ? p1 : winner === 'team2' ? p2 : null

  return (
    <div className="space-y-6">
      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-6 space-y-4">
            <h2 className="text-base font-semibold">Delete match?</h2>
            <p className="text-sm text-zinc-400">This will permanently delete the match and all its points. This cannot be undone.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/matches" className="text-zinc-400 hover:text-zinc-100">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-semibold">{p1} vs {p2}</h1>
        </div>
        <div className="flex items-center gap-2">
          {status === 'in_progress' && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/matches/${id}/live`}>
                <Radio className="h-4 w-4" />
                Live
              </Link>
            </Button>
          )}
          <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center justify-center rounded-md p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="text-xs text-zinc-500">
        {matchType} · {formatDate(createdAt)} ·{' '}
        {status === 'in_progress' ? (
          <Badge variant="serve" className="animate-pulse">Live</Badge>
        ) : status === 'completed' ? (
          <Badge variant="success">Completed</Badge>
        ) : (
          <Badge variant="outline">Pending</Badge>
        )}
      </div>

      {/* Match score headline */}
      <Card className="border-zinc-800">
        <CardContent className="p-4">
          {winnerName && (
            <p className="mb-3 text-center text-xs font-medium text-emerald-400">{winnerName} wins</p>
          )}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="text-right">
              <p className={`text-sm font-medium ${winner === 'team1' ? 'text-white' : 'text-zinc-400'}`}>{p1}</p>
              <p className="mt-0.5 font-mono text-4xl font-bold">{t1Sets}</p>
            </div>
            <p className="text-xl text-zinc-600">–</p>
            <div className="text-left">
              <p className={`text-sm font-medium ${winner === 'team2' ? 'text-white' : 'text-zinc-400'}`}>{p2}</p>
              <p className="mt-0.5 font-mono text-4xl font-bold">{t2Sets}</p>
            </div>
          </div>

          {/* Per-set game scores */}
          {sets.length > 0 && (
            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-zinc-500">
              {sets.map((set) => (
                <span key={set.id} className={`font-mono ${set.winner === 'team1' ? 'text-blue-400' : set.winner === 'team2' ? 'text-rose-400' : 'text-zinc-400'}`}>
                  {set.team1_games}–{set.team2_games}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Point flow chart (always full match) */}
      {allPoints.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Point flow</CardTitle>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-400 inline-block" />{p1}</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400 inline-block" />{p2}</span>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <TugOfWarChart points={allPoints} p1Name={p1} p2Name={p2} />
          </CardContent>
        </Card>
      )}

      {/* Set filter tabs */}
      {sets.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {(['all', ...sets.map(s => s.set_number)] as ('all' | number)[]).map((tab) => {
            const label = tab === 'all' ? 'Match' : `Set ${tab}`
            return (
              <button
                key={tab}
                onClick={() => setActiveSet(tab)}
                className={`flex-shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                  activeSet === tab
                    ? 'border-white bg-zinc-700 text-white'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {/* Stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              {activeSet === 'all' ? 'Match stats' : `Set ${activeSet} stats`}
            </CardTitle>
            <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 text-xs">
              <span className="text-right font-medium text-blue-400">{p1}</span>
              <span />
              <span className="text-left font-medium text-rose-400">{p2}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <StatRow label="Points won" v1={s.team1Points} v2={s.team2Points} />
          <StatRow label="Aces" v1={s.aces1} v2={s.aces2} />
          <StatRow label="Double faults" v1={s.df1} v2={s.df2} lower />
          <StatRow label="Winners" v1={s.winners1} v2={s.winners2} />
          <StatRow label="Unforced errors" v1={s.ue1} v2={s.ue2} lower />
          <StatRow label="1st serve %" v1={`${s.fs1pct}%`} v2={`${s.fs2pct}%`} />
          <StatRow label="1st serve won" v1={`${s.fsWon1}/${s.fs1In}`} v2={`${s.fsWon2}/${s.fs2In}`} />
          <StatRow label="2nd serve won" v1={`${s.ssWon1}/${s.ss1Total}`} v2={`${s.ssWon2}/${s.ss2Total}`} />
          <StatRow label="1st return won" v1={`${s.fsRetWon1}/${s.fs2In}`} v2={`${s.fsRetWon2}/${s.fs1In}`} />
          <StatRow label="2nd return won" v1={`${s.ssRetWon1}/${s.ss2Total}`} v2={`${s.ssRetWon2}/${s.ss1Total}`} />
          <div className="flex items-center justify-center gap-2 pt-1 text-xs text-zinc-500">
            <span>Avg rally: <span className="text-zinc-300">{s.avgRally} shots</span></span>
            <span>·</span>
            <span>Total points: <span className="text-zinc-300">{filteredPoints.length}</span></span>
          </div>
        </CardContent>
      </Card>

      {/* Point log */}
      {filteredPoints.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-400">Point log</h2>
          <div className="space-y-1">
            {filteredPoints.map((pt, i) => (
              <PointRow key={pt.id} point={pt} index={i + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TugOfWarChart({ points, p1Name, p2Name }: { points: Point[]; p1Name: string; p2Name: string }) {
  const W = 320, H = 100, pad = 8
  const values: number[] = [0]
  for (const pt of points) values.push(values[values.length - 1] + (pt.point_winner === 'team1' ? 1 : -1))
  const min = Math.min(...values), max = Math.max(...values)
  const range = Math.max(max - min, 1)
  const xStep = (W - pad * 2) / Math.max(values.length - 1, 1)
  const toY = (v: number) => pad + ((max - v) / range) * (H - pad * 2)
  const midY = toY(0)
  const pts = values.map((v, i) => `${pad + i * xStep},${toY(v)}`).join(' ')
  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        <line x1={pad} y1={midY} x2={W - pad} y2={midY} stroke="#3f3f46" strokeWidth="1" strokeDasharray="4,3" />
        <polyline points={`${pad},${midY} ${pts} ${pad + (values.length - 1) * xStep},${midY}`} fill="rgba(96,165,250,0.15)" stroke="none" />
        <polyline points={`${pad},${midY} ${pts} ${pad + (values.length - 1) * xStep},${midY}`} fill="rgba(251,113,133,0.15)" stroke="none" />
        <polyline points={pts} fill="none" stroke="#a1a1aa" strokeWidth="1.5" strokeLinejoin="round" />
        {values.slice(0, -1).map((v, i) => (
          <line key={i} x1={pad + i * xStep} y1={toY(v)} x2={pad + (i + 1) * xStep} y2={toY(values[i + 1])}
            stroke={points[i]?.point_winner === 'team1' ? '#60a5fa' : '#fb7185'} strokeWidth="2" strokeLinecap="round" />
        ))}
        <circle cx={pad + (values.length - 1) * xStep} cy={toY(values[values.length - 1])} r="3"
          fill={values[values.length - 1] >= 0 ? '#60a5fa' : '#fb7185'} />
      </svg>
      <div className="flex justify-between text-xs text-zinc-600 px-1">
        <span className="text-blue-400">{p1Name} leading ↑</span>
        <span className="text-rose-400">↓ {p2Name} leading</span>
      </div>
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
      <span className={`w-12 text-right font-mono font-medium ${t1Better ? 'text-white' : 'text-zinc-400'}`}>{v1}</span>
      <span className="flex-1 text-center text-xs text-zinc-500">{label}</span>
      <span className={`w-12 text-left font-mono font-medium ${t2Better ? 'text-white' : 'text-zinc-400'}`}>{v2}</span>
    </div>
  )
}

function PointRow({ point, index }: { point: Point; index: number }) {
  const outcomeLabel: Record<string, string> = { ace: 'Ace', winner: 'Winner', error: 'Error', unforced_error: 'UE', double_fault: 'DF' }
  const shotLabel: Record<string, string> = {
    forehand: 'FH', backhand: 'BH', forehand_volley: 'FH Vol', backhand_volley: 'BH Vol',
    overhead: 'OH', lob: 'Lob', drop_shot: 'Drop', serve: 'Serve', return: 'Ret',
  }
  return (
    <div className="flex items-center gap-2 rounded-md border border-zinc-800/50 px-3 py-2 text-xs">
      <span className="w-5 text-zinc-600">#{index}</span>
      <span className="text-zinc-500">{point.serve_number === 1 ? '1st' : '2nd'}</span>
      {point.outcome && (
        <Badge
          variant={point.outcome === 'winner' || point.outcome === 'ace' ? 'success' : point.outcome === 'unforced_error' || point.outcome === 'error' ? 'destructive' : 'default'}
          className="text-xs"
        >
          {outcomeLabel[point.outcome] ?? point.outcome}
        </Badge>
      )}
      {point.last_shot_type && <span className="text-zinc-400">{shotLabel[point.last_shot_type] ?? point.last_shot_type}</span>}
      {point.error_direction && <span className="text-zinc-500">· {point.error_direction}</span>}
      <span className="ml-auto text-zinc-600">{point.rally_length}x</span>
      <span className={`font-medium ${point.point_winner === 'team1' ? 'text-white' : 'text-zinc-400'}`}>
        {point.point_winner === 'team1' ? 'P1' : 'P2'}
      </span>
    </div>
  )
}
