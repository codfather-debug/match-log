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

  return { s, d, T, L, z, tNet, netPt, netH, aroundPost, box, exitPt, short, landIn, sideMargin, baseMargin, room, band, c1, c2, recover };
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

// ─── The point: where it goes, who moves where, and the likely reply ──────────

export type ReplyKey = 'cc' | 'dtl' | 'mid' | 'short' | 'lob';
export type Reply = {
  key: ReplyKey;
  label: string;
  from: Pt;
  to: Pt;
  p: number; // probability, 0–1
  blocked: boolean; // passes within reach of the net player
};

const REPLY_LABEL: Record<ReplyKey, string> = {
  cc: 'Crosscourt',
  dtl: 'Down the line',
  mid: 'Down the middle',
  short: 'Short angle',
  lob: 'Lob',
};
export const NET_REACH = 4.5; // arm + racquet + a step: what a net player covers without committing to a poach
const POACH_DEPTH = 7; // ft off the net where the net player intercepts a poach

/** Where the receiver makes contact with the incoming ball. */
export function hitPoint(b: Pt, g: Analysis, kind: Kind): Pt {
  const s = g.s;
  const baseline = s === 1 ? 0 : LEN; // receiver's baseline
  const tAt = (y: number) => (y - b.y) / g.d.y;
  // Serve: returner takes it about a foot behind the baseline.
  // Rally: played ~8 ft after the bounce, but a deep ball no more than ~5 ft behind the baseline.
  const t = kind === 'serve' ? tAt(baseline - s * 1) : Math.min(g.L + 8, Math.max(tAt(baseline - s * 5), g.L));
  const h = along(b, g.d, t);
  return { x: clamp(h.x, -6, 42), y: h.y };
}

/** Distance from p to segment a–b. */
function segDist(p: Pt, a: Pt, b: Pt) {
  const vx = b.x - a.x, vy = b.y - a.y;
  const t = clamp(((p.x - a.x) * vx + (p.y - a.y) * vy) / (vx * vx + vy * vy || 1), 0, 1);
  return Math.hypot(p.x - (a.x + vx * t), p.y - (a.y + vy * t));
}

/** Point on the line a→b (extended) at a given y. */
function atY(a: Pt, b: Pt, y: number): Pt {
  const t = (y - a.y) / (b.y - a.y || 1e-9);
  return { x: a.x + (b.x - a.x) * t, y };
}

/**
 * The receiver's options from their contact point H, back into the hitter's half, with rough odds.
 * Crosscourt is the default (lowest net, most court); being pulled wide or deep makes the line less
 * likely; a short ball opens angles; a net player in the way makes a shot very unlikely.
 */
function replyOptions(H: Pt, s: number, mode: Mode, netMan: Pt | null): Reply[] {
  const { l, r } = SIDES[mode];
  const hitBase = s === 1 ? LEN : 0; // the original hitter's baseline
  const onLeft = H.x <= CX;
  const deep = (x: number): Pt => ({ x, y: hitBase - s * INSET });
  const behind = s === 1 ? -H.y : H.y - LEN; // how far behind their own baseline the receiver is
  const wide = Math.max(4.5 - H.x, H.x - 31.5, 0);
  const netUp = netMan !== null && Math.abs(netMan.y - NET_Y) < 16;

  const opts: { key: ReplyKey; to: Pt; w: number }[] = [
    // doubles returns go crosscourt to the middle of the baseline player's half, not the alley
    { key: 'cc', to: deep(mode === 'doubles' ? (onLeft ? r - 7 : l + 7) : onLeft ? r - INSET : l + INSET), w: 0.45 },
    { key: 'dtl', to: deep(onLeft ? l + INSET : r - INSET), w: 0.2 },
    { key: 'mid', to: deep(CX), w: 0.25 },
    { key: 'short', to: { x: onLeft ? r - 2 : l + 2, y: NET_Y + s * 13 }, w: 0.1 },
  ];
  if (netUp && netMan) opts.push({ key: 'lob', to: { x: clamp(netMan.x, l + 4, r - 4), y: hitBase - s * 5 }, w: 0.08 });

  const out = opts.map(o => {
    let w = o.w;
    if (behind > 4) {
      if (o.key === 'short') w = 0;
      if (o.key === 'mid') w *= 1.4;
      if (o.key === 'dtl') w *= 0.8;
    } else if (behind < -8) {
      if (o.key === 'short') w *= 2;
      if (o.key === 'dtl') w *= 1.3;
    }
    if (wide > 2) {
      if (o.key === 'dtl') w *= 0.6;
      if (o.key === 'cc') w *= 1.3;
    }
    // The net player can reach anything passing close to them on their side of the net
    let blocked = false;
    if (o.key !== 'lob' && netUp && netMan) {
      const a = atY(H, o.to, NET_Y);
      const b = atY(H, o.to, NET_Y + s * 14);
      blocked = segDist(netMan, a, b) < NET_REACH;
      if (blocked) w *= 0.12;
    }
    return { key: o.key, label: REPLY_LABEL[o.key], from: H, to: o.to, p: w, blocked };
  });
  const total = out.reduce((a, o) => a + o.p, 0) || 1;
  return out.map(o => ({ ...o, p: o.p / total })).sort((a, b) => b.p - a.p);
}

