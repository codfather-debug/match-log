'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Radio, Trash2, Sparkles, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { computeStats } from '@/lib/stats'
import type { Point } from '@/types/tennis'

type GameRow = { id: string; server: string; game_number: number; is_tiebreak: boolean; points: Point[] }
type SetRow = {
  id: string; set_number: number; team1_games: number; team2_games: number
  winner: string | null; is_tiebreak: boolean; is_super_tiebreak: boolean
  games: GameRow[]
}

type WeatherSnapshot = {
  temp: number; feels_like: number; wind_mph: number; gust_mph: number
  precip_in: number; condition: string
} | null

type Props = {
  id: string; p1: string; p2: string; p3?: string; p4?: string
  status: string; winner: string | null
  matchType: string; createdAt: string; sets: SetRow[]
  notes?: string | null; weather?: WeatherSnapshot
  surface?: string | null
  rating?: number | null
}

type StatTab = 'all' | 'serves' | 'aces' | 'df' | 'winners' | 'ue' | 'returns' | 'tiebreaks'

export function MatchClient({ id, p1, p2, p3, p4, status, winner, matchType, createdAt, sets, notes, weather, surface, rating: initialRating }: Props) {
  const isDoubles = matchType === 'doubles'
  const router = useRouter()
  const [activeSet, setActiveSet] = useState<'all' | number>('all')
  const [activeTab, setActiveTab] = useState<StatTab>('all')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [notesValue, setNotesValue] = useState(notes ?? '')
  const [matchRating, setMatchRating] = useState<number | null>(initialRating ?? null)
  const [editingPoint, setEditingPoint] = useState<Point | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<Point>>({})
  const [editSaving, setEditSaving] = useState(false)

  async function handleRating(r: number) {
    const newRating = matchRating === r ? null : r
    setMatchRating(newRating)
    const supabase = createClient()
    await supabase.from('matches').update({ rating: newRating }).eq('id', id)
  }

  async function saveEditedPoint() {
    if (!editingPoint) return
    setEditSaving(true)
    const supabase = createClient()
    await supabase.from('points').update(editDraft).eq('id', editingPoint.id)
    setEditSaving(false)
    setEditingPoint(null)
    router.refresh()
  }

  useEffect(() => {
    const t = setTimeout(async () => {
      const supabase = createClient()
      await supabase.from('matches').update({ notes: notesValue }).eq('id', id)
    }, 1000)
    return () => clearTimeout(t)
  }, [notesValue])

  const allPoints: Point[] = sets.flatMap(s => s.games.flatMap(g => g.points ?? []))
  const filteredPoints: Point[] = activeSet === 'all'
    ? allPoints
    : (sets.find(s => s.set_number === activeSet)?.games.flatMap(g => g.points ?? []) ?? [])

  const s = computeStats(filteredPoints, sets.flatMap(s => s.games))

  const t1Sets = sets.filter(s => s.winner === 'team1').length
  const t2Sets = sets.filter(s => s.winner === 'team2').length
  const winnerName = winner === 'team1' ? p1 : winner === 'team2' ? p2 : null

  const fetchAI = useCallback(async () => {
    setLoadingAI(true)
    try {
      const res = await fetch('/api/match-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p1, p2, stats: s }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'API error')
      setAiSummary(data.summary)
    } catch (e) { setAiSummary('Unable to generate summary: ' + (e instanceof Error ? e.message : String(e))) }
    setLoadingAI(false)
  }, [p1, p2, JSON.stringify(s)])

  function exportMatch() {
    const gameMap: Record<string, { setNum: number; gameNum: number }> = {}
    sets.forEach(s => s.games.forEach(g => { gameMap[g.id] = { setNum: s.set_number, gameNum: g.game_number } }))
    const slotName = (slot: string) => slot === 'player1' ? p1 : slot === 'player2' ? p2 : slot === 'player3' ? (p3 ?? 'Opp 1') : (p4 ?? 'Opp 2')
    const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const row = (cells: unknown[]) => cells.map(q).join(',')
    const blank = ''

    // ── Section 1: Point by point ──────────────────────────────────────────
    const pointRows = [
      row(['POINT BY POINT']),
      row(['#', 'Set', 'Game', 'Server', 'Serve #', 'Placement', 'Outcome', 'Shot', 'Error Direction', 'Rally Length', 'Point Won By', 'Score Before']),
      ...allPoints.map((pt, i) => {
        const gm = gameMap[pt.game_id] ?? { setNum: '', gameNum: '' }
        const score = pt.score_before ? `${(pt.score_before as {team1:string}).team1}-${(pt.score_before as {team2:string}).team2}` : ''
        return row([i + 1, gm.setNum, gm.gameNum, slotName(pt.server), pt.serve_number, pt.serve_placement ?? '', pt.outcome ?? '', pt.last_shot_type ?? '', pt.error_direction ?? '', pt.rally_length ?? '', pt.point_winner === 'team1' ? p1 : pt.point_winner === 'team2' ? p2 : '', score])
      }),
    ]

    // ── Section 2: Point flow (cumulative, for charting) ───────────────────
    let c1 = 0, c2 = 0
    const flowRows = [
      blank,
      row(['POINT FLOW']),
      row(['Point #', `${p1} (cumulative)`, `${p2} (cumulative)`]),
      ...allPoints.map((pt, i) => {
        if (pt.point_winner === 'team1') c1++
        else if (pt.point_winner === 'team2') c2++
        return row([i + 1, c1, c2])
      }),
    ]

    // ── Section 3: Match stats ─────────────────────────────────────────────
    const st = computeStats(allPoints)
    const pct = (n: number, d: number) => d ? `${Math.round((n / d) * 100)}%` : '—'
    const statsRows = [
      blank,
      row(['MATCH STATS', p1, p2]),
      row(['Total Points Won', st.team1Points, st.team2Points]),
      blank,
      row(['SERVE']),
      row(['1st Serve %', `${st.fs1pct}%`, `${st.fs2pct}%`]),
      row(['1st Serve Points Won', `${st.fsWon1}/${st.fs1In}`, `${st.fsWon2}/${st.fs2In}`]),
      row(['2nd Serve Points Won', `${st.ssWon1}/${st.ss1Total}`, `${st.ssWon2}/${st.ss2Total}`]),
      row(['Aces', st.aces1, st.aces2]),
      row(['Double Faults', st.df1, st.df2]),
      blank,
      row(['RALLY']),
      row(['Winners', st.winners1, st.winners2]),
      row(['Unforced Errors', st.ue1, st.ue2]),
      row(['Avg Rally Length', st.avgRally, st.avgRally]),
      blank,
      row(['RETURN']),
      row(['1st Serve Return %', pct(st.retSucc1by1, st.retTotal1by1), pct(st.retSucc2by1, st.retTotal2by1)]),
      row(['2nd Serve Return %', pct(st.retSucc1by2, st.retTotal1by2), pct(st.retSucc2by2, st.retTotal2by2)]),
    ]

    const csv = [...pointRows, ...flowRows, ...statsRows].join('\n')
    const matchLabel = `${p1}_vs_${p2}_${formatDate(createdAt)}`.replace(/\s+/g, '_')
    const blob = new Blob([csv], { type: 'text/csv' })
    const file = new File([blob], `${matchLabel}.csv`, { type: 'text/csv' })
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [file] })) {
      navigator.share({ title: `${p1} vs ${p2} — Match Data`, files: [file] }).catch(() => {})
    } else {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${matchLabel}.csv`; a.click()
      URL.revokeObjectURL(url)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    const setIds = sets.map(s => s.id)
    const gameIds = sets.flatMap(s => s.games.map(g => g.id))
    if (gameIds.length) await supabase.from('points').delete().in('game_id', gameIds)
    if (gameIds.length) await supabase.from('games').delete().in('id', gameIds)
    if (setIds.length) await supabase.from('sets').delete().in('id', setIds)
    await supabase.from('matches').delete().eq('id', id)
    router.push('/matches')
  }

  const statTabs: { id: StatTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'serves', label: 'Serves' },
    { id: 'aces', label: 'Aces' },
    { id: 'df', label: 'Dbl Faults' },
    { id: 'winners', label: 'Winners' },
    { id: 'ue', label: 'UErrors' },
    { id: 'returns', label: 'Returns' },
    { id: 'tiebreaks', label: 'Tiebreaks' },
  ]

  return (
    <div className="space-y-6">
      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-6 space-y-4">
            <h2 className="text-base font-semibold">Delete match?</h2>
            <p className="text-sm text-zinc-400">This will permanently delete the match and all its points.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</Button>
            </div>
          </div>
        </div>
      )}

      {editingPoint && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-4">
          <div className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Edit point #{editingPoint.point_number}</h2>
              <button onClick={() => setEditingPoint(null)} className="text-zinc-500 hover:text-zinc-200 text-xs">Cancel</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="space-y-1">
                <p className="text-xs text-zinc-500">Point winner</p>
                <div className="flex gap-2">
                  {(['team1', 'team2'] as const).map(t => (
                    <button key={t} onClick={() => setEditDraft(d => ({ ...d, point_winner: t }))}
                      className={`flex-1 rounded-md border py-2 text-xs transition-colors ${(editDraft.point_winner ?? editingPoint.point_winner) === t ? 'border-white bg-zinc-700' : 'border-zinc-700 text-zinc-400'}`}>
                      {t === 'team1' ? p1 : p2}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-zinc-500">Outcome</p>
                <select
                  value={editDraft.outcome ?? editingPoint.outcome ?? ''}
                  onChange={e => setEditDraft(d => ({ ...d, outcome: e.target.value as Point['outcome'] }))}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200"
                >
                  <option value="winner">Winner</option>
                  <option value="unforced_error">Unforced Error</option>
                  <option value="error">Forced Error</option>
                  <option value="ace">Ace</option>
                  <option value="double_fault">Double Fault</option>
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-zinc-500">Last shot</p>
                <select
                  value={editDraft.last_shot_type ?? editingPoint.last_shot_type ?? ''}
                  onChange={e => setEditDraft(d => ({ ...d, last_shot_type: e.target.value as Point['last_shot_type'] }))}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200"
                >
                  <option value="">—</option>
                  <option value="forehand">Forehand</option>
                  <option value="backhand">Backhand</option>
                  <option value="return">Return</option>
                  <option value="forehand_volley">FH Volley</option>
                  <option value="backhand_volley">BH Volley</option>
                  <option value="overhead">Overhead</option>
                  <option value="lob">Lob</option>
                  <option value="drop_shot">Drop Shot</option>
                  <option value="serve">Serve</option>
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-zinc-500">Rally length</p>
                <input
                  type="number"
                  min={0}
                  value={editDraft.rally_length ?? editingPoint.rally_length ?? 0}
                  onChange={e => setEditDraft(d => ({ ...d, rally_length: parseInt(e.target.value) || 0 }))}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200"
                />
              </div>
            </div>
            <Button className="w-full" size="sm" onClick={saveEditedPoint} disabled={editSaving}>
              {editSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/matches" className="text-zinc-400 hover:text-zinc-100"><ArrowLeft className="h-4 w-4" /></Link>
          <h1 className="text-xl font-semibold">
            {isDoubles ? `${p1}/${p3 ?? 'Opp 1'} vs ${p2}/${p4 ?? 'Opp 2'}` : `${p1} vs ${p2}`}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {status === 'in_progress' && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/matches/${id}/live`}><Radio className="h-4 w-4" />Live</Link>
            </Button>
          )}
          <button onClick={exportMatch} disabled={allPoints.length === 0} className="flex items-center justify-center rounded-md p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-30">
            <Download className="h-4 w-4" />
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center justify-center rounded-md p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="text-xs text-zinc-500">
        {matchType} · {formatDate(createdAt)} ·{' '}
        {status === 'in_progress' ? <Badge variant="serve" className="animate-pulse">Live</Badge>
          : status === 'completed' ? <Badge variant="success">Completed</Badge>
          : <Badge variant="outline">Pending</Badge>}
      </div>

      {weather && (
        <div className="flex items-center gap-3 text-xs text-zinc-500 -mt-3">
          <span>{weather.condition}</span>
          <span>·</span>
          <span>{weather.temp}°F (feels {weather.feels_like}°F)</span>
          <span>·</span>
          <span>Wind {weather.wind_mph} mph{weather.gust_mph > weather.wind_mph + 3 ? `, gusts ${weather.gust_mph}` : ''}</span>
          {weather.precip_in > 0 && <><span>·</span><span>{weather.precip_in}″ precip</span></>}
        </div>
      )}

      {(surface || matchRating) && (
        <div className="flex items-center gap-3 text-xs text-zinc-500 -mt-3">
          {surface && <span>{surface}</span>}
          {surface && matchRating && <span>·</span>}
          {matchRating && <span>{'★'.repeat(matchRating)}{'☆'.repeat(5 - matchRating)}</span>}
        </div>
      )}

      {/* Match score */}
      <Card className="border-zinc-800">
        <CardContent className="p-4">
          {winnerName && <p className="mb-3 text-center text-xs font-medium text-emerald-400">{winnerName} wins</p>}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="text-right">
              <p className={`text-sm font-medium ${winner === 'team1' ? 'text-white' : 'text-zinc-400'}`}>{p1}{isDoubles && p3 ? ` / ${p3}` : ''}</p>
              <p className="mt-0.5 font-mono text-4xl font-bold">{t1Sets}</p>
            </div>
            <p className="text-xl text-zinc-600">–</p>
            <div className="text-left">
              <p className={`text-sm font-medium ${winner === 'team2' ? 'text-white' : 'text-zinc-400'}`}>{p2}{isDoubles && p4 ? ` / ${p4}` : ''}</p>
              <p className="mt-0.5 font-mono text-4xl font-bold">{t2Sets}</p>
            </div>
          </div>
          {status === 'completed' && (
            <div className="mt-3 flex items-center justify-center gap-1">
              {[1,2,3,4,5].map(star => (
                <button
                  key={star}
                  onClick={() => handleRating(star)}
                  className={`text-xl transition-colors ${star <= (matchRating ?? 0) ? 'text-yellow-400' : 'text-zinc-700 hover:text-yellow-400/50'}`}
                >
                  ★
                </button>
              ))}
            </div>
          )}

          {sets.length > 0 && (
            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-zinc-500">
              {sets.map(set => (
                <span key={set.id} className={`font-mono ${set.winner === 'team1' ? 'text-blue-400' : set.winner === 'team2' ? 'text-rose-400' : 'text-zinc-400'}`}>
                  {set.team1_games}–{set.team2_games}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Point flow */}
      {allPoints.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Point flow</CardTitle>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-400 inline-block" />{p1}</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400 inline-block" />{p2}</span>
            </div>
          </CardHeader>
          <CardContent className="pb-4"><TugOfWarChart points={allPoints} p1Name={p1} p2Name={p2} /></CardContent>
        </Card>
      )}

      {/* Set filter */}
      {sets.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {(['all', ...sets.map(s => s.set_number)] as ('all' | number)[]).map(tab => (
            <button key={tab} onClick={() => setActiveSet(tab)}
              className={`flex-shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${activeSet === tab ? 'border-white bg-zinc-700 text-white' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
              {tab === 'all' ? 'Match' : `Set ${tab}`}
            </button>
          ))}
        </div>
      )}

      {/* AI Summary */}
      <Card className="border-zinc-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-400" />
              AI Analysis
            </CardTitle>
            {!aiSummary && (
              <Button size="sm" variant="outline" onClick={fetchAI} disabled={loadingAI || allPoints.length < 5}>
                {loadingAI ? 'Analyzing…' : 'Generate'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {aiSummary ? (
            <p className="text-sm text-zinc-300 leading-relaxed">{aiSummary}</p>
          ) : (
            <p className="text-xs text-zinc-600">{allPoints.length < 5 ? 'Need more points logged to generate analysis.' : 'Tap Generate for an AI match summary.'}</p>
          )}
        </CardContent>
      </Card>

      {/* Stat category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {statTabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === tab.id ? 'border-white bg-zinc-700 text-white' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stat content */}
      {activeTab === 'all' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">{activeSet === 'all' ? 'Match stats' : `Set ${activeSet} stats`}</CardTitle>
              <div className="flex gap-6 text-xs font-medium">
                <span className="text-blue-400">{p1}</span>
                <span className="text-rose-400">{p2}</span>
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
              <span>Total: <span className="text-zinc-300">{filteredPoints.length} pts</span></span>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'serves' && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Serve breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <TwoColHeader p1={p1} p2={p2} />
            <StatRow label="1st serve %" v1={`${s.fs1pct}%`} v2={`${s.fs2pct}%`} />
            <StatRow label="1st in" v1={`${s.fs1In}/${s.p1Total}`} v2={`${s.fs2In}/${s.p2Total}`} />
            <StatRow label="2nd in" v1={`${s.ss1Total - s.df1}/${s.ss1Total}`} v2={`${s.ss2Total - s.df2}/${s.ss2Total}`} />
            <Divider label="1st serve locations (in)" />
            <BreakdownRow label="T" v1={s.svcLoc1by1['T'] ?? 0} v2={s.svcLoc2by1['T'] ?? 0} max={s.fs1In || 1} />
            <BreakdownRow label="Body" v1={s.svcLoc1by1['body'] ?? 0} v2={s.svcLoc2by1['body'] ?? 0} max={s.fs1In || 1} />
            <BreakdownRow label="Wide" v1={s.svcLoc1by1['wide'] ?? 0} v2={s.svcLoc2by1['wide'] ?? 0} max={s.fs1In || 1} />
            {(() => { const nr1 = s.fs1In - (s.svcLoc1by1['T'] ?? 0) - (s.svcLoc1by1['body'] ?? 0) - (s.svcLoc1by1['wide'] ?? 0); const nr2 = s.fs2In - (s.svcLoc2by1['T'] ?? 0) - (s.svcLoc2by1['body'] ?? 0) - (s.svcLoc2by1['wide'] ?? 0); return (nr1 > 0 || nr2 > 0) ? <BreakdownRow label="Not recorded" v1={nr1} v2={nr2} max={s.fs1In || 1} muted /> : null })()}
            <Divider label="2nd serve locations (in)" />
            <BreakdownRow label="T" v1={s.svcLoc1by2['T'] ?? 0} v2={s.svcLoc2by2['T'] ?? 0} max={s.ss1Total || 1} />
            <BreakdownRow label="Body" v1={s.svcLoc1by2['body'] ?? 0} v2={s.svcLoc2by2['body'] ?? 0} max={s.ss1Total || 1} />
            <BreakdownRow label="Wide" v1={s.svcLoc1by2['wide'] ?? 0} v2={s.svcLoc2by2['wide'] ?? 0} max={s.ss1Total || 1} />
            {(() => { const nr1 = s.ss1Total - (s.svcLoc1by2['T'] ?? 0) - (s.svcLoc1by2['body'] ?? 0) - (s.svcLoc1by2['wide'] ?? 0); const nr2 = s.ss2Total - (s.svcLoc2by2['T'] ?? 0) - (s.svcLoc2by2['body'] ?? 0) - (s.svcLoc2by2['wide'] ?? 0); return (nr1 > 0 || nr2 > 0) ? <BreakdownRow label="Not recorded" v1={nr1} v2={nr2} max={s.ss1Total || 1} muted /> : null })()}
            <Divider label={`${p1} serve heatmap`} />
            <ServeHeatmap title="1st serve" locData={s.svcLoc1by1} wonData={s.svcWinLoc1by1} total={s.fs1In} />
            <ServeHeatmap title="2nd serve" locData={s.svcLoc1by2} wonData={s.svcWinLoc1by2} total={s.ss1Total} />
          </CardContent>
        </Card>
      )}

      {activeTab === 'aces' && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Aces</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <TwoColHeader p1={p1} p2={p2} />
            <StatRow label="Total aces" v1={s.aces1} v2={s.aces2} />
            <Divider label="By serve" />
            <BreakdownRow label="1st serve" v1={s.aceServe1['1'] ?? 0} v2={s.aceServe2['1'] ?? 0} max={Math.max(s.aces1, s.aces2, 1)} />
            <BreakdownRow label="2nd serve" v1={s.aceServe1['2'] ?? 0} v2={s.aceServe2['2'] ?? 0} max={Math.max(s.aces1, s.aces2, 1)} />
            <Divider label="By location" />
            <BreakdownRow label="T" v1={s.aceLoc1['T'] ?? 0} v2={s.aceLoc2['T'] ?? 0} max={Math.max(s.aces1, s.aces2, 1)} />
            <BreakdownRow label="Body" v1={s.aceLoc1['body'] ?? 0} v2={s.aceLoc2['body'] ?? 0} max={Math.max(s.aces1, s.aces2, 1)} />
            <BreakdownRow label="Wide" v1={s.aceLoc1['wide'] ?? 0} v2={s.aceLoc2['wide'] ?? 0} max={Math.max(s.aces1, s.aces2, 1)} />
            {(s.aces1 > 0 || s.aces2 > 0) && <>
              <Divider label="Ace location heatmap" />
              {s.aces1 > 0 && <Heatmap title={p1} zones={LOC_ZONES} counts={s.aceLoc1}
                sublabels={Object.fromEntries(LOC_ZONES.map(z => [z.key, s.aceLoc1[z.key] ? `${Math.round((s.aceLoc1[z.key]??0)/s.aces1*100)}%` : '—']))}
                color="emerald" />}
              {s.aces2 > 0 && <Heatmap title={p2} zones={LOC_ZONES} counts={s.aceLoc2}
                sublabels={Object.fromEntries(LOC_ZONES.map(z => [z.key, s.aceLoc2[z.key] ? `${Math.round((s.aceLoc2[z.key]??0)/s.aces2*100)}%` : '—']))}
                color="emerald" />}
            </>}
          </CardContent>
        </Card>
      )}

      {activeTab === 'df' && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Double faults</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <TwoColHeader p1={p1} p2={p2} />
            <StatRow label="Total DFs" v1={s.df1} v2={s.df2} lower />
            <Divider label="2nd serve location when faulting" />
            <BreakdownRow label="T" v1={s.dfLoc1['T'] ?? 0} v2={s.dfLoc2['T'] ?? 0} max={Math.max(s.df1, s.df2, 1)} />
            <BreakdownRow label="Body" v1={s.dfLoc1['body'] ?? 0} v2={s.dfLoc2['body'] ?? 0} max={Math.max(s.df1, s.df2, 1)} />
            <BreakdownRow label="Wide" v1={s.dfLoc1['wide'] ?? 0} v2={s.dfLoc2['wide'] ?? 0} max={Math.max(s.df1, s.df2, 1)} />
            {(() => { const nr1 = s.df1 - (s.dfLoc1['T'] ?? 0) - (s.dfLoc1['body'] ?? 0) - (s.dfLoc1['wide'] ?? 0); const nr2 = s.df2 - (s.dfLoc2['T'] ?? 0) - (s.dfLoc2['body'] ?? 0) - (s.dfLoc2['wide'] ?? 0); return (nr1 > 0 || nr2 > 0) ? <BreakdownRow label="Not recorded" v1={nr1} v2={nr2} max={Math.max(s.df1, s.df2, 1)} muted /> : null })()}
          </CardContent>
        </Card>
      )}

      {activeTab === 'winners' && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Winners</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <TwoColHeader p1={p1} p2={p2} />
            <StatRow label="Total winners" v1={s.winners1} v2={s.winners2} />
            <Divider label="By stroke" />
            {(['forehand', 'backhand', 'return', 'forehand_volley', 'backhand_volley', 'overhead', 'lob', 'drop_shot'] as const).map(shot => {
              const v1 = s.winnerStrokes1[shot] ?? 0
              const v2 = s.winnerStrokes2[shot] ?? 0
              if (v1 + v2 === 0) return null
              return <BreakdownRow key={shot} label={SHOT_LABEL[shot]} v1={v1} v2={v2} max={Math.max(s.winners1, s.winners2, 1)} />
            })}
            {(s.winners1 > 0 || s.winners2 > 0) && <>
              <Divider label="Winner stroke heatmap" />
              {s.winners1 > 0 && <Heatmap title={p1} zones={STROKE_ZONES} counts={s.winnerStrokes1}
                sublabels={Object.fromEntries(STROKE_ZONES.map(z => [z.key, s.winnerStrokes1[z.key] ? `${Math.round((s.winnerStrokes1[z.key]??0)/s.winners1*100)}%` : '—']))}
                color="emerald" />}
              {s.winners2 > 0 && <Heatmap title={p2} zones={STROKE_ZONES} counts={s.winnerStrokes2}
                sublabels={Object.fromEntries(STROKE_ZONES.map(z => [z.key, s.winnerStrokes2[z.key] ? `${Math.round((s.winnerStrokes2[z.key]??0)/s.winners2*100)}%` : '—']))}
                color="emerald" />}
            </>}
          </CardContent>
        </Card>
      )}

      {activeTab === 'ue' && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Unforced errors</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <TwoColHeader p1={p1} p2={p2} />
            <StatRow label="Total UEs" v1={s.ue1} v2={s.ue2} lower />
            <Divider label="By stroke" />
            {(['forehand', 'backhand', 'return', 'forehand_volley', 'backhand_volley', 'overhead', 'lob', 'drop_shot'] as const).map(shot => {
              const v1 = s.ueStrokes1[shot] ?? 0
              const v2 = s.ueStrokes2[shot] ?? 0
              if (v1 + v2 === 0) return null
              return <BreakdownRow key={shot} label={SHOT_LABEL[shot]} v1={v1} v2={v2} max={Math.max(s.ue1, s.ue2, 1)} />
            })}
            <Divider label="Error direction" />
            <BreakdownRow label="Long" v1={s.ueDirs1['long'] ?? 0} v2={s.ueDirs2['long'] ?? 0} max={Math.max(s.ue1, s.ue2, 1)} />
            <BreakdownRow label="Wide" v1={s.ueDirs1['wide'] ?? 0} v2={s.ueDirs2['wide'] ?? 0} max={Math.max(s.ue1, s.ue2, 1)} />
            <BreakdownRow label="Net" v1={s.ueDirs1['net'] ?? 0} v2={s.ueDirs2['net'] ?? 0} max={Math.max(s.ue1, s.ue2, 1)} />
            {(s.ue1 > 0 || s.ue2 > 0) && <>
              <Divider label="UE direction heatmap" />
              {s.ue1 > 0 && <Heatmap title={p1} zones={DIR_ZONES} counts={s.ueDirs1}
                sublabels={Object.fromEntries(DIR_ZONES.map(z => [z.key, s.ueDirs1[z.key] ? `${Math.round((s.ueDirs1[z.key]??0)/s.ue1*100)}%` : '—']))}
                color="rose" />}
              {s.ue2 > 0 && <Heatmap title={p2} zones={DIR_ZONES} counts={s.ueDirs2}
                sublabels={Object.fromEntries(DIR_ZONES.map(z => [z.key, s.ueDirs2[z.key] ? `${Math.round((s.ueDirs2[z.key]??0)/s.ue2*100)}%` : '—']))}
                color="rose" />}
            </>}
          </CardContent>
        </Card>
      )}

      {activeTab === 'returns' && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Returns</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <TwoColHeader p1={p1} p2={p2} />
            <StatRow label="Returns faced" v1={s.retTotal1} v2={s.retTotal2} />
            <StatRow label="Return in-play %" v1={s.retTotal1 ? `${Math.round((s.retSucc1/s.retTotal1)*100)}%` : '—'} v2={s.retTotal2 ? `${Math.round((s.retSucc2/s.retTotal2)*100)}%` : '—'} />
            <Divider label="By serve number" />
            <StatRow label="1st serve faced" v1={s.retTotal1by1} v2={s.retTotal2by1} />
            <StatRow label="1st return in-play %" v1={s.retTotal1by1 ? `${Math.round((s.retSucc1by1/s.retTotal1by1)*100)}%` : '—'} v2={s.retTotal2by1 ? `${Math.round((s.retSucc2by1/s.retTotal2by1)*100)}%` : '—'} />
            <StatRow label="2nd serve faced" v1={s.retTotal1by2} v2={s.retTotal2by2} />
            <StatRow label="2nd return in-play %" v1={s.retTotal1by2 ? `${Math.round((s.retSucc1by2/s.retTotal1by2)*100)}%` : '—'} v2={s.retTotal2by2 ? `${Math.round((s.retSucc2by2/s.retTotal2by2)*100)}%` : '—'} />
            <Divider label="By serve location" />
            {(['T', 'body', 'wide'] as const).map(loc => {
              const t1 = s.retLocTotal1[loc] ?? 0
              const t2 = s.retLocTotal2[loc] ?? 0
              const s1 = s.retLocSucc1[loc] ?? 0
              const s2 = s.retLocSucc2[loc] ?? 0
              if (t1 + t2 === 0) return null
              return (
                <BreakdownRow
                  key={loc}
                  label={loc === 'T' ? 'T' : loc === 'body' ? 'Body' : 'Wide'}
                  v1={s1} v2={s2} max={Math.max(t1, t2, 1)}
                  sub1={t1 ? `${Math.round((s1/t1)*100)}%` : undefined}
                  sub2={t2 ? `${Math.round((s2/t2)*100)}%` : undefined}
                />
              )
            })}
            {(s.retTotal1 > 0 || s.retTotal2 > 0) && <>
              <Divider label="Return in-play heatmap" />
              {s.retTotal1 > 0 && <Heatmap
                title={`${p1} (returns faced by serve location)`}
                zones={LOC_ZONES}
                counts={s.retLocTotal1}
                intensities={Object.fromEntries(LOC_ZONES.map(z => {
                  const t = s.retLocTotal1[z.key] ?? 0; const sc = s.retLocSucc1[z.key] ?? 0
                  return [z.key, t ? sc / t : 0]
                }))}
                sublabels={Object.fromEntries(LOC_ZONES.map(z => {
                  const t = s.retLocTotal1[z.key] ?? 0; const sc = s.retLocSucc1[z.key] ?? 0
                  return [z.key, t ? `${Math.round(sc / t * 100)}% in play` : '—']
                }))}
                color="blue"
              />}
              {s.retTotal2 > 0 && <Heatmap
                title={`${p2} (returns faced by serve location)`}
                zones={LOC_ZONES}
                counts={s.retLocTotal2}
                intensities={Object.fromEntries(LOC_ZONES.map(z => {
                  const t = s.retLocTotal2[z.key] ?? 0; const sc = s.retLocSucc2[z.key] ?? 0
                  return [z.key, t ? sc / t : 0]
                }))}
                sublabels={Object.fromEntries(LOC_ZONES.map(z => {
                  const t = s.retLocTotal2[z.key] ?? 0; const sc = s.retLocSucc2[z.key] ?? 0
                  return [z.key, t ? `${Math.round(sc / t * 100)}% in play` : '—']
                }))}
                color="rose"
              />}
            </>}
          </CardContent>
        </Card>
      )}

      {activeTab === 'tiebreaks' && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Tiebreak performance</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            {s.tbPoints === 0 ? (
              <p className="text-xs text-zinc-500">No tiebreaks in this match.</p>
            ) : (
              <>
                <TwoColHeader p1={p1} p2={p2} />
                <StatRow label="TB points won" v1={s.tbWon1} v2={s.tbWon2} />
                <StatRow label="TB win %" v1={s.tbPct1 !== null ? `${s.tbPct1}%` : '—'} v2={s.tbPct2 !== null ? `${s.tbPct2}%` : '—'} />
                <StatRow label="Total TB points" v1={s.tbPoints} v2={s.tbPoints} />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-zinc-500">Match notes</p>
        <textarea
          value={notesValue}
          onChange={e => setNotesValue(e.target.value)}
          placeholder="Add notes about this match…"
          rows={3}
          className="w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none resize-none"
        />
      </div>

      {/* Point log */}
      {filteredPoints.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-400">Point log</h2>
          <div className="space-y-1">
            {filteredPoints.map((pt, i) => <PointRow key={pt.id} point={pt} index={i + 1} onEdit={() => { setEditingPoint(pt); setEditDraft({}) }} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SHOT_LABEL: Record<string, string> = {
  forehand: 'Forehand', backhand: 'Backhand', forehand_volley: 'FH Volley',
  backhand_volley: 'BH Volley', overhead: 'Overhead', lob: 'Lob',
  drop_shot: 'Drop shot', serve: 'Serve', return: 'Return',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TwoColHeader({ p1, p2 }: { p1: string; p2: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 text-xs font-semibold">
      <span className="text-right text-blue-400">{p1}</span>
      <span />
      <span className="text-left text-rose-400">{p2}</span>
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

function BreakdownRow({ label, v1, v2, max, muted, sub1, sub2 }: { label: string; v1: number; v2: number; max: number; muted?: boolean; sub1?: string; sub2?: string }) {
  const pct1 = max > 0 ? (v1 / max) * 100 : 0
  const pct2 = max > 0 ? (v2 / max) * 100 : 0
  return (
    <div className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs${muted ? ' opacity-50' : ''}`}>
      <div className="flex flex-col items-end gap-0.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-zinc-300 w-4 text-right">{v1}</span>
          <div className="h-2 rounded-full bg-blue-400/30 overflow-hidden" style={{ width: 60 }}>
            <div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${pct1}%`, marginLeft: `${100 - pct1}%` }} />
          </div>
        </div>
        {sub1 && <span className="text-zinc-500 text-[10px] pr-1">{sub1}</span>}
      </div>
      <span className="text-center text-zinc-500 w-16">{label}</span>
      <div className="flex flex-col items-start gap-0.5">
        <div className="flex items-center gap-2">
          <div className="h-2 rounded-full bg-rose-400/30 overflow-hidden" style={{ width: 60 }}>
            <div className="h-full rounded-full bg-rose-400 transition-all" style={{ width: `${pct2}%` }} />
          </div>
          <span className="font-mono text-zinc-300 w-4">{v2}</span>
        </div>
        {sub2 && <span className="text-zinc-500 text-[10px] pl-1">{sub2}</span>}
      </div>
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

function PointRow({ point, index, onEdit }: { point: Point; index: number; onEdit?: () => void }) {
  const outcomeLabel: Record<string, string> = { ace: 'Ace', winner: 'Winner', error: 'Error', unforced_error: 'UE', double_fault: 'DF' }
  const shotLabel: Record<string, string> = {
    forehand: 'FH', backhand: 'BH', forehand_volley: 'FH Vol', backhand_volley: 'BH Vol',
    overhead: 'OH', lob: 'Lob', drop_shot: 'Drop', serve: 'Serve', return: 'Ret',
  }
  return (
    <div onClick={onEdit} className="flex items-center gap-2 rounded-md border border-zinc-800/50 px-3 py-2 text-xs cursor-pointer hover:border-zinc-700">
      <span className="w-5 text-zinc-600">#{index}</span>
      <span className="text-zinc-500">{point.serve_number === 1 ? '1st' : '2nd'}</span>
      {point.outcome && (
        <Badge variant={point.outcome === 'winner' || point.outcome === 'ace' ? 'success' : point.outcome === 'unforced_error' || point.outcome === 'error' ? 'destructive' : 'default'} className="text-xs">
          {outcomeLabel[point.outcome] ?? point.outcome}
        </Badge>
      )}
      {point.last_shot_type && <span className="text-zinc-400">{shotLabel[point.last_shot_type] ?? point.last_shot_type}</span>}
      {point.error_direction && <span className="text-zinc-500">· {point.error_direction}</span>}
      {point.winner_direction && <span className="text-zinc-500">· {point.winner_direction === 'cross_court' ? 'CC' : 'DTL'}</span>}
      <span className="ml-auto text-zinc-600">{point.rally_length}x</span>
      <span className={`font-medium ${point.point_winner === 'team1' ? 'text-white' : 'text-zinc-400'}`}>
        {point.point_winner === 'team1' ? 'P1' : 'P2'}
      </span>
    </div>
  )
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

const LOC_ZONES = [{ key: 'T', label: 'T' }, { key: 'body', label: 'Body' }, { key: 'wide', label: 'Wide' }]
const DIR_ZONES = [{ key: 'long', label: 'Long' }, { key: 'wide', label: 'Wide' }, { key: 'net', label: 'Net' }]
const STROKE_ZONES = (['forehand','backhand','return','forehand_volley','backhand_volley','overhead','lob','drop_shot'] as const)
  .map(k => ({ key: k as string, label: SHOT_LABEL[k] }))

const COLOR_RGB: Record<string, string> = {
  blue: '96,165,250', rose: '251,113,133', emerald: '52,211,153', amber: '251,191,36',
}

function Heatmap({ title, zones, counts, sublabels, intensities, color = 'blue' }: {
  title?: string
  zones: { key: string; label: string }[]
  counts: Record<string, number>
  sublabels?: Record<string, string>
  intensities?: Record<string, number>
  color?: 'blue' | 'rose' | 'emerald' | 'amber'
}) {
  const active = zones.filter(z => (counts[z.key] ?? 0) > 0)
  if (active.length === 0) return null
  const maxCount = Math.max(...active.map(z => counts[z.key] ?? 0), 1)
  const rgb = COLOR_RGB[color]
  const cols = Math.min(active.length, 3)
  return (
    <div className="space-y-1">
      {title && <p className="text-xs text-zinc-500">{title}</p>}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {active.map(({ key, label }) => {
          const count = counts[key] ?? 0
          const intensity = intensities ? (intensities[key] ?? 0) : count / maxCount
          return (
            <div key={key} className="rounded-md border border-zinc-800 p-2 text-center space-y-0.5"
              style={{ background: `rgba(${rgb},${intensity * 0.45})` }}>
              <p className="text-xs font-semibold text-zinc-300">{label}</p>
              <p className="text-base font-bold font-mono">{count}</p>
              {sublabels?.[key] && <p className="text-[10px] text-zinc-400">{sublabels[key]}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ServeHeatmap({ title, locData, wonData, total }: {
  title: string; locData: Record<string, number>; wonData: Record<string, number>; total: number
}) {
  if (total === 0) return null
  return (
    <Heatmap
      title={title}
      zones={LOC_ZONES}
      counts={locData}
      intensities={Object.fromEntries(LOC_ZONES.map(z => {
        const c = locData[z.key] ?? 0; const w = wonData[z.key] ?? 0
        return [z.key, c ? w / c : 0]
      }))}
      sublabels={Object.fromEntries(LOC_ZONES.map(z => {
        const c = locData[z.key] ?? 0; const w = wonData[z.key] ?? 0
        return [z.key, c ? `${Math.round(w / c * 100)}% won` : '—']
      }))}
      color="blue"
    />
  )
}
