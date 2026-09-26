// ─── Shot Geometry: court math ────────────────────────────────────────────────
// All coordinates are in FEET, seen from above:
//   x = 0 → 36 across (doubles sidelines), y = 0 → 78 along the court, net at y = 39.
// A shot is a straight line from the contact point (no curve in the top-down view).

export type Mode = 'singles' | 'doubles';
export type Kind = 'rally' | 'serve';
export type Pt = { x: number; y: number };
export type Zone = { x0: number; x1: number; y0: number; y1: number };
export type PlayerId = 'A' | 'B' | 'A1' | 'A2' | 'B1' | 'B2';
export type RallyPreset = 'cc' | 'dtl' | 'io' | 'ii' | 'short' | 'mid';
export type ServePreset = 'T' | 'body' | 'wide';
export type Preset = RallyPreset | ServePreset;

export const LEN = 78;
export const NET_Y = 39;
export const CX = 18;
export const SVC = 21; // service line distance from baseline
export const INSET = 3; // preset targets aim 3 ft inside the lines
export const MAX_ANGLE = 50; // degrees off straight, shared by dragging and the slider
export const SIDES: Record<Mode, { l: number; r: number }> = {
  singles: { l: 4.5, r: 31.5 },
  doubles: { l: 0, r: 36 },
};
export const PLAYERS: Record<Mode, PlayerId[]> = { singles: ['A', 'B'], doubles: ['A1', 'A2', 'B1', 'B2'] };

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const toDeg = (r: number) => (r * 180) / Math.PI;
export const toRad = (d: number) => (d * Math.PI) / 180;
export const f1 = (n: number) => n.toFixed(1);
export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** +1 when the hitter is on the bottom half (hits toward y = 0), −1 when on the top half. */
export const sideSign = (b: Pt) => (b.y >= NET_Y ? 1 : -1);
export const dirOf = (theta: number, s: number): Pt => ({ x: Math.sin(theta), y: -s * Math.cos(theta) });
export const along = (b: Pt, d: Pt, t: number): Pt => ({ x: b.x + d.x * t, y: b.y + d.y * t });

/** Net height (ft) at a given x. Linear sag from 3.5 ft at the posts/sticks to 3 ft at the center strap. */
export function netHeightAt(x: number, mode: Mode) {
  const half = mode === 'singles' ? 16.5 : 21; // center → singles stick / doubles post (3 ft outside sideline)
  const d = Math.min(Math.abs(x - CX), half);
  return 3 + (0.5 * d) / half;
}

/** Where the shot has to land: the opponent's half for a rally ball, the diagonal service box for a serve. */
export function targetZone(b: Pt, mode: Mode, kind: Kind): Zone {
  const s = sideSign(b);
  if (kind === 'serve') {
    const [x0, x1] = b.x >= CX ? [4.5, CX] : [CX, 31.5];
    return s === 1 ? { x0, x1, y0: SVC, y1: NET_Y } : { x0, x1, y0: NET_Y, y1: LEN - SVC };
  }
  const { l, r } = SIDES[mode];
  return s === 1 ? { x0: l, x1: r, y0: 0, y1: NET_Y } : { x0: l, x1: r, y0: NET_Y, y1: LEN };
}

export const inZone = (p: Pt, z: Zone) => p.x >= z.x0 && p.x <= z.x1 && p.y >= z.y0 && p.y <= z.y1;
/** The far edge of the zone (baseline or service line). */
export const farEdge = (z: Zone, s: number) => (s === 1 ? z.y0 : z.y1);

/** Angle/length that sends the ball from b to target t. */
export function shotTo(b: Pt, t: Pt): { theta: number; L: number } {
  const s = sideSign(b);
  const fwd = -(t.y - b.y) * s;
  return {
    theta: clamp(Math.atan2(t.x - b.x, Math.max(fwd, 0.5)), toRad(-MAX_ANGLE), toRad(MAX_ANGLE)),
    L: Math.hypot(t.x - b.x, t.y - b.y),
  };
}

