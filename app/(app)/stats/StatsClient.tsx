'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { computeStats } from '@/lib/stats'
import type { Point } from '@/types/tennis'

type Player = { id: string; name: string }
type GameRow = { id: string; points: Point[] }
type SetRow = { id: string; winner: string | null; games: GameRow[] }
type MatchRow = {
  id: string
  winner: string | null
  match_type: string
  created_at: string
  player1?: Player | null
  player2?: Player | null
  player3?: Player | null
  player4?: Player | null
  sets: SetRow[]
}

type StatTab = 'all' | 'serves' | 'winners' | 'ue' | 'returns'

export function StatsClient({ matches }: { matches: MatchRow[] }) {
  const [activeTab, setActiveTab] = useState<StatTab>('all')

  const wins = matches.filter(m => m.winner === 'team1').length
  const losses = matches.filter(m => m.winner === 'team2').length
  const total = matches.length

  const allPoints = useMemo(() =>
    matches.flatMap(m => m.sets.flatMap(s => s.games.flatMap(g => g.points ?? [])))
  , [matches])

  const s = useMemo(() => computeStats(allPoints), [allPoints])

  // Per-opponent records
  const opponentRecords = useMemo(() => {
    const map: Record<string, { name: string; wins: number; losses: number }> = {}
    for (const m of matches) {
      const oppName = m.player2?.name ?? 'Unknown'
      if (!map[oppName]) map[oppName] = { name: oppName, wins: 0, losses: 0 }
      if (m.winner === 'team1') map[oppName].wins++
      else map[oppName].losses++
    }
    return Object.values(map).sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses))
  }, [matches])

  const statTabs: { id: StatTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'serves', label: 'Serves' },
    { id: 'winners', label: 'Winners' },
    { id: 'ue', label: 'UErrors' },
    { id: 'returns', label: 'Returns' },
  ]

  if (total === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">My Stats</h1>
        <p className="text-sm text-zinc-400">No completed matches yet. Finish a match to see your stats.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">My Stats</h1>

      {/* W/L Record */}
      <div className="grid grid-cols-3 gap-3">
        <RecordCard label="Wins" value={wins} color="text-emerald-400" />
        <RecordCard label="Losses" value={losses} color="text-red-400" />
        <RecordCard label="Matches" value={total} />
      </div>

      {/* Win % bar */}
      {total > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Win rate</span>
            <span>{Math.round((wins / total) * 100)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(wins / total) * 100}%` }} />
          </div>
        </div>
      )}

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
          <CardHeader className="pb-3"><CardTitle className="text-sm">Overall — {allPoints.length} points logged</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <StatRow label="Points won" value={`${s.team1Points} / ${allPoints.length}`} />
            <StatRow label="1st serve %" value={`${s.fs1pct}%`} />
            <StatRow label="Aces" value={s.aces1} />
            <StatRow label="Double faults" value={s.df1} />
            <StatRow label="Winners" value={s.winners1} />
            <StatRow label="Unforced errors" value={s.ue1} />
            <StatRow label="Avg rally" value={`${s.avgRally} shots`} />
            <StatRow label="1st serve won %" value={s.fs1In ? `${Math.round((s.fsWon1 / s.fs1In) * 100)}%` : '—'} />
            <StatRow label="2nd serve won %" value={s.ss1Total ? `${Math.round((s.ssWon1 / s.ss1Total) * 100)}%` : '—'} />
            <StatRow label="Return in-play %" value={s.retTotal1 ? `${Math.round((s.retSucc1 / s.retTotal1) * 100)}%` : '—'} />
          </CardContent>
        </Card>
      )}

      {activeTab === 'serves' && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Serve stats</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <StatRow label="1st serve %" value={`${s.fs1pct}%`} />
            <StatRow label="1st serve in" value={`${s.fs1In} / ${s.p1Total}`} />
            <StatRow label="2nd serve in" value={`${s.ss1Total - s.df1} / ${s.ss1Total}`} />
            <StatRow label="Aces" value={s.aces1} />
            <StatRow label="Double faults" value={s.df1} />
            <StatRow label="1st serve won %" value={s.fs1In ? `${Math.round((s.fsWon1 / s.fs1In) * 100)}%` : '—'} />
            <StatRow label="2nd serve won %" value={s.ss1Total ? `${Math.round((s.ssWon1 / s.ss1Total) * 100)}%` : '—'} />
            <Divider label="Serve locations (1st in)" />
            {(['T', 'body', 'wide'] as const).map(loc => {
              const v = s.svcLoc1by1[loc] ?? 0
              if (v === 0) return null
              return <StatRow key={loc} label={loc === 'T' ? 'T' : loc === 'body' ? 'Body' : 'Wide'} value={v} />
            })}
          </CardContent>
        </Card>
      )}

      {activeTab === 'winners' && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Winners</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <StatRow label="Total" value={s.winners1} />
            <Divider label="By stroke" />
            {Object.entries(s.winnerStrokes1).sort((a, b) => b[1] - a[1]).map(([shot, n]) => (
              <StatRow key={shot} label={SHOT_LABEL[shot] ?? shot} value={n} bar max={s.winners1} />
            ))}
          </CardContent>
        </Card>
      )}

      {activeTab === 'ue' && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Unforced errors</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <StatRow label="Total" value={s.ue1} />
            <Divider label="By stroke" />
            {Object.entries(s.ueStrokes1).sort((a, b) => b[1] - a[1]).map(([shot, n]) => (
              <StatRow key={shot} label={SHOT_LABEL[shot] ?? shot} value={n} bar max={s.ue1} />
            ))}
            <Divider label="Error direction" />
            {(['long', 'wide', 'net'] as const).map(dir => {
              const v = s.ueDirs1[dir] ?? 0
              if (v === 0) return null
              return <StatRow key={dir} label={dir[0].toUpperCase() + dir.slice(1)} value={v} bar max={s.ue1} />
            })}
          </CardContent>
        </Card>
      )}

      {activeTab === 'returns' && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Returns</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <StatRow label="Returns faced" value={s.retTotal1} />
            <StatRow label="Return in-play %" value={s.retTotal1 ? `${Math.round((s.retSucc1 / s.retTotal1) * 100)}%` : '—'} />
            <Divider label="By serve number" />
            <StatRow label="vs 1st serve in-play %" value={s.retTotal1by1 ? `${Math.round((s.retSucc1by1 / s.retTotal1by1) * 100)}%` : '—'} />
            <StatRow label="vs 2nd serve in-play %" value={s.retTotal1by2 ? `${Math.round((s.retSucc1by2 / s.retTotal1by2) * 100)}%` : '—'} />
            <Divider label="By serve location" />
            {(['T', 'body', 'wide'] as const).map(loc => {
              const t = s.retLocTotal1[loc] ?? 0
              const sv = s.retLocSucc1[loc] ?? 0
              if (t === 0) return null
              return <StatRow key={loc} label={loc === 'T' ? 'T' : loc === 'body' ? 'Body' : 'Wide'} value={t ? `${Math.round((sv / t) * 100)}% (${sv}/${t})` : '—'} />
            })}
          </CardContent>
        </Card>
      )}

      {/* Per-opponent records */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-400">vs Opponents</h2>
        {opponentRecords.map(opp => (
          <Card key={opp.name}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium">{opp.name}</p>
                <p className="text-xs text-zinc-500">{opp.wins + opp.losses} match{opp.wins + opp.losses !== 1 ? 'es' : ''}</p>
              </div>
              <div className="flex items-center gap-3 font-mono text-sm">
                <span className="text-emerald-400 font-bold">{opp.wins}W</span>
                <span className="text-zinc-600">–</span>
                <span className="text-red-400 font-bold">{opp.losses}L</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

const SHOT_LABEL: Record<string, string> = {
  forehand: 'Forehand', backhand: 'Backhand', forehand_volley: 'FH Volley',
  backhand_volley: 'BH Volley', overhead: 'Overhead', lob: 'Lob',
  drop_shot: 'Drop shot', serve: 'Serve', return: 'Return',
}

function RecordCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className={`text-3xl font-bold ${color ?? ''}`}>{value}</div>
        <div className="text-xs text-zinc-400 mt-0.5">{label}</div>
      </CardContent>
    </Card>
  )
}

function StatRow({ label, value, bar, max }: { label: string; value: string | number; bar?: boolean; max?: number }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-zinc-400">{label}</span>
      <div className="flex items-center gap-2">
        {bar && max && typeof value === 'number' && (
          <div className="h-1.5 w-16 rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full rounded-full bg-blue-400" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
          </div>
        )}
        <span className="font-medium text-zinc-100">{value}</span>
      </div>
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="h-px flex-1 bg-zinc-800" />
      <span className="text-xs text-zinc-500">{label}</span>
      <div className="h-px flex-1 bg-zinc-800" />
    </div>
  )
}
