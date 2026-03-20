'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, ChevronLeft, RotateCcw, StopCircle } from 'lucide-react'
import Link from 'next/link'
import {
  gameWinner,
  tiebreakWinner,
  setWinner,
  needsTiebreak,
  nextServer,
  teamOfPlayer,
  pointLabel,
  isDeuceGame,
} from '@/lib/utils'
import type {
  Match,
  MatchSet,
  Game,
  Point,
  PointDraft,
  PlayerSlot,
  Team,
  ServeNumber,
  ServePlacement,
  ServeResult,
  PointOutcome,
  ShotType,
} from '@/types/tennis'

type Step = 'serve_placement' | 'serve_result' | 'outcome' | 'shot_type' | 'error_direction' | 'point_winner' | 'confirm'

const emptyDraft = (): PointDraft => ({
  serve_number: 1,
  serve_placement: null,
  serve_result: null,
  rally_length: 0,
  point_winner: null,
  outcome: null,
  last_shot_type: null,
  last_shot_player: null,
  error_direction: null,
})

export function LiveTracker({ match }: { match: Match & { sets: (MatchSet & { games: (Game & { points: Point[] })[] })[] } }) {
  const router = useRouter()
  const supabase = createClient()

  const currentSet = match.sets?.find((s) => !s.winner) ?? match.sets?.[match.sets.length - 1]
  const currentGame = currentSet?.games?.find((g) => !g.winner) ?? currentSet?.games?.[currentSet.games.length - 1]
  const completedPoints = currentGame?.points ?? []

  const [draft, setDraft] = useState<PointDraft>(emptyDraft())
  const [step, setStep] = useState<Step>('serve_placement')
  const [serveNumber, setServeNumber] = useState<ServeNumber>(1)
  const [saving, setSaving] = useState(false)
  const [lastUndo, setLastUndo] = useState<Point | null>(null)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [ending, setEnding] = useState(false)

  if (!currentSet || !currentGame) {
    return (
      <div className="flex h-dvh items-center justify-center text-zinc-400">
        <p>Match data unavailable. <Link href={`/matches/${match.id}`} className="underline">View match</Link></p>
      </div>
    )
  }

  const game = currentGame
  const setData = currentSet

  const p1Name = match.player1?.name ?? 'P1'
  const p2Name = match.player2?.name ?? 'P2'
  const server = currentGame.server as PlayerSlot
  const serverTeam = teamOfPlayer(server)
  const servingName = serverTeam === 'team1' ? p1Name : p2Name

  const completedSets = match.sets?.filter((s) => s.winner) ?? []
  const t1sets = completedSets.filter((s) => s.winner === 'team1').length
  const t2sets = completedSets.filter((s) => s.winner === 'team2').length

  const t1g = currentGame.team1_points
  const t2g = currentGame.team2_points
  const isTB = currentGame.is_tiebreak

  const t1label = isTB ? String(t1g) : pointLabel(t1g, t2g, match.format?.noAd)
  const t2label = isTB ? String(t2g) : pointLabel(t2g, t1g, match.format?.noAd)
  const isDeuce = !isTB && isDeuceGame(t1g, t2g) && t1g === t2g

  const totalPts = t1g + t2g
  const courtSide: 'deuce' | 'ad' = totalPts % 2 === 0 ? 'deuce' : 'ad'

  function go(nextStep: Step, update: Partial<PointDraft>) {
    setDraft((d) => ({ ...d, ...update }))
    setStep(nextStep)
  }

  function handleFault() {
    setServeNumber(2)
    setDraft((d) => ({ ...d, serve_result: 'fault' }))
    setStep('serve_placement')
  }

  function back() {
    if (step === 'shot_type') return setStep('point_winner')
    if (step === 'point_winner') {
      const isError = draft.outcome === 'error' || draft.outcome === 'unforced_error'
      return setStep(isError ? 'error_direction' : 'serve_result')
    }
    if (step === 'error_direction') return setStep('serve_result')
    if (step === 'serve_result') return setStep('serve_placement')
  }

  async function savePoint(finalDraft: PointDraft) {
    if (saving) return
    setSaving(true)

    const pointData = {
      game_id: game.id,
      match_id: match.id,
      point_number: completedPoints.length + 1,
      server,
      serve_number: serveNumber,
      serve_placement: finalDraft.serve_placement,
      serve_result: finalDraft.serve_result,
      rally_length: finalDraft.rally_length,
      point_winner: finalDraft.point_winner,
      outcome: finalDraft.outcome,
      last_shot_type: finalDraft.last_shot_type,
      last_shot_player: finalDraft.last_shot_player,
      error_direction: finalDraft.error_direction,
      court_side: courtSide,
      score_before: { team1: t1label, team2: t2label },
    }

    const { data: point } = await supabase.from('points').insert(pointData).select().single()
    if (point) setLastUndo(point)

    const winner = finalDraft.point_winner
    const newT1 = game.team1_points + (winner === 'team1' ? 1 : 0)
    const newT2 = game.team2_points + (winner === 'team2' ? 1 : 0)

    const gWinner = isTB
      ? tiebreakWinner(newT1, newT2, setData.is_super_tiebreak)
      : gameWinner(newT1, newT2, match.format?.noAd ?? false)

    await supabase
      .from('games')
      .update({ team1_points: newT1, team2_points: newT2, winner: gWinner })
      .eq('id', game.id)

    if (gWinner) {
      const newS1 = setData.team1_games + (gWinner === 'team1' ? 1 : 0)
      const newS2 = setData.team2_games + (gWinner === 'team2' ? 1 : 0)
      const sWinner = setWinner(newS1, newS2)

      await supabase
        .from('sets')
        .update({ team1_games: newS1, team2_games: newS2, winner: sWinner })
        .eq('id', setData.id)

      const newServer = nextServer(server, match.match_type)

      if (sWinner) {
        const newT1Sets = t1sets + (sWinner === 'team1' ? 1 : 0)
        const newT2Sets = t2sets + (sWinner === 'team2' ? 1 : 0)
        const setsNeeded = Math.ceil((match.format?.sets ?? 3) / 2)

        if (newT1Sets >= setsNeeded || newT2Sets >= setsNeeded) {
          const matchWinner = newT1Sets >= setsNeeded ? 'team1' : 'team2'
          await supabase
            .from('matches')
            .update({ status: 'completed', winner: matchWinner, completed_at: new Date().toISOString() })
            .eq('id', match.id)
          router.push(`/matches/${match.id}`)
          return
        }

        const { data: newSet } = await supabase
          .from('sets')
          .insert({ match_id: match.id, set_number: (setData.set_number ?? 0) + 1 })
          .select()
          .single()

        if (newSet) {
          await supabase.from('games').insert({
            set_id: newSet.id,
            match_id: match.id,
            game_number: 1,
            server: newServer,
          })
        }
      } else {
        const isTiebreak = needsTiebreak(newS1, newS2) && match.format?.tiebreak
        const isSuperTiebreak = needsTiebreak(newS1, newS2) && match.format?.superTiebreak &&
          (t1sets + t2sets === (match.format?.sets ?? 3) - 1)
        const gamesInSet = setData.games?.filter((g) => g.winner).length ?? 0
        await supabase.from('games').insert({
          set_id: setData.id,
          match_id: match.id,
          game_number: gamesInSet + 2,
          server: newServer,
          is_tiebreak: isTiebreak || isSuperTiebreak,
        })
      }
    }

    setServeNumber(1)
    setSaving(false)
    setDraft(emptyDraft())
    setStep('serve_placement')
    router.refresh()
  }

  async function undoLastPoint() {
    if (!lastUndo) return
    await supabase.from('points').delete().eq('id', lastUndo.id)
    const prevT1 = game.team1_points - (lastUndo.point_winner === 'team1' ? 1 : 0)
    const prevT2 = game.team2_points - (lastUndo.point_winner === 'team2' ? 1 : 0)
    await supabase.from('games').update({ team1_points: Math.max(0, prevT1), team2_points: Math.max(0, prevT2), winner: null }).eq('id', game.id)
    setLastUndo(null)
    router.refresh()
  }

  async function endMatch() {
    setEnding(true)
    const leader = t1sets > t2sets ? 'team1' : t2sets > t1sets ? 'team2' :
      setData.team1_games > setData.team2_games ? 'team1' : 'team2'
    await supabase
      .from('matches')
      .update({ status: 'completed', winner: leader, completed_at: new Date().toISOString() })
      .eq('id', match.id)
    router.push(`/matches/${match.id}`)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto max-w-md px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href={`/matches/${match.id}`} className="text-zinc-400 hover:text-zinc-100">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="text-xs font-medium text-zinc-400">Match Log</span>
            <div className="flex items-center gap-3">
              {lastUndo && (
                <button onClick={undoLastPoint} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Undo
                </button>
              )}
              <button onClick={() => setShowEndConfirm(true)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                <StopCircle className="h-3.5 w-3.5" />
                End
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* End match confirmation */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-6 space-y-4">
            <h2 className="text-base font-semibold">End match early?</h2>
            <p className="text-sm text-zinc-400">The match will be marked as completed based on the current score.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowEndConfirm(false)} disabled={ending}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={endMatch} disabled={ending}>{ending ? 'Ending…' : 'End match'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Scoreboard */}
      <div className="mx-auto w-full max-w-md px-4 pt-4">
        <Card className="border-zinc-800">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-center gap-1.5 text-xs">
              {completedSets.map((s, i) => (
                <span key={i} className="font-mono text-zinc-500">{s.team1_games}-{s.team2_games}</span>
              ))}
              {completedSets.length > 0 && <span className="text-zinc-700">·</span>}
              <Badge variant="serve" className="text-xs">Set {currentSet.set_number}</Badge>
              <span className="font-mono text-zinc-400">{currentSet.team1_games}-{currentSet.team2_games}</span>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div className="text-right">
                <div className={`text-xs font-medium ${serverTeam === 'team1' ? 'text-yellow-400' : 'text-zinc-400'}`}>
                  {p1Name}{serverTeam === 'team1' && ' ●'}
                </div>
                <div className="mt-1 font-mono text-5xl font-bold">{isDeuce ? 'D' : t1label}</div>
              </div>
              <div className="text-lg text-zinc-600">:</div>
              <div className="text-left">
                <div className={`text-xs font-medium ${serverTeam === 'team2' ? 'text-yellow-400' : 'text-zinc-400'}`}>
                  {serverTeam === 'team2' && '● '}{p2Name}
                </div>
                <div className="mt-1 font-mono text-5xl font-bold">{isDeuce ? 'D' : t2label}</div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-zinc-500">
              <span className="capitalize">{courtSide} side</span>
              <span>·</span>
              <span className="text-yellow-400/80">{servingName} serving</span>
              <span>·</span>
              {serveNumber === 2 ? (
                <span className="rounded bg-orange-500/20 px-1.5 py-0.5 font-semibold text-orange-400 border border-orange-500/40">2nd serve</span>
              ) : (
                <span>1st serve</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Step logger */}
      <div className="mx-auto w-full max-w-md flex-1 px-4 pb-8 pt-4">
        <div className="space-y-3">
          {step !== 'serve_placement' && (
            <button onClick={back} className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 active:scale-95 transition-all">
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          )}

          <StepContent
            step={step}
            draft={draft}
            setDraft={setDraft}
            serveNumber={serveNumber}
            setServeNumber={setServeNumber}
            courtSide={courtSide}
            p1Name={p1Name}
            p2Name={p2Name}
            server={server}
            onGo={go}
            onFault={handleFault}
            onSave={savePoint}
            saving={saving}
          />
        </div>
      </div>

      {/* Recent points */}
      {completedPoints.length > 0 && (
        <div className="mx-auto w-full max-w-md border-t border-zinc-800 px-4 pb-6 pt-4">
          <p className="mb-2 text-xs text-zinc-500">Recent points</p>
          <div className="space-y-1">
            {[...completedPoints].reverse().slice(0, 5).map((pt) => (
              <MiniPointRow key={pt.id} point={pt} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StepContent({
  step, draft, setDraft, serveNumber, setServeNumber, courtSide, p1Name, p2Name, server, onGo, onFault, onSave, saving,
}: {
  step: Step
  draft: PointDraft
  setDraft: React.Dispatch<React.SetStateAction<PointDraft>>
  serveNumber: ServeNumber
  setServeNumber: React.Dispatch<React.SetStateAction<ServeNumber>>
  courtSide: 'deuce' | 'ad'
  p1Name: string
  p2Name: string
  server: PlayerSlot
  onGo: (step: Step, update: Partial<PointDraft>) => void
  onFault: () => void
  onSave: (draft: PointDraft) => void
  saving: boolean
}) {
  const serverName = teamOfPlayer(server) === 'team1' ? p1Name : p2Name
  const isSecond = serveNumber === 2

  if (step === 'serve_placement') {
    return (
      <div className="space-y-4">
        <p className="text-sm font-medium text-zinc-200">{serverName} serving</p>

        {/* 1st / 2nd toggle — bigger */}
        <div className="grid grid-cols-2 rounded-xl border border-zinc-700 overflow-hidden">
          <button
            type="button"
            onClick={() => setServeNumber(1)}
            className={`py-3.5 text-base font-semibold transition-colors ${!isSecond ? 'bg-white text-black' : 'text-zinc-400 hover:bg-zinc-800'}`}
          >
            1st Serve
          </button>
          <button
            type="button"
            onClick={() => setServeNumber(2)}
            className={`py-3.5 text-base font-semibold transition-colors ${isSecond ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
          >
            2nd Serve
          </button>
        </div>

        {/* Court diagram */}
        <ServeCourtDiagram
          courtSide={courtSide}
          onSelect={(placement) => onGo('serve_result', { serve_placement: placement })}
        />

        {/* Double fault button — only on 2nd serve */}
        {isSecond && (
          <button
            type="button"
            onClick={() => {
              const otherTeam: Team = teamOfPlayer(server) === 'team1' ? 'team2' : 'team1'
              const d = { ...draft, serve_result: 'double_fault' as ServeResult, outcome: 'double_fault' as PointOutcome, point_winner: otherTeam, rally_length: 0, last_shot_type: 'serve' as ShotType }
              onSave(d)
            }}
            className="w-full rounded-lg border border-red-700/50 bg-red-900/30 py-4 text-sm font-semibold text-red-300 hover:bg-red-900/50 transition-colors"
          >
            Double Fault
          </button>
        )}
      </div>
    )
  }

  if (step === 'serve_result') {
    const faultLabel = isSecond ? 'Double Fault' : 'Fault (missed serve)'
    return (
      <StepCard title={`${isSecond ? '2nd' : '1st'} serve`}>
        <div className="flex flex-col gap-2">
          <ChoiceBtn
            label="Ace ★"
            accent="green"
            onClick={() => {
              const d = { ...draft, serve_result: 'ace' as ServeResult, outcome: 'ace' as PointOutcome, point_winner: teamOfPlayer(server) as Team, rally_length: 1, last_shot_type: 'serve' as ShotType }
              onSave(d)
            }}
          />
          <ChoiceBtn label="Winner" accent="green" onClick={() => onGo('point_winner', { serve_result: 'in_play' as ServeResult, outcome: 'winner' as PointOutcome })} />
          <ChoiceBtn label="Unforced Error" accent="red" onClick={() => onGo('error_direction', { serve_result: 'in_play' as ServeResult, outcome: 'unforced_error' as PointOutcome })} />
          <ChoiceBtn label="Forced Error" onClick={() => onGo('error_direction', { serve_result: 'in_play' as ServeResult, outcome: 'error' as PointOutcome })} />
          <ChoiceBtn
            label={faultLabel}
            accent="red"
            onClick={() => {
              if (isSecond) {
                const otherTeam: Team = teamOfPlayer(server) === 'team1' ? 'team2' : 'team1'
                const d = { ...draft, serve_result: 'double_fault' as ServeResult, outcome: 'double_fault' as PointOutcome, point_winner: otherTeam, rally_length: 0, last_shot_type: 'serve' as ShotType }
                onSave(d)
              } else {
                onFault()
              }
            }}
          />
        </div>
      </StepCard>
    )
  }

  if (step === 'shot_type') {
    const save = (t: ShotType) => onSave({ ...draft, last_shot_type: t })
    return (
      <StepCard title="Last shot">
        <div className="flex flex-col gap-2">
          <ChoiceBtn label="Forehand" onClick={() => save('forehand')} />
          <ChoiceBtn label="Backhand" onClick={() => save('backhand')} />
          <ChoiceBtn label="Return" onClick={() => save('return')} />
          <ChoiceBtn label="FH Volley" onClick={() => save('forehand_volley')} />
          <ChoiceBtn label="BH Volley" onClick={() => save('backhand_volley')} />
          <ChoiceBtn label="Overhead" onClick={() => save('overhead')} />
          <ChoiceBtn label="Lob" onClick={() => save('lob')} />
          <ChoiceBtn label="Drop Shot" onClick={() => save('drop_shot')} />
        </div>
      </StepCard>
    )
  }

  if (step === 'error_direction') {
    return (
      <StepCard title="Where did it go?">
        <ErrorCourtDiagram onSelect={(dir) => onGo('point_winner', { error_direction: dir })} />
      </StepCard>
    )
  }

  if (step === 'point_winner') {
    return (
      <StepCard title={draft.outcome === 'winner' ? 'Who hit the winner?' : 'Who made the error?'}>
        <div className="space-y-3">
          <div className="rounded-md border border-zinc-800 p-3 space-y-2">
            <p className="text-center text-xs text-zinc-500">Rally length (strokes)</p>
            <div className="grid grid-cols-5 gap-1.5">
              {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                <button
                  key={n}
                  onClick={() => setDraft((d) => ({ ...d, rally_length: n }))}
                  className={`rounded-md border py-2 text-sm font-medium transition-colors ${draft.rally_length === n ? 'border-white bg-zinc-700 text-white' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 pt-1">
              <button onClick={() => setDraft((d) => ({ ...d, rally_length: Math.max(0, d.rally_length - 1) }))} className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 hover:bg-zinc-800">−</button>
              <span className="w-8 text-center text-lg font-bold">{draft.rally_length}</span>
              <button onClick={() => setDraft((d) => ({ ...d, rally_length: d.rally_length + 1 }))} className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 hover:bg-zinc-800">+</button>
            </div>
          </div>
          <Grid2>
            <ChoiceBtn
              label={p1Name}
              accent="green"
              onClick={() => {
                const pointWinner: Team = draft.outcome === 'winner' ? 'team1' : 'team2'
                onGo('shot_type', { point_winner: pointWinner, last_shot_player: 'player1' as PlayerSlot })
              }}
            />
            <ChoiceBtn
              label={p2Name}
              accent="green"
              onClick={() => {
                const pointWinner: Team = draft.outcome === 'winner' ? 'team2' : 'team1'
                onGo('shot_type', { point_winner: pointWinner, last_shot_player: 'player2' as PlayerSlot })
              }}
            />
          </Grid2>
        </div>
      </StepCard>
    )
  }

  if (step === 'confirm') {
    const outcomeMap: Record<string, string> = { winner: 'Winner', error: 'Forced Error', unforced_error: 'Unforced Error', ace: 'Ace', double_fault: 'Double Fault' }
    const shotMap: Record<string, string> = { forehand: 'Forehand', backhand: 'Backhand', forehand_volley: 'FH Volley', backhand_volley: 'BH Volley', overhead: 'Overhead', lob: 'Lob', drop_shot: 'Drop shot', serve: 'Serve', return: 'Return' }
    const winnerName = draft.point_winner === 'team1' ? p1Name : p2Name

    return (
      <StepCard title="Confirm point">
        <div className="space-y-2 rounded-md bg-zinc-800/50 p-4 text-sm">
          {draft.serve_placement && <Row label="Serve" value={`${serveNumber === 2 ? '2nd · ' : ''}${draft.serve_placement}`} />}
          {draft.outcome && <Row label="Outcome" value={outcomeMap[draft.outcome] ?? draft.outcome} />}
          {draft.last_shot_type && <Row label="Shot" value={shotMap[draft.last_shot_type] ?? draft.last_shot_type} />}
          {draft.error_direction && <Row label="Error" value={draft.error_direction} />}
          <Row label="Rally" value={`${draft.rally_length} shots`} />
          <Row label="Point to" value={winnerName} highlight />
        </div>
        <Button className="mt-3 w-full" size="lg" onClick={() => onSave(draft)} disabled={saving}>
          {saving ? 'Saving…' : 'Log point'}
        </Button>
      </StepCard>
    )
  }

  return null
}

// ─── Court diagram ───────────────────────────────────────────────────────────

function ServeCourtDiagram({
  courtSide,
  onSelect,
}: {
  courtSide: 'deuce' | 'ad'
  onSelect: (p: ServePlacement) => void
}) {
  const [pressed, setPressed] = useState<string | null>(null)

  // Deuce: serve lands in LEFT service box → Wide | Body | T (left→right)
  // Ad:    serve lands in RIGHT service box → T | Body | Wide (left→right)
  const zones: { label: string; sub: string; value: ServePlacement }[] =
    courtSide === 'deuce'
      ? [
          { label: 'Wide', sub: 'sideline', value: 'wide' },
          { label: 'Body', sub: 'middle', value: 'body' },
          { label: 'T', sub: 'center', value: 'T' },
        ]
      : [
          { label: 'T', sub: 'center', value: 'T' },
          { label: 'Body', sub: 'middle', value: 'body' },
          { label: 'Wide', sub: 'sideline', value: 'wide' },
        ]

  // Court SVG layout — top-down view of opponent's half (net at bottom)
  const W = 320, H = 200
  const dblL = 22, dblR = 298          // doubles sidelines
  const sglL = 55, sglR = 265          // singles sidelines (75% of doubles)
  const topY = 10                       // opponent baseline
  const netY = 186                      // net
  const courtH = netY - topY            // 176px total half-court height
  // service line is 21ft from net, baseline is 39ft from net → 21/39 = 53.8% up from net
  const svcY = Math.round(netY - courtH * (21 / 39))  // ≈ 91
  const midX = (sglL + sglR) / 2       // 160 — center service line
  const halfW = (sglR - sglL) / 2      // 105px per service box
  const zoneW = halfW / 3               // 35px per zone

  const deuce = courtSide === 'deuce'
  const boxX = deuce ? sglL : midX     // left edge of active service box
  const inactX = deuce ? midX : sglL   // left edge of inactive service box
  const zoneMidY = (svcY + netY) / 2   // vertical center of service box

  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: 'block' }}>
        {/* Outside-court surface */}
        <rect width={W} height={H} fill="#4aaa46" />
        {/* In-bounds court surface */}
        <rect x={dblL} y={topY} width={dblR - dblL} height={netY - topY} fill="#5cb85c" />

        {/* Inactive service box overlay */}
        <rect x={inactX} y={svcY} width={halfW} height={netY - svcY} fill="rgba(0,0,0,0.22)" />

        {/* Active zone tap targets */}
        {zones.map((zone, i) => (
          <rect
            key={zone.value}
            x={boxX + i * zoneW} y={svcY}
            width={zoneW} height={netY - svcY}
            fill={pressed === zone.value ? 'rgba(255,255,255,0.28)' : 'transparent'}
            style={{ cursor: 'pointer' }}
            onPointerDown={() => setPressed(zone.value)}
            onPointerUp={() => { setPressed(null); onSelect(zone.value) }}
            onPointerLeave={() => setPressed(null)}
          />
        ))}

        {/* ── Court lines ── */}
        {/* Doubles outer rectangle */}
        <rect x={dblL} y={topY} width={dblR - dblL} height={netY - topY}
          fill="none" stroke="white" strokeWidth="1.5" />
        {/* Singles sidelines */}
        <line x1={sglL} y1={topY} x2={sglL} y2={netY} stroke="white" strokeWidth="1.5" />
        <line x1={sglR} y1={topY} x2={sglR} y2={netY} stroke="white" strokeWidth="1.5" />
        {/* Service line */}
        <line x1={sglL} y1={svcY} x2={sglR} y2={svcY} stroke="white" strokeWidth="1.5" />
        {/* Center service line */}
        <line x1={midX} y1={svcY} x2={midX} y2={netY} stroke="white" strokeWidth="1.5" />
        {/* Baseline center mark */}
        <line x1={midX} y1={topY} x2={midX} y2={topY + 8} stroke="white" strokeWidth="1.5" />

        {/* Zone dividers (dashed, active box only) */}
        {[1, 2].map(i => (
          <line key={i}
            x1={boxX + i * zoneW} y1={svcY}
            x2={boxX + i * zoneW} y2={netY}
            stroke="rgba(255,255,255,0.55)" strokeWidth="1" strokeDasharray="4,3"
          />
        ))}

        {/* Net */}
        <line x1={dblL - 4} y1={netY} x2={dblR + 4} y2={netY} stroke="white" strokeWidth="2.5" />
        {/* Net posts */}
        <circle cx={dblL - 4} cy={netY} r="3" fill="white" />
        <circle cx={dblR + 4} cy={netY} r="3" fill="white" />
        {/* Net strap (center) */}
        <line x1={midX} y1={netY - 4} x2={midX} y2={netY + 4} stroke="white" strokeWidth="1.5" />

        {/* Zone labels */}
        {zones.map((zone, i) => (
          <g key={zone.value} style={{ pointerEvents: 'none' }}>
            <text x={boxX + i * zoneW + zoneW / 2} y={zoneMidY - 5}
              textAnchor="middle" fill="white" fontSize="13" fontWeight="bold"
              fontFamily="system-ui, -apple-system, sans-serif">
              {zone.label}
            </text>
            <text x={boxX + i * zoneW + zoneW / 2} y={zoneMidY + 9}
              textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="8"
              fontFamily="system-ui, -apple-system, sans-serif">
              {zone.sub}
            </text>
          </g>
        ))}

        {/* Inactive box label */}
        <text
          x={deuce ? sglR - 4 : sglL + 4} y={zoneMidY}
          textAnchor={deuce ? 'end' : 'start'}
          fill="rgba(255,255,255,0.3)" fontSize="8"
          fontFamily="system-ui, -apple-system, sans-serif"
          style={{ pointerEvents: 'none' }}>
          {deuce ? 'AD' : 'DEUCE'}
        </text>

        {/* NET label */}
        <text x={midX} y={netY - 5} textAnchor="middle"
          fill="rgba(255,255,255,0.45)" fontSize="7" letterSpacing="2"
          fontFamily="system-ui, -apple-system, sans-serif"
          style={{ pointerEvents: 'none' }}>
          NET
        </text>

        {/* SERVER label below net line */}
        <text x={midX} y={netY + 12} textAnchor="middle"
          fill="rgba(255,255,255,0.25)" fontSize="7" letterSpacing="2"
          fontFamily="system-ui, -apple-system, sans-serif"
          style={{ pointerEvents: 'none' }}>
          SERVER
        </text>
      </svg>
    </div>
  )
}

// ─── Error direction court diagram ────────────────────────────────────────────

function ErrorCourtDiagram({ onSelect }: { onSelect: (dir: 'long' | 'wide' | 'net') => void }) {
  const [pressed, setPressed] = useState<string | null>(null)

  // Full-court top-down view. Hitter is at BOTTOM, opponent at TOP.
  const W = 320, H = 280
  const dblL = 22, dblR = 298
  const sglL = 55, sglR = 265
  const baseTop = 16        // opponent baseline (top)
  const svcTop = 79         // opponent service line
  const netY = 140          // net (middle)
  const svcBot = 201        // hitter's service line
  const baseBot = 264       // hitter's baseline (bottom)
  const midX = (sglL + sglR) / 2

  // Long: strip above opponent's baseline
  const longY1 = 4, longY2 = baseTop + 10
  // Net: strip around the net
  const netY1 = netY - 8, netY2 = netY + 8
  // Wide: full-height strips outside singles sidelines (within doubles)
  const wideW = sglL - dblL   // 33px

  const tap = (zone: string, cb: () => void) => ({
    fill: pressed === zone ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.07)',
    style: { cursor: 'pointer' } as React.CSSProperties,
    onPointerDown: () => setPressed(zone),
    onPointerUp: () => { setPressed(null); cb() },
    onPointerLeave: () => setPressed(null),
  })

  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: 'block' }}>
        {/* Outside-court */}
        <rect width={W} height={H} fill="#4aaa46" />
        {/* Court surface */}
        <rect x={dblL} y={baseTop} width={dblR - dblL} height={baseBot - baseTop} fill="#5cb85c" />

        {/* Long tap zone (beyond opponent baseline, top) */}
        <rect x={dblL} y={longY1} width={dblR - dblL} height={longY2 - longY1}
          {...tap('long', () => onSelect('long'))} />

        {/* Wide tap zones (sides) */}
        <rect x={dblL} y={baseTop} width={wideW} height={baseBot - baseTop}
          {...tap('wide', () => onSelect('wide'))} />
        <rect x={sglR} y={baseTop} width={wideW} height={baseBot - baseTop}
          {...tap('wide', () => onSelect('wide'))} />

        {/* Net tap zone */}
        <rect x={sglL} y={netY1} width={sglR - sglL} height={netY2 - netY1}
          {...tap('net', () => onSelect('net'))} />

        {/* ── Court lines ── */}
        <rect x={dblL} y={baseTop} width={dblR - dblL} height={baseBot - baseTop}
          fill="none" stroke="white" strokeWidth="1.5" />
        <line x1={sglL} y1={baseTop} x2={sglL} y2={baseBot} stroke="white" strokeWidth="1.5" />
        <line x1={sglR} y1={baseTop} x2={sglR} y2={baseBot} stroke="white" strokeWidth="1.5" />
        <line x1={sglL} y1={svcTop} x2={sglR} y2={svcTop} stroke="white" strokeWidth="1.5" />
        <line x1={sglL} y1={svcBot} x2={sglR} y2={svcBot} stroke="white" strokeWidth="1.5" />
        <line x1={midX} y1={svcTop} x2={midX} y2={svcBot} stroke="white" strokeWidth="1.5" />
        <line x1={midX} y1={baseTop} x2={midX} y2={baseTop + 8} stroke="white" strokeWidth="1.5" />
        <line x1={midX} y1={baseBot} x2={midX} y2={baseBot - 8} stroke="white" strokeWidth="1.5" />

        {/* Net */}
        <line x1={dblL - 4} y1={netY} x2={dblR + 4} y2={netY} stroke="white" strokeWidth="2.5" />
        <circle cx={dblL - 4} cy={netY} r="3" fill="white" />
        <circle cx={dblR + 4} cy={netY} r="3" fill="white" />
        <line x1={midX} y1={netY - 4} x2={midX} y2={netY + 4} stroke="white" strokeWidth="1.5" />

        {/* Labels */}
        <text x={midX} y={longY1 + 10} textAnchor="middle"
          fill="white" fontSize="11" fontWeight="bold" fontFamily="system-ui, sans-serif"
          style={{ pointerEvents: 'none' }}>LONG</text>

        <text x={dblL + wideW / 2} y={(baseTop + baseBot) / 2}
          textAnchor="middle" fill="white" fontSize="9" fontWeight="bold"
          fontFamily="system-ui, sans-serif" style={{ pointerEvents: 'none' }}
          transform={`rotate(-90, ${dblL + wideW / 2}, ${(baseTop + baseBot) / 2})`}>WIDE</text>
        <text x={sglR + wideW / 2} y={(baseTop + baseBot) / 2}
          textAnchor="middle" fill="white" fontSize="9" fontWeight="bold"
          fontFamily="system-ui, sans-serif" style={{ pointerEvents: 'none' }}
          transform={`rotate(90, ${sglR + wideW / 2}, ${(baseTop + baseBot) / 2})`}>WIDE</text>

        <text x={midX} y={netY + 5} textAnchor="middle"
          fill="white" fontSize="9" fontWeight="bold" fontFamily="system-ui, sans-serif"
          style={{ pointerEvents: 'none' }}>NET</text>

        <text x={midX} y={(baseTop + svcTop) / 2 + 5} textAnchor="middle"
          fill="rgba(255,255,255,0.25)" fontSize="8" fontFamily="system-ui, sans-serif"
          style={{ pointerEvents: 'none' }}>opponent</text>
        <text x={midX} y={(svcBot + baseBot) / 2 + 5} textAnchor="middle"
          fill="rgba(255,255,255,0.25)" fontSize="8" fontFamily="system-ui, sans-serif"
          style={{ pointerEvents: 'none' }}>you</text>
      </svg>
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function StepCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-zinc-200">{title}</p>
        {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>
}
function Grid3({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-3 gap-2">{children}</div>
}

function ChoiceBtn({ label, onClick, accent, className }: { label: string; onClick: () => void; accent?: 'green' | 'red'; className?: string }) {
  const base = 'rounded-lg border py-4 text-sm font-medium transition-colors active:scale-95'
  const colors = accent === 'green'
    ? 'border-emerald-700/50 bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50'
    : accent === 'red'
    ? 'border-red-700/50 bg-red-900/30 text-red-300 hover:bg-red-900/50'
    : 'border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
  return <button onClick={onClick} className={`${base} ${colors} ${className ?? ''}`}>{label}</button>
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className={highlight ? 'font-semibold text-white' : 'text-zinc-200'}>{value}</span>
    </div>
  )
}

function MiniPointRow({ point }: { point: Point }) {
  const outcomeColors: Record<string, string> = { ace: 'text-emerald-400', winner: 'text-emerald-400', error: 'text-red-400', unforced_error: 'text-red-400', double_fault: 'text-red-400' }
  const shortOutcome: Record<string, string> = { ace: 'Ace', winner: 'W', error: 'E', unforced_error: 'UE', double_fault: 'DF' }
  const shortShot: Record<string, string> = { forehand: 'FH', backhand: 'BH', forehand_volley: 'FH Vol', backhand_volley: 'BH Vol', overhead: 'OH', lob: 'Lob', drop_shot: 'Drop', serve: 'Srv', return: 'Ret' }
  return (
    <div className="flex items-center gap-2 text-xs text-zinc-500">
      <span className={outcomeColors[point.outcome ?? ''] ?? 'text-zinc-400'}>{shortOutcome[point.outcome ?? ''] ?? '?'}</span>
      {point.last_shot_type && <span>{shortShot[point.last_shot_type] ?? ''}</span>}
      {point.error_direction && <span>· {point.error_direction}</span>}
      <span className="ml-auto">{point.rally_length}x</span>
      <span className={point.point_winner === 'team1' ? 'text-white' : 'text-zinc-400'}>
        {point.point_winner === 'team1' ? 'P1' : 'P2'}
      </span>
    </div>
  )
}