// ─── Presets ──────────────────────────────────────────────────────────────────

export const RALLY_PRESETS: { v: RallyPreset; label: string }[] = [
  { v: 'cc', label: 'Crosscourt' },
  { v: 'dtl', label: 'Down the line' },
  { v: 'io', label: 'Inside-out' },
  { v: 'ii', label: 'Inside-in' },
  { v: 'short', label: 'Short angle' },
  { v: 'mid', label: 'Deep middle' },
];
export const SERVE_PRESETS: { v: ServePreset; label: string }[] = [
  { v: 'T', label: 'T' },
  { v: 'body', label: 'Body' },
  { v: 'wide', label: 'Wide' },
];

const baselineY = (s: number) => (s === 1 ? 79 : -1);

/** Serving stance: 2 ft from the center mark on the deuce (server's right) or ad side. */
export function serveSpot(s: number, deuce: boolean): Pt {
  const right = s === 1 ? 1 : -1; // bottom server's right is +x
  return { x: CX + (deuce ? 2 : -2) * right, y: s === 1 ? 78.5 : -0.5 };
}
export const isDeuce = (b: Pt) => (sideSign(b) === 1 ? b.x >= CX : b.x <= CX);

/**
 * Contact point (when the preset implies one) and target for a preset.
 * Inside-out / inside-in assume a right-hander running around the backhand.
 */
export function presetShot(p: Preset, b: Pt, mode: Mode, kind: Kind): { ball: Pt; target: Pt } {
  const s = sideSign(b);
  let ball = b;
  if (p === 'io' || p === 'ii') ball = { x: CX - s * 6, y: baselineY(s) };
  const z = targetZone(ball, mode, kind);
  const onLeft = ball.x <= CX;
  const far = farEdge(z, s);

  if (kind === 'serve' || p === 'T' || p === 'body' || p === 'wide') {
    const centerIsX0 = z.x0 === CX;
    const tX = centerIsX0 ? z.x0 + 1.5 : z.x1 - 1.5;
    const wX = centerIsX0 ? z.x1 - 1.5 : z.x0 + 1.5;
    const x = p === 'wide' ? wX : p === 'body' ? (z.x0 + z.x1) / 2 : tX;
    return { ball, target: { x, y: far + s * 2.5 } };
  }

  const sameX = onLeft ? z.x0 + INSET : z.x1 - INSET;
  const oppX = onLeft ? z.x1 - INSET : z.x0 + INSET;
  switch (p) {
    case 'dtl':
    case 'ii':
      return { ball, target: { x: sameX, y: far + s * INSET } };
    case 'short':
      return { ball, target: { x: onLeft ? z.x1 - 2 : z.x0 + 2, y: NET_Y - s * 13 } };
    case 'mid':
      return { ball, target: { x: CX, y: far + s * 4 } };
    default:
      return { ball, target: { x: oppX, y: far + s * INSET } };
  }
}

