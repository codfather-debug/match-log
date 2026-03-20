'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { computeStats } from '@/lib/stats'
import { formatDate } from '@/lib/utils'
import type { Point } from '@/types/tennis'

type Opponent = { id: string; name: string; handedness: string | null; nationality: string | null }
type GameRow = { id: string; points: Point[] }
type SetRow = { id: string; winner: string | null; team1_games: number; team2_games: number; games: GameRow[] }
type MatchRow = {
  id: string; winner: string | null; match_type: string; status: string
  created_at: string; started_at: string | null
  player1?: { id: string; name: string } | null
  player2?: { id: string; name: string } | null
  sets: SetRow[]
}

type StatTab = 'all' | 'serves' | 'winners' | 'ue' | 'returns'

export function HeadToHeadClient({ opponent, matches }: { opponent: Opponent; matches: MatchRow[] }) {
  const [activeTab, setActiveTab] = useState<StatTab>('all')

  const completed = matches.filter(m => m.status === 'completed')
  const wins = completed.filter(m => m.winner === 'team1').length
  const losses = completed.filter(m => m.winner === 'team2').length

  const p1Name = matches[0]?.player1?.name ?? 'You'

  const allPoints = useMemo(() =>
    matches.flatMap(m => m.sets.flatMap(s => s.games.flatMap(g => g.points ?? [])))
  , [matches])

  const s = useMemo(() => computeStats(allPoints), [allPoints])

  const statTabs: { id: StatTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'serves', label: 'Serves' },
    { id: 'winners', label: 'Winners' },
    { id: 'ue', label: 'UErrors' },
    { id: 'returns', label: 'Returns' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/stats" className="text-zinc-400 hover:text-zinc-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">vs {opponent.name}</h1>
          <p className="text-xs text-zinc-500">Head-to-head</p>
        </div>
      </div>

      {/* W/L record */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center"><div className="text-3xl font-bold text-emerald-400">{wins}</div><div className="text-xs text-zinc-400 mt-0.5">Wins</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-3xl font-bold text-red-400">{losses}</div><div className="text-xs text-zinc-400 mt-0.5">Losses</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-3xl font-bold">{completed.length}</div><div className="text-xs text-zinc-400 mt-0.5">Played</div></CardContent></Card>
      </div>

      {/* Win rate bar */}
      {completed.length > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Win rate vs {opponent.name}</span>
            <span>{Math.round((wins / completed.length) * 100)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(wins / completed.length) * 100}%` }} />
          </div>
        </div>
      )}

      {allPoints.length > 0 && (
        <>
          {/* Stat tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {statTabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === tab.id ? 'border-white bg-zinc-700 text-white' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'all' && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Combined stats</CardTitle>
                  <div className="flex gap-6 text-xs font-medium">
                    <span className="text-blue-400">{p1Name}</span>
                    <span className="text-rose-400">{opponent.name}</span>
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
                <div className="flex items-center justify-center pt-1 text-xs text-zinc-500">
                  Avg rally: <span className="ml-1 text-zinc-300">{s.avgRally} shots</span>
                  <span className="mx-2">·</span>
                  <span className="text-zinc-300">{allPoints.length} pts total</span>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'serves' && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Serve stats</CardTitle>
                  <div className="flex gap-6 text-xs font-medium">
                    <span className="text-blue-400">{p1Name}</span>
                    <span className="text-rose-400">{opponent.name}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <StatRow label="1st serve %" v1={`${s.fs1pct}%`} v2={`${s.fs2pct}%`} />
                <StatRow label="1st in" v1={`${s.fs1In}/${s.p1Total}`} v2={`${s.fs2In}/${s.p2Total}`} />
                <StatRow label="Aces" v1={s.aces1} v2={s.aces2} />
                <StatRow label="Double faults" v1={s.df1} v2={s.df2} lower />
                <StatRow label="1st serve won %" v1={s.fs1In ? `${Math.round((s.fsWon1/s.fs1In)*100)}%` : '—'} v2={s.fs2In ? `${Math.round((s.fsWon2/s.fs2In)*100)}%` : '—'} />
                <StatRow label="2nd serve won %" v1={s.ss1Total ? `${Math.round((s.ssWon1/s.ss1Total)*100)}%` : '—'} v2={s.ss2Total ? `${Math.round((s.ssWon2/s.ss2Total)*100)}%` : '—'} />
              </CardContent>
            </Card>
          )}

          {activeTab === 'winners' && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Winners</CardTitle>
                  <div className="flex gap-6 text-xs font-medium">
                    <span className="text-blue-400">{p1Name}</span>
                    <span className="text-rose-400">{opponent.name}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <StatRow label="Total" v1={s.winners1} v2={s.winners2} />
                {Object.keys({...s.winnerStrokes1, ...s.winnerStrokes2}).map(shot => {
                  const v1 = s.winnerStrokes1[shot] ?? 0
                  const v2 = s.winnerStrokes2[shot] ?? 0
                  if (v1 + v2 === 0) return null
                  return <StatRow key={shot} label={SHOT_LABEL[shot] ?? shot} v1={v1} v2={v2} />
                })}
              </CardContent>
            </Card>
          )}

          {activeTab === 'ue' && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Unforced errors</CardTitle>
                  <div className="flex gap-6 text-xs font-medium">
                    <span className="text-blue-400">{p1Name}</span>
                    <span className="text-rose-400">{opponent.name}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <StatRow label="Total" v1={s.ue1} v2={s.ue2} lower />
                {Object.keys({...s.ueStrokes1, ...s.ueStrokes2}).map(shot => {
                  const v1 = s.ueStrokes1[shot] ?? 0
                  const v2 = s.ueStrokes2[shot] ?? 0
                  if (v1 + v2 === 0) return null
                  return <StatRow key={shot} label={SHOT_LABEL[shot] ?? shot} v1={v1} v2={v2} lower />
                })}
              </CardContent>
            </Card>
          )}

          {activeTab === 'returns' && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Returns</CardTitle>
                  <div className="flex gap-6 text-xs font-medium">
                    <span className="text-blue-400">{p1Name}</span>
                    <span className="text-rose-400">{opponent.name}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <StatRow label="Returns faced" v1={s.retTotal1} v2={s.retTotal2} />
                <StatRow
                  label="Return in-play %"
                  v1={s.retTotal1 ? `${Math.round((s.retSucc1/s.retTotal1)*100)}%` : '—'}
                  v2={s.retTotal2 ? `${Math.round((s.retSucc2/s.retTotal2)*100)}%` : '—'}
                />
                <StatRow
                  label="vs 1st serve"
                  v1={s.retTotal1by1 ? `${Math.round((s.retSucc1by1/s.retTotal1by1)*100)}%` : '—'}
                  v2={s.retTotal2by1 ? `${Math.round((s.retSucc2by1/s.retTotal2by1)*100)}%` : '—'}
                />
                <StatRow
                  label="vs 2nd serve"
                  v1={s.retTotal1by2 ? `${Math.round((s.retSucc1by2/s.retTotal1by2)*100)}%` : '—'}
                  v2={s.retTotal2by2 ? `${Math.round((s.retSucc2by2/s.retTotal2by2)*100)}%` : '—'}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Match history */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-400">Match history</h2>
        <div className="space-y-2">
          {matches.map(m => {
            const result = m.status === 'completed'
              ? m.winner === 'team1' ? 'W' : 'L'
              : null
            const sets = m.sets.filter(s => s.winner)
            return (
              <Link key={m.id} href={`/matches/${m.id}`}>
                <Card className="hover:border-zinc-700 transition-colors">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-xs text-zinc-500">{formatDate(m.created_at)} · {m.match_type}</p>
                      {sets.length > 0 && (
                        <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                          {sets.map(s => `${s.team1_games}–${s.team2_games}`).join('  ')}
                        </p>
                      )}
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
      </div>
    </div>
  )
}

const SHOT_LABEL: Record<string, string> = {
  forehand: 'Forehand', backhand: 'Backhand', forehand_volley: 'FH Volley',
  backhand_volley: 'BH Volley', overhead: 'Overhead', lob: 'Lob',
  drop_shot: 'Drop shot', serve: 'Serve', return: 'Return',
}

function StatRow({ label, v1, v2, lower }: { label: string; v1: string | number; v2: string | number; lower?: boolean }) {
  const better = (a: string | number, b: string | number) => {
    const na = typeof a === 'string' ? parseFloat(a) : a
    const nb = typeof b === 'string' ? parseFloat(b) : b
    if (isNaN(na) || isNaN(nb)) return null
    return lower ? (na < nb ? 1 : na > nb ? 2 : null) : (na > nb ? 1 : na < nb ? 2 : null)
  }
  const best = better(v1, v2)
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-0.5">
      <span className={`text-right font-medium ${best === 1 ? 'text-white' : 'text-zinc-400'}`}>{v1}</span>
      <span className="text-center text-xs text-zinc-500 w-28">{label}</span>
      <span className={`text-left font-medium ${best === 2 ? 'text-white' : 'text-zinc-400'}`}>{v2}</span>
    </div>
  )
}
