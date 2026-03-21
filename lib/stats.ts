import type { Point } from '@/types/tennis'

export function count<T>(arr: T[], pred: (x: T) => boolean) { return arr.filter(pred).length }

export function byKey<T>(arr: T[], key: (x: T) => string | null | undefined) {
  const map: Record<string, number> = {}
  for (const item of arr) { const k = key(item); if (k) map[k] = (map[k] ?? 0) + 1 }
  return map
}

export function computeStats(points: Point[], games?: { id: string; is_tiebreak: boolean }[]) {
  const p1 = points.filter(p => p.server === 'player1')
  const p2 = points.filter(p => p.server === 'player2')
  const fs1In = count(p1, p => p.serve_number === 1)
  const fs2In = count(p2, p => p.serve_number === 1)
  const ss1Total = count(p1, p => p.serve_number === 2)
  const ss2Total = count(p2, p => p.serve_number === 2)

  const aces1pts = points.filter(p => p.outcome === 'ace' && p.server === 'player1')
  const aces2pts = points.filter(p => p.outcome === 'ace' && p.server === 'player2')
  const df1pts = points.filter(p => p.outcome === 'double_fault' && p.server === 'player1')
  const df2pts = points.filter(p => p.outcome === 'double_fault' && p.server === 'player2')
  const w1pts = points.filter(p => p.outcome === 'winner' && p.point_winner === 'team1')
  const w2pts = points.filter(p => p.outcome === 'winner' && p.point_winner === 'team2')
  const ue1pts = points.filter(p => p.outcome === 'unforced_error' && p.point_winner === 'team2')
  const ue2pts = points.filter(p => p.outcome === 'unforced_error' && p.point_winner === 'team1')

  const isUnsuccessfulReturn = (p: Point) =>
    p.outcome === 'ace' ||
    ((p.outcome === 'unforced_error' || p.outcome === 'error') && p.last_shot_type === 'return')
  const ret1pts = points.filter(p => p.server === 'player2' || p.server === 'player4')
  const ret2pts = points.filter(p => p.server === 'player1' || p.server === 'player3')
  const ret1by1 = ret1pts.filter(p => p.serve_number === 1)
  const ret1by2 = ret1pts.filter(p => p.serve_number === 2)
  const ret2by1 = ret2pts.filter(p => p.serve_number === 1)
  const ret2by2 = ret2pts.filter(p => p.serve_number === 2)

  const tbGameIds = games ? new Set(games.filter(g => g.is_tiebreak).map(g => g.id)) : null
  const tbPoints = tbGameIds ? points.filter(p => tbGameIds.has(p.game_id)) : []
  const tbWon1 = tbPoints.filter(p => p.point_winner === 'team1').length
  const tbWon2 = tbPoints.filter(p => p.point_winner === 'team2').length

  return {
    team1Points: count(points, p => p.point_winner === 'team1'),
    team2Points: count(points, p => p.point_winner === 'team2'),
    aces1: aces1pts.length, aces2: aces2pts.length,
    df1: df1pts.length, df2: df2pts.length,
    winners1: w1pts.length, winners2: w2pts.length,
    ue1: ue1pts.length, ue2: ue2pts.length,
    fs1In, fs2In, ss1Total, ss2Total,
    fs1pct: p1.length ? Math.round((fs1In / p1.length) * 100) : 0,
    fs2pct: p2.length ? Math.round((fs2In / p2.length) * 100) : 0,
    fsWon1: count(p1, p => p.serve_number === 1 && p.point_winner === 'team1'),
    ssWon1: count(p1, p => p.serve_number === 2 && p.point_winner === 'team1'),
    fsWon2: count(p2, p => p.serve_number === 1 && p.point_winner === 'team2'),
    ssWon2: count(p2, p => p.serve_number === 2 && p.point_winner === 'team2'),
    fsRetWon1: count(p2, p => p.serve_number === 1 && p.point_winner === 'team1'),
    ssRetWon1: count(p2, p => p.serve_number === 2 && p.point_winner === 'team1'),
    fsRetWon2: count(p1, p => p.serve_number === 1 && p.point_winner === 'team2'),
    ssRetWon2: count(p1, p => p.serve_number === 2 && p.point_winner === 'team2'),
    avgRally: points.length
      ? (points.reduce((s, p) => s + (p.rally_length ?? 0), 0) / points.length).toFixed(1) : '—',
    aceLoc1: byKey(aces1pts, p => p.serve_placement),
    aceLoc2: byKey(aces2pts, p => p.serve_placement),
    aceServe1: byKey(aces1pts, p => String(p.serve_number)),
    aceServe2: byKey(aces2pts, p => String(p.serve_number)),
    dfLoc1: byKey(df1pts, p => p.serve_placement),
    dfLoc2: byKey(df2pts, p => p.serve_placement),
    winnerStrokes1: byKey(w1pts, p => p.last_shot_type),
    winnerStrokes2: byKey(w2pts, p => p.last_shot_type),
    ueStrokes1: byKey(ue1pts, p => p.last_shot_type),
    ueStrokes2: byKey(ue2pts, p => p.last_shot_type),
    ueDirs1: byKey(ue1pts, p => p.error_direction),
    ueDirs2: byKey(ue2pts, p => p.error_direction),
    svcLoc1by1: byKey(p1.filter(p => p.serve_number === 1), p => p.serve_placement),
    svcLoc1by2: byKey(p1.filter(p => p.serve_number === 2), p => p.serve_placement),
    svcLoc2by1: byKey(p2.filter(p => p.serve_number === 1), p => p.serve_placement),
    svcLoc2by2: byKey(p2.filter(p => p.serve_number === 2), p => p.serve_placement),
    p1Total: p1.length, p2Total: p2.length,
    retTotal1: ret1pts.length, retTotal2: ret2pts.length,
    retSucc1: count(ret1pts, p => !isUnsuccessfulReturn(p)),
    retSucc2: count(ret2pts, p => !isUnsuccessfulReturn(p)),
    retSucc1by1: count(ret1by1, p => !isUnsuccessfulReturn(p)), retTotal1by1: ret1by1.length,
    retSucc1by2: count(ret1by2, p => !isUnsuccessfulReturn(p)), retTotal1by2: ret1by2.length,
    retSucc2by1: count(ret2by1, p => !isUnsuccessfulReturn(p)), retTotal2by1: ret2by1.length,
    retSucc2by2: count(ret2by2, p => !isUnsuccessfulReturn(p)), retTotal2by2: ret2by2.length,
    retLocTotal1: byKey(ret1pts, p => p.serve_placement),
    retLocSucc1: byKey(ret1pts.filter(p => !isUnsuccessfulReturn(p)), p => p.serve_placement),
    retLocTotal2: byKey(ret2pts, p => p.serve_placement),
    retLocSucc2: byKey(ret2pts.filter(p => !isUnsuccessfulReturn(p)), p => p.serve_placement),
    svcWinLoc1by1: byKey(p1.filter(p => p.serve_number === 1 && p.point_winner === 'team1'), p => p.serve_placement),
    svcWinLoc1by2: byKey(p1.filter(p => p.serve_number === 2 && p.point_winner === 'team1'), p => p.serve_placement),
    svcWinLoc2by1: byKey(p2.filter(p => p.serve_number === 1 && p.point_winner === 'team2'), p => p.serve_placement),
    svcWinLoc2by2: byKey(p2.filter(p => p.serve_number === 2 && p.point_winner === 'team2'), p => p.serve_placement),
    tbPoints: tbPoints.length,
    tbWon1,
    tbWon2,
    tbPct1: tbPoints.length ? Math.round((tbWon1 / tbPoints.length) * 100) : null,
    tbPct2: tbPoints.length ? Math.round((tbWon2 / tbPoints.length) * 100) : null,
  }
}

export type MatchStats = ReturnType<typeof computeStats>