/** Landing spots the target snaps to while dragging. */
export function snapTargets(b: Pt, mode: Mode, kind: Kind): Pt[] {
  const list = kind === 'serve' ? SERVE_PRESETS.map(p => p.v) : (['cc', 'dtl', 'short', 'mid'] as Preset[]);
  return list.map(p => presetShot(p, b, mode, kind).target);
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

/** Parametric interval [tIn, tOut] where the ray from b along d is inside the zone. */
function zoneInterval(b: Pt, d: Pt, z: Zone, kind: Kind) {
  let tIn = -Infinity;
  let tOut = Infinity;
  let exitLine = kind === 'serve' ? 'service line' : 'baseline';
  if (Math.abs(d.y) > 1e-9) {
    const a = (z.y0 - b.y) / d.y;
    const c = (z.y1 - b.y) / d.y;
    tIn = Math.max(tIn, Math.min(a, c));
    tOut = Math.max(a, c);
  }
  if (Math.abs(d.x) < 1e-9) {
    if (b.x < z.x0 || b.x > z.x1) tIn = Infinity;
  } else {
    const a = (z.x0 - b.x) / d.x;
    const c = (z.x1 - b.x) / d.x;
    tIn = Math.max(tIn, Math.min(a, c));
    if (Math.max(a, c) < tOut) {
      tOut = Math.max(a, c);
      const xExit = b.x + d.x * tOut;
      exitLine = Math.abs(xExit - CX) < 0.01 ? 'center line' : 'sideline';
    }
  }
  return { tIn, tOut, exitLine, reaches: tIn <= tOut && tOut > 0 };
}

/**
 * Direction-only error: the ball leaves the racquet anywhere within ±deg of the intended
 * direction and travels the same length L. Returns how often it lands in / wide / long / short of the net.
 */
export function bandStats(b: Pt, theta: number, L: number, mode: Mode, z: Zone, deg: number) {
  const s = sideSign(b);
  const delta = toRad(deg);
  const N = 241;
  let wide = 0, long = 0, net = 0;
  for (let i = 0; i < N; i++) {
    const phi = theta - delta + (2 * delta * i) / (N - 1);
    const dd = dirOf(phi, s);
    const p = along(b, dd, L);
    if (L < (NET_Y - b.y) / dd.y) net++;
    else if (p.x < z.x0 || p.x > z.x1) wide++;
    else if (s === 1 ? p.y < z.y0 : p.y > z.y1) long++;
  }
  const nets = [-delta, 0, delta].map(k => {
    const dd = dirOf(theta + k, s);
    return netHeightAt(along(b, dd, (NET_Y - b.y) / dd.y).x, mode);
  });
  const pct = (n: number) => (100 * n) / N;
  return {
    delta,
    lateral: L * Math.tan(delta),
    pctIn: pct(N - wide - long - net),
    pctWide: pct(wide),
    pctLong: pct(long),
    netLo: Math.min(...nets),
    netHi: Math.max(...nets),
  };
}

export function analyze(b: Pt, theta: number, L: number, mode: Mode, kind: Kind, err: number) {
  const s = sideSign(b);
  const d = dirOf(theta, s);
  const T = along(b, d, L);
  const z = targetZone(b, mode, kind);
  const { l, r } = SIDES[mode];

  const tNet = (NET_Y - b.y) / d.y;
  const netPt = along(b, d, tNet);
  const netH = netHeightAt(netPt.x, mode);
  const post = mode === 'singles' ? { l: l - 3, r: r + 3 } : { l: -3, r: 39 };
  const aroundPost = netPt.x < post.l || netPt.x > post.r;

  const box = zoneInterval(b, d, z, kind);
  const exitPt = box.reaches ? along(b, d, box.tOut) : null;
  const short = L < tNet;
  const landIn = inZone(T, z) && !short;

  const sideMargin = Math.min(T.x - z.x0, z.x1 - T.x);
  const baseMargin = s === 1 ? T.y - z.y0 : z.y1 - T.y; // negative = long
  const room = box.reaches ? box.tOut - L : 0;

  const band = err > 0 ? bandStats(b, theta, L, mode, z, err) : null;

  // Recovery: bisect the opponent's reply angle (from the landing spot to the hitter's baseline corners)
  const nearY = s === 1 ? LEN : 0;
  const c1 = { x: l, y: nearY };
  const c2 = { x: r, y: nearY };
  const n1 = dist(c1, T) || 1;
  const n2 = dist(c2, T) || 1;
  const u = { x: (c1.x - T.x) / n1 + (c2.x - T.x) / n2, y: (c1.y - T.y) / n1 + (c2.y - T.y) / n2 };
  const tr = Math.abs(u.y) > 1e-6 ? (nearY - T.y) / u.y : 0;
  const recover = tr > 0 ? along(T, u, tr) : null;

  return { s, d, T, z, tNet, netPt, netH, aroundPost, box, exitPt, short, landIn, sideMargin, baseMargin, room, band, c1, c2, recover };
}
export type Analysis = ReturnType<typeof analyze>;

/** Crosscourt vs down-the-line from the current contact point, both aimed 3 ft inside the corner. */
export function compareShots(b: Pt, mode: Mode, deg: number) {
  const s = sideSign(b);
  const z = targetZone(b, mode, 'rally');
  const far = farEdge(z, s);
  const one = (p: 'cc' | 'dtl') => {
    const { theta, L } = shotTo(b, presetShot(p, b, mode, 'rally').target);
    const d = dirOf(theta, s);
    const toBaseline = Math.abs(far - b.y) / Math.cos(theta); // along the path to the far baseline
    const netX = along(b, d, (NET_Y - b.y) / d.y).x;
    return { theta, L, toBaseline, netH: netHeightAt(netX, mode), band: bandStats(b, theta, L, mode, z, deg) };
  };
  const cc = one('cc');
  const dtl = one('dtl');
  return {
    cc,
    dtl,
    extraDepthFt: cc.toBaseline - dtl.toBaseline,
    extraDepthPct: (100 * (cc.toBaseline - dtl.toBaseline)) / dtl.toBaseline,
    widthGain: cc.band.pctIn - dtl.band.pctIn,
  };
}
export type Comparison = ReturnType<typeof compareShots>;

// ─── Teams & positioning ──────────────────────────────────────────────────────

export const teamOf = (id: PlayerId) => id[0] as 'A' | 'B';

/** The hitting team is whichever team has the player closest to the contact point. */
export function hittingTeam(ids: PlayerId[], pos: Record<PlayerId, Pt>, ball: Pt): 'A' | 'B' {
  let best = ids[0];
  for (const id of ids) if (dist(pos[id], ball) < dist(pos[best], ball)) best = id;
  return teamOf(best);
}

/**
 * Where everyone should be once the ball lands.
 *   Hitter → recovery spot on the bisector, just behind the baseline.
 *   Hitter's partner (doubles) → ~10 ft off the net, shaded toward the ball.
 *   Receiver → a few feet behind the bounce.
 *   Receiver's partner (doubles) → inside the service line, guarding the middle of their half.
 */
export function idealSpots(mode: Mode, pos: Record<PlayerId, Pt>, ball: Pt, g: Analysis): Partial<Record<PlayerId, Pt>> {
  const ids = PLAYERS[mode];
  const hit = hittingTeam(ids, pos, ball);
  const hitters = ids.filter(id => teamOf(id) === hit);
  const receivers = ids.filter(id => teamOf(id) !== hit);
  const closest = (list: PlayerId[], p: Pt) => list.reduce((a, c) => (dist(pos[c], p) < dist(pos[a], p) ? c : a));
  const s = g.s;
  const out: Partial<Record<PlayerId, Pt>> = {};

  const hitter = closest(hitters, ball);
  const rec = g.recover ?? { x: CX, y: s === 1 ? LEN : 0 };
  out[hitter] = { x: clamp(rec.x, 2, 34), y: rec.y + s * 1.5 };

  const receiver = closest(receivers, g.T);
  const behind = along(g.T, g.d, 6);
  out[receiver] = { x: clamp(behind.x, -4, 40), y: clamp(behind.y, -8, LEN + 8) };

  if (mode === 'doubles') {
    const side = Math.sign(g.T.x - CX) || 1;
    const hp = hitters.find(id => id !== hitter);
    if (hp) out[hp] = { x: CX + 0.5 * (g.T.x - CX), y: NET_Y + s * 10 };
    const rp = receivers.find(id => id !== receiver);
    if (rp) out[rp] = { x: CX - side * 4.5, y: NET_Y - s * 12 };
  }
  return out;
}
