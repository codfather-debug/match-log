export type MatchType = 'singles' | 'doubles' | 'practice'
export type MatchStatus = 'pending' | 'in_progress' | 'completed'
export type MatchFormat = {
  sets: 3 | 5
  tiebreak: boolean
  superTiebreak: boolean
  noAd: boolean
}

export type Team = 'team1' | 'team2'
export type PlayerSlot = 'player1' | 'player2' | 'player3' | 'player4'
export type CourtSide = 'deuce' | 'ad'

export type ServeNumber = 1 | 2
export type ServePlacement = 'wide' | 'body' | 'T'
export type ServeResult = 'ace' | 'fault' | 'double_fault' | 'in_play'

export type PointOutcome = 'winner' | 'error' | 'unforced_error' | 'double_fault' | 'ace'
export type ErrorDirection = 'long' | 'wide' | 'net'
export type ShotType =
  | 'forehand'
  | 'backhand'
  | 'forehand_volley'
  | 'backhand_volley'
  | 'overhead'
  | 'lob'
  | 'drop_shot'
  | 'serve'
  | 'return'

export interface Player {
  id: string
  user_id: string
  name: string
  handedness: 'right' | 'left' | null
  nationality: string | null
  created_at: string
}

export interface Match {
  id: string
  user_id: string
  match_type: MatchType
  status: MatchStatus
  format: MatchFormat
  player1_id: string
  player2_id: string
  player3_id: string | null
  player4_id: string | null
  winner: Team | null
  notes: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  // joined
  player1?: Player
  player2?: Player
  player3?: Player | null
  player4?: Player | null
  sets?: MatchSet[]
}

export interface MatchSet {
  id: string
  match_id: string
  set_number: number
  team1_games: number
  team2_games: number
  is_tiebreak: boolean
  is_super_tiebreak: boolean
  winner: Team | null
  games?: Game[]
}

export interface Game {
  id: string
  set_id: string
  match_id: string
  game_number: number
  server: PlayerSlot
  team1_points: number
  team2_points: number
  winner: Team | null
  is_tiebreak: boolean
  points?: Point[]
}

export interface Point {
  id: string
  game_id: string
  match_id: string
  point_number: number
  server: PlayerSlot
  serve_number: ServeNumber
  serve_placement: ServePlacement | null
  serve_result: ServeResult | null
  rally_length: number
  point_winner: Team | null
  outcome: PointOutcome | null
  last_shot_type: ShotType | null
  last_shot_player: PlayerSlot | null
  error_direction: ErrorDirection | null
  court_side: CourtSide | null
  score_before: { team1: string; team2: string } | null
  created_at: string
}

// Score display
export interface ScoreState {
  sets: { team1: number; team2: number }[]
  currentSet: { team1: number; team2: number }
  currentGame: { team1: string; team2: string }
  server: PlayerSlot
  serveNumber: ServeNumber
  courtSide: CourtSide
  matchWinner: Team | null
}

export type PointLogStep =
  | 'serve_placement'
  | 'serve_result'
  | 'rally'
  | 'outcome'
  | 'shot_type'
  | 'error_direction'
  | 'confirm'

export interface PointDraft {
  serve_number: ServeNumber
  serve_placement: ServePlacement | null
  serve_result: ServeResult | null
  rally_length: number
  point_winner: Team | null
  outcome: PointOutcome | null
  last_shot_type: ShotType | null
  last_shot_player: PlayerSlot | null
  error_direction: ErrorDirection | null
}
