'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { pointLabel, isDeuceGame } from '@/lib/utils'

type Point = { id: string; point_winner: string | null; outcome: string | null; serve_placement: string | null }
type Game = { id: string; server: string; team1_points: number; team2_points: number; winner: string | null; is_tiebreak: boolean; points: Point[] }
type MatchSet = { id: string; set_number: number; team1_games: number; team2_games: number; winner: string | null; games: Game[] }

type MatchData = {
  id: string
  status: string
  winner: string | null
  match_type: string
  player1: { name: string } | null
  player2: { name: string } | null
  player3: { name: string } | null
  player4: { name: string } | null
  sets: MatchSet[]
}

export function SpectatorClient({ matchId, initial }: { matchId: string; initial: MatchData }) {
  const [match, setMatch] = useState<MatchData>(initial)
  const [pulse, setPulse] = useState(false)
  const supabase = createClient()

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from('matches')
      .select(`
        id, status, winner, match_type,
        player1:players!matches_player1_id_fkey(name),
        player2:players!matches_player2_id_fkey(name),
        player3:players!matches_player3_id_fkey(name),
        player4:players!matches_player4_id_fkey(name),
        sets(id, set_number, team1_games, team2_games, winner,
          games(id, server, team1_points, team2_points, winner, is_tiebreak,
            points(id, point_winner, outcome, serve_placement)
          )
        )
      `)
      .eq('id', matchId)
      .single()

    if (data) {
      setMatch(data as unknown as MatchData)
      setPulse(true)
      setTimeout(() => setPulse(false), 600)
    }
  }, [matchId])

  useEffect(() => {
    const channel = supabase
      .channel(`spectate-${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `match_id=eq.${matchId}` }, refetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sets', filter: `match_id=eq.${matchId}` }, refetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, refetch)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [matchId, refetch])

  const p1 = match.player1?.name ?? 'Player 1'
  const p2 = match.player2?.name ?? 'Player 2'
  const p3 = match.player3?.name
  const p4 = match.player4?.name
  const isDoubles = match.match_type === 'doubles'
  const isLive = match.status === 'in_progress'

  const completedSets = (match.sets ?? []).filter(s => s.winner).sort((a, b) => a.set_number - b.set_number)
  const currentSet = (match.sets ?? []).find(s => !s.winner)
  const currentGame = currentSet?.games?.find(g => !g.winner)

  const t1Sets = completedSets.filter(s => s.winner === 'team1').length
  const t2Sets = completedSets.filter(s => s.winner === 'team2').length

  const t1g = currentGame?.team1_points ?? 0
  const t2g = currentGame?.team2_points ?? 0
  const isTB = currentGame?.is_tiebreak ?? false
  const t1label = isTB ? String(t1g) : pointLabel(t1g, t2g, false)
  const t2label = isTB ? String(t2g) : pointLabel(t2g, t1g, false)
  const isDeuce = !isTB && isDeuceGame(t1g, t2g) && t1g === t2g

  const serverSlot = currentGame?.server
  const team1Serving = serverSlot === 'player1' || serverSlot === 'player3'

  // Recent points from current game
  const recentPoints = [...(currentGame?.points ?? [])].reverse().slice(0, 8)

  const outcomeLabel: Record<string, string> = {
    winner: 'Winner', unforced_error: 'UE', error: 'FE',
    ace: 'Ace ★', double_fault: 'DF',
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center px-4 py-8 gap-6">
      {/* Live badge */}
      <div className="flex items-center gap-2">
        {isLive ? (
          <span className="flex items-center gap-1.5 rounded-full bg-red-500/20 border border-red-500/40 px-3 py-1 text-xs font-bold text-red-400">
            <span className={`h-1.5 w-1.5 rounded-full bg-red-400 ${pulse ? 'opacity-100' : 'animate-pulse'}`} />
            LIVE
          </span>
        ) : (
          <span className="rounded-full bg-zinc-800 border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-400">
            {match.winner ? `${match.winner === 'team1' ? p1 : p2} won` : 'Completed'}
          </span>
        )}
        <span className="text-xs text-zinc-600 capitalize">{match.match_type}</span>
      </div>

      {/* Scoreboard */}
      <div className={`w-full max-w-sm rounded-2xl border bg-zinc-900 p-6 transition-all duration-300 ${pulse ? 'border-white/20' : 'border-zinc-800'}`}>
        {/* Set history */}
        {completedSets.length > 0 && (
          <div className="mb-4 flex justify-center gap-3 text-xs text-zinc-500 font-mono">
            {completedSets.map(s => (
              <span key={s.id}>{s.team1_games}–{s.team2_games}</span>
            ))}
          </div>
        )}

        {/* Main score grid */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Team 1 */}
          <div className="text-right space-y-1">
            <p className="text-sm font-semibold truncate">
              {p1}{isDoubles && p3 ? ` / ${p3}` : ''}
            </p>
            <p className={`text-xs font-medium ${team1Serving ? 'text-yellow-400' : 'text-zinc-600'}`}>
              {team1Serving ? '● serving' : ''}
            </p>
            <div className={`text-5xl font-black font-mono transition-all duration-300 ${pulse ? 'scale-110' : 'scale-100'} ${match.winner === 'team1' ? 'text-emerald-400' : ''}`}>
              {isDeuce ? 'D' : t1label}
            </div>
            <p className="text-2xl font-bold text-zinc-400">{t1Sets}</p>
          </div>

          <div className="text-zinc-600 text-lg">:</div>

          {/* Team 2 */}
          <div className="text-left space-y-1">
            <p className="text-sm font-semibold truncate">
              {p2}{isDoubles && p4 ? ` / ${p4}` : ''}
            </p>
            <p className={`text-xs font-medium ${!team1Serving && isLive ? 'text-yellow-400' : 'text-zinc-600'}`}>
              {!team1Serving && isLive ? '● serving' : ''}
            </p>
            <div className={`text-5xl font-black font-mono transition-all duration-300 ${pulse ? 'scale-110' : 'scale-100'} ${match.winner === 'team2' ? 'text-emerald-400' : ''}`}>
              {isDeuce ? 'D' : t2label}
            </div>
            <p className="text-2xl font-bold text-zinc-400">{t2Sets}</p>
          </div>
        </div>

        {/* Current set games */}
        {currentSet && (
          <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-center gap-2 text-sm text-zinc-400">
            <span>Set {currentSet.set_number}</span>
            <span className="font-mono">{currentSet.team1_games}–{currentSet.team2_games}</span>
          </div>
        )}
      </div>

      {/* Recent points feed */}
      {recentPoints.length > 0 && (
        <div className="w-full max-w-sm space-y-2">
          <p className="text-xs text-zinc-600 uppercase tracking-widest">Recent points</p>
          {recentPoints.map((pt, i) => (
            <div key={pt.id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${i === 0 ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-900 text-zinc-500'}`}>
              <span>{pt.point_winner === 'team1' ? p1 : p2}</span>
              <span className="font-medium">{pt.outcome ? outcomeLabel[pt.outcome] ?? pt.outcome : '—'}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-zinc-700">Updates automatically</p>
    </div>
  )
}