/**
 * Everything the "where to be" view needs:
 *   Receiver → moves to the contact point H.
 *   Hitter → recovers to the odds-weighted spot where they'd meet the likely replies.
 *   Hitter's partner (doubles) → ~9 ft off the net, shaded toward the receiver to guard the line,
 *                                with a poach spot on the likely reply.
 *   Receiver's partner (doubles) → at the net covering the middle (on the service line when returning serve).
 */
/** Returner's ready spot: just behind the baseline, near the singles sideline of the box being served into. */
export function returnReady(z: Zone, s: number): Pt {
  const outer = z.x0 === CX ? z.x1 - 2.5 : z.x0 + 2.5;
  return { x: outer, y: (s === 1 ? 0 : LEN) - s * 1.5 };
}

export function play(mode: Mode, kind: Kind, pos: Record<PlayerId, Pt>, ball: Pt, g: Analysis) {
  const ids = PLAYERS[mode];
  const hit = hittingTeam(ids, pos, ball);
  const hitters = ids.filter(id => teamOf(id) === hit);
  const receivers = ids.filter(id => teamOf(id) !== hit);
  const closest = (list: PlayerId[], p: Pt) => list.reduce((a, c) => (dist(pos[c], p) < dist(pos[a], p) ? c : a));
  const s = g.s;
  const { l, r } = SIDES[mode];

  const H = hitPoint(ball, g, kind);
  const hitter = closest(hitters, ball);
  const receiver = closest(receivers, H);
  const hitterPartner = hitters.find(id => id !== hitter) ?? null;
  const receiverPartner = receivers.find(id => id !== receiver) ?? null;

  const replies = replyOptions(H, s, mode, hitterPartner ? pos[hitterPartner] : null);
  const best = replies[0];

  // Hitter: odds-weighted spot where the replies cross 1.5 ft behind their baseline
  const yRec = (s === 1 ? LEN : 0) + s * 1.5;
  let wx = 0, wsum = 0;
  for (const rp of replies) {
    if (rp.key === 'lob') continue;
    wx += clamp(atY(rp.from, rp.to, yRec).x, l - 3, r + 3) * rp.p;
    wsum += rp.p;
  }
  let rx = wsum ? wx / wsum : CX;
  // In doubles the baseline player only covers their half; the partner has the other
  rx = hitterPartner ? (rx >= CX ? clamp(rx, CX + 2, r - 4) : clamp(rx, l + 4, CX - 2)) : clamp(rx, l + 1, r - 1);
  const recover: Pt = { x: rx, y: yRec };

  const spots: Partial<Record<PlayerId, Pt>> = { [hitter]: recover, [receiver]: H };
  let poach: Pt | null = null;
  if (hitterPartner) {
    // Serve: the middle of the box in front of the returner. Rally: shade toward the receiver to guard the line.
    const boxMid = H.x < CX ? (4.5 + CX) / 2 : (CX + 31.5) / 2;
    const x = kind === 'serve' ? boxMid + 0.25 * (H.x - boxMid) : CX + 0.5 * (H.x - CX);
    spots[hitterPartner] = { x: clamp(x, l + 3, r - 3), y: NET_Y + s * 9 };
    // Poach: cut off the most likely reply that isn't a lob, POACH_DEPTH ft off the net
    const target = replies.find(rp => rp.key !== 'lob') ?? best;
    poach = atY(target.from, target.to, NET_Y + s * POACH_DEPTH);
  }
  if (receiverPartner) {
    const side = Math.sign(H.x - CX) || 1;
    spots[receiverPartner] =
      kind === 'serve'
        ? { x: CX - side * 5, y: s === 1 ? SVC : LEN - SVC }
        : { x: CX - side * 4, y: NET_Y - s * 10 };
  }

  return { hit, hitter, receiver, hitterPartner, receiverPartner, H, replies, best, recover, spots, poach };
}
export type Play = ReturnType<typeof play>;

// ─── Plain-language descriptions ──────────────────────────────────────────────

/** "4 ft to your right and 2 ft back" from a player's own point of view (facing the net). */
export function moveWords(from: Pt, to: Pt): string {
  const top = from.y < NET_Y; // top-half players face +y, so their right is −x
  const right = (to.x - from.x) * (top ? -1 : 1);
  const fwd = (to.y - from.y) * (top ? 1 : -1);
  const parts: string[] = [];
  if (Math.abs(right) >= 1.5) parts.push(`${Math.round(Math.abs(right))} ft to your ${right > 0 ? 'right' : 'left'}`);
  if (Math.abs(fwd) >= 1.5) parts.push(`${Math.round(Math.abs(fwd))} ft ${fwd > 0 ? 'forward' : 'back'}`);
  return parts.length ? parts.join(' and ') : 'stay where you are';
}

/** "deep crosscourt" / "short down the line" / "a T serve" … */
export function shotWords(b: Pt, g: Analysis, kind: Kind): string {
  if (kind === 'serve') {
    const center = g.z.x0 === CX ? g.z.x0 : g.z.x1;
    const fromCenter = Math.abs(g.T.x - center);
    return fromCenter < 4 ? 'a serve down the T' : fromCenter > 9.5 ? 'a wide serve' : 'a serve into the body';
  }
  const toFar = Math.abs((g.s === 1 ? 0 : LEN) - g.T.y);
  const depth = toFar < 9 ? 'deep' : toFar < 20 ? 'mid-court' : 'short';
  const dir =
    Math.abs(g.T.x - CX) < 4 ? 'down the middle'
      : (g.T.x < CX) !== (b.x < CX) ? 'crosscourt'
        : 'down the line';
  return `${depth} ${dir}`;
}
