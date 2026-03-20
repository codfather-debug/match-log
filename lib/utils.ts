import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Game, MatchFormat, MatchSet, PlayerSlot, ScoreState, ServeNumber, Team } from '@/types/tennis'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Tennis score display
const POINT_LABELS: Record<number, string> = { 0: '0', 1: '15', 2: '30', 3: '40' }

export function pointLabel(points: number, opponentPoints: number, isNoAd = false): string {
  if (points >= 3 && opponentPoints >= 3) {
    if (isNoAd) return points > opponentPoints ? 'Ad' : '40'
    if (points === opponentPoints) return '40'
    return points > opponentPoints ? 'Ad' : '40'
  }
  return POINT_LABELS[points] ?? String(points)
}

export function isDeuceGame(t1: number, t2: number): boolean {
  return t1 >= 3 && t2 >= 3
}

export function gameWinner(t1: number, t2: number, noAd: boolean): Team | null {
  if (noAd) {
    if (t1 >= 4 && t1 > t2) return 'team1'
    if (t2 >= 4 && t2 > t1) return 'team2'
    return null
  }
  if (t1 >= 4 && t1 >= t2 + 2) return 'team1'
  if (t2 >= 4 && t2 >= t1 + 2) return 'team2'
  return null
}

export function tiebreakWinner(t1: number, t2: number, isSuper = false): Team | null {
  const min = isSuper ? 10 : 7
  if (t1 >= min && t1 >= t2 + 2) return 'team1'
  if (t2 >= min && t2 >= t1 + 2) return 'team2'
  return null
}

export function setWinner(t1: number, t2: number): Team | null {
  if (t1 >= 6 && t1 >= t2 + 2) return 'team1'
  if (t2 >= 6 && t2 >= t1 + 2) return 'team2'
  if (t1 === 7 && t2 <= 6) return 'team1'
  if (t2 === 7 && t1 <= 6) return 'team2'
  return null
}

export function needsTiebreak(t1: number, t2: number): boolean {
  return t1 === 6 && t2 === 6
}

export function nextServer(currentServer: PlayerSlot, matchType: 'singles' | 'doubles'): PlayerSlot {
  if (matchType === 'singles') {
    return currentServer === 'player1' ? 'player2' : 'player1'
  }
  // Doubles rotation: p1 -> p3 -> p2 -> p4 -> p1
  const rotation: PlayerSlot[] = ['player1', 'player3', 'player2', 'player4']
  const idx = rotation.indexOf(currentServer)
  return rotation[(idx + 1) % 4]
}

export function teamOfPlayer(slot: PlayerSlot): Team {
  return slot === 'player1' || slot === 'player3' ? 'team1' : 'team2'
}

export function initialServer(): PlayerSlot {
  return 'player1'
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function setScoreDisplay(set: MatchSet): string {
  return `${set.team1_games}-${set.team2_games}`
}

export function buildScoreState(
  sets: MatchSet[],
  currentGame: Game,
  format: MatchFormat,
): ScoreState {
  const completedSets = sets.filter((s) => s.winner !== null)
  const setsScore = completedSets.map((s) => ({ team1: s.team1_games, team2: s.team2_games }))

  const currentSetData = sets.find((s) => s.winner === null)
  const currentSet = currentSetData
    ? { team1: currentSetData.team1_games, team2: currentSetData.team2_games }
    : { team1: 0, team2: 0 }

  const t1p = currentGame.team1_points
  const t2p = currentGame.team2_points

  let t1Label: string
  let t2Label: string

  if (currentGame.is_tiebreak) {
    t1Label = String(t1p)
    t2Label = String(t2p)
  } else {
    t1Label = pointLabel(t1p, t2p, format.noAd)
    t2Label = pointLabel(t2p, t1p, format.noAd)
    if (isDeuceGame(t1p, t2p) && t1p === t2p) {
      t1Label = 'Deuce'
      t2Label = 'Deuce'
    }
  }

  // Court side: deuce side when sum of points is even
  const totalPoints = t1p + t2p
  const courtSide = totalPoints % 2 === 0 ? 'deuce' : 'ad'

  return {
    sets: setsScore,
    currentSet,
    currentGame: { team1: t1Label, team2: t2Label },
    server: currentGame.server,
    serveNumber: 1 as ServeNumber,
    courtSide,
    matchWinner: null,
  }
}
