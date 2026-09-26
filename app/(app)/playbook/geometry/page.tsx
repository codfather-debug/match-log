'use client';
import { useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// ─── Shot Geometry ────────────────────────────────────────────────────────────
// Interactive top-down court. All SVG coordinates are in FEET:
//   x = 0 → 36 across (doubles sidelines), y = 0 → 78 along the court, net at y = 39.
// The shot is modelled as a straight line seen from above (no spin / arc).

type Mode = 'singles' | 'doubles';
type Preset = 'cc' | 'dtl' | null;
type ErrLevel = 0 | 1 | 2 | 3 | 5; // degrees of direction error
type Pt = { x: number; y: number };
type PlayerId = 'A' | 'B' | 'A1' | 'A2' | 'B1' | 'B2';
type DragId = 'ball' | 'target' | PlayerId;

const LEN = 78;
const NET_Y = 39;
const CX = 18;
const SVC = 21; // service line distance from baseline
const SIDES: Record<Mode, { l: number; r: number }> = {
  singles: { l: 4.5, r: 31.5 },
  doubles: { l: 0, r: 36 },
};
const VB = { x: -9, y: -12, w: 54, h: 102 };
const INSET = 3; // preset targets aim 3 ft inside the lines

const PLAYERS: Record<Mode, PlayerId[]> = { singles: ['A', 'B'], doubles: ['A1', 'A2', 'B1', 'B2'] };
const DEFAULT_POS: Record<PlayerId, Pt> = {
  A: { x: 24, y: 80.5 },
  B: { x: 18, y: -2 },
  A1: { x: 24, y: 80.5 },
  A2: { x: 11, y: 52 },
  B1: { x: 9, y: -1.5 },
  B2: { x: 25, y: 27 },
};
const DEFAULT_BALL: Pt = { x: 22, y: 79 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const toDeg = (r: number) => (r * 180) / Math.PI;
const toRad = (d: number) => (d * Math.PI) / 180;
const f1 = (n: number) => n.toFixed(1);

/** Net height (ft) at a given x. Linear sag from 3.5 ft at the posts/sticks to 3 ft at the center strap. */
function netHeightAt(x: number, mode: Mode) {
  const half = mode === 'singles' ? 16.5 : 21; // center → singles stick / doubles post (3 ft outside sideline)
  const d = Math.min(Math.abs(x - CX), half);
  return 3 + (0.5 * d) / half;
}

/** +1 when the hitter is on the bottom half (hits toward y = 0), −1 when on the top half. */
const sideSign = (b: Pt) => (b.y >= NET_Y ? 1 : -1);
const dirOf = (theta: number, s: number): Pt => ({ x: Math.sin(theta), y: -s * Math.cos(theta) });
const along = (b: Pt, d: Pt, t: number): Pt => ({ x: b.x + d.x * t, y: b.y + d.y * t });

/** Angle/length that sends the ball from b to target t. */
function shotTo(b: Pt, t: Pt): { theta: number; L: number } {
  const s = sideSign(b);
  const fwd = -(t.y - b.y) * s;
  return { theta: clamp(Math.atan2(t.x - b.x, Math.max(fwd, 0.5)), toRad(-60), toRad(60)), L: Math.hypot(t.x - b.x, t.y - b.y) };
}

function presetTarget(b: Pt, preset: 'cc' | 'dtl', mode: Mode): Pt {
  const { l, r } = SIDES[mode];
  const s = sideSign(b);
  const farY = s === 1 ? 0 : LEN;
  const onLeft = b.x <= CX;
  const sameX = onLeft ? l + INSET : r - INSET;
  const oppX = onLeft ? r - INSET : l + INSET;
  return { x: preset === 'dtl' ? sameX : oppX, y: farY + s * INSET };
}

/** Parametric interval [tIn, tOut] where the ray from b along d is inside the opponent's in-bounds box. */
function inBoundsInterval(b: Pt, d: Pt, mode: Mode) {
  const { l, r } = SIDES[mode];
  const s = sideSign(b);
  const farY = s === 1 ? 0 : LEN;
  let tIn = -Infinity;
  let tOut = Infinity;
  let exitLine = 'baseline';
  if (Math.abs(d.y) > 1e-9) {
    const a = (NET_Y - b.y) / d.y;
    const c = (farY - b.y) / d.y;
    tIn = Math.max(tIn, Math.min(a, c));
    tOut = Math.max(a, c);
  }
  if (Math.abs(d.x) < 1e-9) {
    if (b.x < l || b.x > r) tIn = Infinity;
  } else {
    const a = (l - b.x) / d.x;
    const c = (r - b.x) / d.x;
    tIn = Math.max(tIn, Math.min(a, c));
    if (Math.max(a, c) < tOut) {
      tOut = Math.max(a, c);
      exitLine = 'sideline';
    }
  }
  return { tIn, tOut, exitLine, reaches: tIn <= tOut && tOut > 0 };
}

function inBox(p: Pt, s: number, mode: Mode) {
  const { l, r } = SIDES[mode];
  const inX = p.x >= l && p.x <= r;
  const inY = s === 1 ? p.y >= 0 && p.y <= NET_Y : p.y >= NET_Y && p.y <= LEN;
  return inX && inY;
}

/**
 * Direction-only error: the ball leaves the racquet anywhere within ±deg of the intended
 * direction and travels the same length L. Returns how often it lands in / wide / long / in the net.
 */
function bandStats(b: Pt, theta: number, L: number, mode: Mode, deg: number) {
  const s = sideSign(b);
  const { l, r } = SIDES[mode];
  const delta = toRad(deg);
  const N = 241;
  let wide = 0, long = 0, net = 0;
  for (let i = 0; i < N; i++) {
    const phi = theta - delta + (2 * delta * i) / (N - 1);
    const dd = dirOf(phi, s);
    const p = along(b, dd, L);
    if (L < (NET_Y - b.y) / dd.y) net++;
    else if (p.x < l || p.x > r) wide++;
    else if (s === 1 ? p.y < 0 : p.y > LEN) long++;
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
    pctNet: pct(net),
    netLo: Math.min(...nets),
    netHi: Math.max(...nets),
  };
}

/** Crosscourt vs down-the-line from the current contact point, both aimed 3 ft inside the corner. */
function compareShots(b: Pt, mode: Mode, deg: number) {
  const s = sideSign(b);
  const farY = s === 1 ? 0 : LEN;
  const one = (p: 'cc' | 'dtl') => {
    const { theta, L } = shotTo(b, presetTarget(b, p, mode));
    const d = dirOf(theta, s);
    const toBaseline = Math.abs(farY - b.y) / Math.cos(theta); // along the path to the far baseline
    const netX = along(b, d, (NET_Y - b.y) / d.y).x;
    return { theta, L, toBaseline, netH: netHeightAt(netX, mode), band: bandStats(b, theta, L, mode, deg) };
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

function analyze(b: Pt, theta: number, L: number, mode: Mode, err: ErrLevel) {
  const s = sideSign(b);
  const d = dirOf(theta, s);
  const T = along(b, d, L);
  const { l, r } = SIDES[mode];

  const tNet = (NET_Y - b.y) / d.y;
  const netPt = along(b, d, tNet);
  const netH = netHeightAt(netPt.x, mode);
  const post = mode === 'singles' ? { l: l - 3, r: r + 3 } : { l: -3, r: 39 };
  const aroundPost = netPt.x < post.l || netPt.x > post.r;

  const box = inBoundsInterval(b, d, mode);
  const exitPt = box.reaches ? along(b, d, box.tOut) : null;
  const short = L < tNet;
  const landIn = inBox(T, s, mode) && !short;

  const sideMargin = Math.min(T.x - l, r - T.x);
  const baseMargin = s === 1 ? T.y : LEN - T.y; // negative = long
  const room = box.reaches ? box.tOut - L : 0;

  const band = err > 0 ? bandStats(b, theta, L, mode, err) : null;

  // Recovery hint: bisect the opponent's reply angle (from landing spot to the hitter's baseline corners)
  const nearY = s === 1 ? LEN : 0;
  const c1 = { x: l, y: nearY };
  const c2 = { x: r, y: nearY };
  const n1 = Math.hypot(c1.x - T.x, c1.y - T.y) || 1;
  const n2 = Math.hypot(c2.x - T.x, c2.y - T.y) || 1;
  const u = { x: (c1.x - T.x) / n1 + (c2.x - T.x) / n2, y: (c1.y - T.y) / n1 + (c2.y - T.y) / n2 };
  const tr = Math.abs(u.y) > 1e-6 ? (nearY - T.y) / u.y : 0;
  const recover = tr > 0 ? along(T, u, tr) : null;

  return { s, d, T, tNet, netPt, netH, aroundPost, box, exitPt, short, landIn, sideMargin, baseMargin, room, band, c1, c2, recover };
}

function arcPath(b: Pt, s: number, a0: number, a1: number, rad: number) {
  const n = 32;
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const p = along(b, dirOf(a0 + ((a1 - a0) * i) / n, s), rad);
    pts.push(`${p.x.toFixed(2)},${p.y.toFixed(2)}`);
  }
  return `M${pts.join('L')}`;
}

function sectorPath(b: Pt, s: number, a0: number, a1: number, r0: number, r1: number) {
  const n = 24;
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const p = along(b, dirOf(a0 + ((a1 - a0) * i) / n, s), r1);
    pts.push(`${p.x.toFixed(2)},${p.y.toFixed(2)}`);
  }
  for (let i = n; i >= 0; i--) {
    const p = along(b, dirOf(a0 + ((a1 - a0) * i) / n, s), r0);
    pts.push(`${p.x.toFixed(2)},${p.y.toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShotGeometryPage() {
  const uid = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement>(null);

  const [mode, setMode] = useState<Mode>('singles');
  const [ball, setBall] = useState<Pt>(DEFAULT_BALL);
  const [preset, setPreset] = useState<Preset>('cc');
  const [shot, setShot] = useState(() => shotTo(DEFAULT_BALL, presetTarget(DEFAULT_BALL, 'cc', 'singles')));
  const [err, setErr] = useState<ErrLevel>(0);
  const [showTraj, setShowTraj] = useState(true);
  const [showRecover, setShowRecover] = useState(false);
  const [showMoves, setShowMoves] = useState(true);
  const [showCompare, setShowCompare] = useState(false);
  const [pos, setPos] = useState<Record<PlayerId, Pt>>(DEFAULT_POS);
  const [ghost, setGhost] = useState<Partial<Record<PlayerId, Pt>>>({});
  const [drag, setDrag] = useState<DragId | null>(null);

  const g = useMemo(() => analyze(ball, shot.theta, shot.L, mode, err), [ball, shot, mode, err]);
  const cmpDeg = err || 3;
  const cmp = useMemo(() => compareShots(ball, mode, cmpDeg), [ball, mode, cmpDeg]);
  const { l, r } = SIDES[mode];

  // ── helpers ──
  const applyPreset = (p: 'cc' | 'dtl', b = ball, m = mode) => {
    setPreset(p);
    setShot(shotTo(b, presetTarget(b, p, m)));
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setGhost({});
    if (preset) setShot(shotTo(ball, presetTarget(ball, preset, m)));
  };

  const resetAll = () => {
    setBall(DEFAULT_BALL);
    setPos(DEFAULT_POS);
    setGhost({});
    applyPreset('cc', DEFAULT_BALL);
  };

  const randomShot = () => {
    const bottom = Math.random() < 0.75;
    const b = { x: 3 + Math.random() * 30, y: bottom ? 76 + Math.random() * 8 : 2 - Math.random() * 8 };
    const s = sideSign(b);
    const farY = s === 1 ? 0 : LEN;
    const t = { x: l - 2 + Math.random() * (r - l + 4), y: farY + s * (-2 + Math.random() * 22) };
    setBall(b);
    setPreset(null);
    setShot(shotTo(b, t));
    setGhost({});
    setShowTraj(false);
  };

  const svgPoint = (e: React.PointerEvent): Pt | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const q = p.matrixTransform(ctm.inverse());
    return { x: clamp(q.x, VB.x + 1, VB.x + VB.w - 1), y: clamp(q.y, VB.y + 1, VB.y + VB.h - 1) };
  };

  const startDrag = (id: DragId) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDrag(id);
    if (id !== 'ball' && id !== 'target' && !ghost[id]) setGhost(gh => ({ ...gh, [id]: pos[id] }));
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = svgPoint(e);
    if (!p) return;
    if (drag === 'ball') {
      setBall(p);
      if (preset) setShot(shotTo(p, presetTarget(p, preset, mode)));
    } else if (drag === 'target') {
      setPreset(null);
      setShot(shotTo(ball, p));
    } else {
      setPos(ps => ({ ...ps, [drag]: p }));
    }
  };

  const endDrag = () => setDrag(null);

  // ── derived drawing bits ──
  const angleDeg = toDeg(shot.theta);
  const extEnd = along(ball, g.d, 200);
  const trajColor = g.landIn ? '#a3e635' : '#f87171';

  return (
    <div className="space-y-6 pb-6">
      <Link href="/playbook" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100">
        <ArrowLeft className="h-4 w-4" /> Playbook
      </Link>

      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-zinc-100">Shot Geometry</h1>
        <p className="text-sm text-zinc-400">
          Drag the ball, the landing spot, and the players. Hide the trajectory to quiz yourself.
        </p>
      </div>

      {/* ── Controls ── */}
      <section className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Segmented
            value={mode}
            onChange={v => switchMode(v as Mode)}
            options={[{ v: 'singles', label: 'Singles' }, { v: 'doubles', label: 'Doubles' }]}
          />
          <Segmented
            value={preset ?? ''}
            onChange={v => applyPreset(v as 'cc' | 'dtl')}
            options={[{ v: 'cc', label: 'Crosscourt' }, { v: 'dtl', label: 'Down line' }]}
          />
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-4">
          <Slider
            label="Shot angle"
            value={angleDeg}
            display={`${Math.abs(angleDeg).toFixed(0)}° ${Math.abs(angleDeg) < 0.5 ? 'straight' : angleDeg > 0 ? 'right →' : '← left'}`}
            min={-45}
            max={45}
            step={0.5}
            onChange={v => {
              setPreset(null);
              setShot(sh => ({ ...sh, theta: toRad(v) }));
            }}
          />
          <Slider
            label="Shot length"
            value={shot.L}
            display={`${shot.L.toFixed(0)} ft`}
            min={20}
            max={100}
            step={0.5}
            onChange={v => {
              setPreset(null);
              setShot(sh => ({ ...sh, L: v }));
            }}
          />
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-bold text-zinc-300">Direction error</p>
              <p className="text-[11px] text-zinc-500">how far off your aim the ball can leave</p>
            </div>
            <Segmented
              value={String(err)}
              onChange={v => setErr(Number(v) as ErrLevel)}
              options={[
                { v: '0', label: 'Off' },
                { v: '1', label: '±1°' },
                { v: '2', label: '±2°' },
                { v: '3', label: '±3°' },
                { v: '5', label: '±5°' },
              ]}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Toggle on={showTraj} onClick={() => setShowTraj(v => !v)} label={showTraj ? 'Trajectory on' : 'Trajectory hidden'} />
          <Toggle on={showRecover} onClick={() => setShowRecover(v => !v)} label="Recovery hint" />
          <Toggle on={showMoves} onClick={() => setShowMoves(v => !v)} label="Move arrows" />
          <Toggle on={showCompare} onClick={() => setShowCompare(v => !v)} label="Compare CC / DTL" />
          <button onClick={randomShot} className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-300 active:scale-95">
            🎲 Quiz shot
          </button>
          <button onClick={resetAll} className="rounded-full border border-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-400 active:scale-95">
            Reset
          </button>
        </div>
      </section>

      {/* ── Court ── */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-2">
        <svg
          ref={svgRef}
          viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
          className="w-full select-none"
          style={{ maxHeight: '78vh' }}
          onPointerMove={onMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <defs>
            <clipPath id={`in-${uid}`}>
              <rect x={l} y={g.s === 1 ? 0 : NET_Y} width={r - l} height={NET_Y} />
            </clipPath>
            <marker id={`arrow-${uid}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#e4e4e7" />
            </marker>
          </defs>

          {/* Surface + alleys */}
          <rect x={VB.x} y={VB.y} width={VB.w} height={VB.h} fill="#0b1f17" />
          <rect x={0} y={0} width={36} height={LEN} fill="#14532d" opacity={0.55} />
          {mode === 'singles' && (
            <>
              <rect x={0} y={0} width={4.5} height={LEN} fill="#09090b" opacity={0.45} />
              <rect x={31.5} y={0} width={4.5} height={LEN} fill="#09090b" opacity={0.45} />
            </>
          )}
          {/* Opponent in-bounds target area */}
          <rect x={l} y={g.s === 1 ? 0 : NET_Y} width={r - l} height={NET_Y} fill="#a3e635" opacity={0.05} />

          {/* Lines */}
          <g stroke="#d4d4d8" strokeWidth={0.22} fill="none">
            <rect x={0} y={0} width={36} height={LEN} strokeWidth={mode === 'doubles' ? 0.32 : 0.18} opacity={mode === 'doubles' ? 1 : 0.5} />
            <line x1={4.5} y1={0} x2={4.5} y2={LEN} strokeWidth={mode === 'singles' ? 0.32 : 0.18} />
            <line x1={31.5} y1={0} x2={31.5} y2={LEN} strokeWidth={mode === 'singles' ? 0.32 : 0.18} />
            {mode === 'singles' && (
              <>
                <line x1={4.5} y1={0} x2={31.5} y2={0} strokeWidth={0.32} />
                <line x1={4.5} y1={LEN} x2={31.5} y2={LEN} strokeWidth={0.32} />
              </>
            )}
            <line x1={4.5} y1={SVC} x2={31.5} y2={SVC} />
            <line x1={4.5} y1={LEN - SVC} x2={31.5} y2={LEN - SVC} />
            <line x1={CX} y1={SVC} x2={CX} y2={LEN - SVC} />
            <line x1={CX} y1={0} x2={CX} y2={0.8} />
            <line x1={CX} y1={LEN} x2={CX} y2={LEN - 0.8} />
          </g>

          {/* Net + posts/sticks */}
          <line x1={-3} y1={NET_Y} x2={39} y2={NET_Y} stroke="#f4f4f5" strokeWidth={0.45} />
          <circle cx={-3} cy={NET_Y} r={0.5} fill="#f4f4f5" />
          <circle cx={39} cy={NET_Y} r={0.5} fill="#f4f4f5" />
          {mode === 'singles' && (
            <>
              <circle cx={1.5} cy={NET_Y} r={0.4} fill="#fbbf24" />
              <circle cx={34.5} cy={NET_Y} r={0.4} fill="#fbbf24" />
            </>
          )}
          <text x={CX} y={NET_Y - 0.9} fontSize={1.5} fill="#a1a1aa" textAnchor="middle">3.0 ft</text>
          <text x={mode === 'singles' ? 1.5 : -3} y={NET_Y - 0.9} fontSize={1.3} fill="#71717a" textAnchor="middle">3.5</text>
          <text x={mode === 'singles' ? 34.5 : 39} y={NET_Y - 0.9} fontSize={1.3} fill="#71717a" textAnchor="middle">3.5</text>

          {/* Compare overlay: both preset shots from the current contact point */}
          {showTraj && showCompare && (
            <g>
              {([['cc', cmp.cc, '#c4b5fd', 'CC'], ['dtl', cmp.dtl, '#f9a8d4', 'DTL']] as const).map(([k, c, col, lab]) => {
                const end = along(ball, dirOf(c.theta, g.s), c.L);
                return (
                  <g key={k}>
                    <path d={sectorPath(ball, g.s, c.theta - c.band.delta, c.theta + c.band.delta, 0, c.L)} fill={col} opacity={0.1} />
                    <line x1={ball.x} y1={ball.y} x2={end.x} y2={end.y} stroke={col} strokeWidth={0.25} strokeDasharray="1 0.6" />
                    <circle cx={end.x} cy={end.y} r={0.5} fill={col} />
                    <text x={end.x} y={end.y + g.s * 2.6} fontSize={1.5} fill={col} textAnchor="middle" fontWeight="bold">{lab}</text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Error band (direction only): cone of paths + landing arc, green = in, red = out */}
          {showTraj && g.band && (
            <g>
              <path d={sectorPath(ball, g.s, shot.theta - g.band.delta, shot.theta + g.band.delta, 0, shot.L)} fill="#e4e4e7" opacity={0.1} />
              <path d={arcPath(ball, g.s, shot.theta - g.band.delta, shot.theta + g.band.delta, shot.L)} fill="none" stroke="#f87171" strokeWidth={0.9} strokeLinecap="round" />
              <path
                d={arcPath(ball, g.s, shot.theta - g.band.delta, shot.theta + g.band.delta, shot.L)}
                fill="none" stroke="#4ade80" strokeWidth={0.9}
                clipPath={`url(#in-${uid})`}
              />
            </g>
          )}

          {/* Recovery hint */}
          {showTraj && showRecover && g.recover && (
            <g>
              <line x1={g.T.x} y1={g.T.y} x2={g.c1.x} y2={g.c1.y} stroke="#38bdf8" strokeWidth={0.15} strokeDasharray="0.6 0.6" opacity={0.6} />
              <line x1={g.T.x} y1={g.T.y} x2={g.c2.x} y2={g.c2.y} stroke="#38bdf8" strokeWidth={0.15} strokeDasharray="0.6 0.6" opacity={0.6} />
              <line x1={g.T.x} y1={g.T.y} x2={g.recover.x} y2={g.recover.y} stroke="#38bdf8" strokeWidth={0.25} />
              <circle cx={g.recover.x} cy={g.recover.y} r={1.3} fill="none" stroke="#38bdf8" strokeWidth={0.3} />
              <text x={g.recover.x} y={g.recover.y + g.s * 3} fontSize={1.4} fill="#7dd3fc" textAnchor="middle" fontWeight="bold">
                Recover
              </text>
            </g>
          )}

          {/* Trajectory */}
          {showTraj && (
            <g>
              <line x1={g.T.x} y1={g.T.y} x2={extEnd.x} y2={extEnd.y} stroke={trajColor} strokeWidth={0.25} strokeDasharray="0.9 0.7" opacity={0.6} />
              <line x1={ball.x} y1={ball.y} x2={g.T.x} y2={g.T.y} stroke={trajColor} strokeWidth={0.4} />
              {g.exitPt && (
                <g stroke="#f87171" strokeWidth={0.35}>
                  <line x1={g.exitPt.x - 0.8} y1={g.exitPt.y - 0.8} x2={g.exitPt.x + 0.8} y2={g.exitPt.y + 0.8} />
                  <line x1={g.exitPt.x - 0.8} y1={g.exitPt.y + 0.8} x2={g.exitPt.x + 0.8} y2={g.exitPt.y - 0.8} />
                </g>
              )}
              {!g.aroundPost && (
                <g>
                  <circle cx={g.netPt.x} cy={g.netPt.y} r={0.6} fill="#09090b" stroke="#fafafa" strokeWidth={0.2} />
                  <rect x={g.netPt.x - 3} y={NET_Y + g.s * 1.3 - 1.1} width={6} height={2.1} rx={0.5} fill="#09090b" opacity={0.8} />
                  <text x={g.netPt.x} y={NET_Y + g.s * 1.3 + 0.5} fontSize={1.4} fill="#fafafa" textAnchor="middle" fontWeight="bold">
                    {g.netH.toFixed(2)} ft
                  </text>
                </g>
              )}
            </g>
          )}

          {/* Players */}
          {PLAYERS[mode].map(id => {
            const p = pos[id];
            const gp = ghost[id];
            const teamA = id.startsWith('A');
            const col = teamA ? '#38bdf8' : '#fbbf24';
            const moved = gp && Math.hypot(gp.x - p.x, gp.y - p.y) > 1.5;
            return (
              <g key={id}>
                {showMoves && gp && moved && (
                  <>
                    <circle cx={gp.x} cy={gp.y} r={1.5} fill="none" stroke={col} strokeWidth={0.15} strokeDasharray="0.4 0.4" opacity={0.6} />
                    <line
                      x1={gp.x} y1={gp.y}
                      x2={p.x - ((p.x - gp.x) / Math.hypot(p.x - gp.x, p.y - gp.y)) * 1.9}
                      y2={p.y - ((p.y - gp.y) / Math.hypot(p.x - gp.x, p.y - gp.y)) * 1.9}
                      stroke="#e4e4e7" strokeWidth={0.2} markerEnd={`url(#arrow-${uid})`} opacity={0.8}
                    />
                  </>
                )}
                <circle cx={p.x} cy={p.y} r={1.6} fill={col} stroke="#09090b" strokeWidth={0.25} />
                <text x={p.x} y={p.y + 0.55} fontSize={1.5} fill="#09090b" textAnchor="middle" fontWeight="900" pointerEvents="none">
                  {id}
                </text>
                <circle
                  cx={p.x} cy={p.y} r={3.2} fill="transparent"
                  style={{ cursor: 'grab', touchAction: 'none' }}
                  onPointerDown={startDrag(id)}
                />
              </g>
            );
          })}

          {/* Landing target */}
          {(
            <g>
              <circle cx={g.T.x} cy={g.T.y} r={1.1} fill="none" stroke={showTraj ? trajColor : '#e4e4e7'} strokeWidth={0.3} />
              <circle cx={g.T.x} cy={g.T.y} r={0.3} fill={showTraj ? trajColor : '#e4e4e7'} />
              <circle
                cx={g.T.x} cy={g.T.y} r={3.2} fill="transparent"
                style={{ cursor: 'grab', touchAction: 'none' }}
                onPointerDown={startDrag('target')}
              />
            </g>
          )}

          {/* Ball (contact point) */}
          <circle cx={ball.x} cy={ball.y} r={0.9} fill="#d9f99d" stroke="#365314" strokeWidth={0.2} />
          <circle
            cx={ball.x} cy={ball.y} r={3.2} fill="transparent"
            style={{ cursor: 'grab', touchAction: 'none' }}
            onPointerDown={startDrag('ball')}
          />
        </svg>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 pt-2 pb-1 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-lime-200" /> Ball</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-zinc-300" /> Landing spot</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> Hitting side</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Receiving side</span>
          <span className="flex items-center gap-1.5"><span className="text-red-400 font-black">✕</span> Goes out</span>
        </div>
      </section>

      {/* ── Readouts ── */}
      <section className="space-y-3">
        <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Shot Numbers</p>
        {showTraj ? (
          <div className="grid grid-cols-2 gap-2">
            <Stat
              label="Result"
              value={g.short ? 'NET' : g.landIn ? 'IN' : 'OUT'}
              tone={g.landIn ? 'good' : 'bad'}
              sub={
                g.short
                  ? 'Lands before the net'
                  : g.landIn
                    ? `${f1(g.room)} ft of room before the ${g.box.exitLine}`
                    : g.box.reaches && g.box.tOut > 0
                      ? `${f1(-g.room)} ft past the ${g.box.exitLine}`
                      : 'Never inside the lines'
              }
            />
            <Stat
              label="Net height at crossing"
              value={g.aroundPost ? '—' : `${g.netH.toFixed(2)} ft`}
              sub={g.aroundPost ? 'Passes outside the post' : `${f1(Math.abs(g.netPt.x - CX))} ft from center strap`}
            />
            <Stat
              label="Margin to sideline"
              value={`${f1(g.sideMargin)} ft`}
              tone={g.sideMargin < 0 ? 'bad' : undefined}
              sub={g.sideMargin < 0 ? 'Wide' : mode === 'doubles' ? 'Doubles sideline' : 'Singles sideline'}
            />
            <Stat
              label="Margin to baseline"
              value={`${f1(g.baseMargin)} ft`}
              tone={g.baseMargin < 0 ? 'bad' : undefined}
              sub={g.baseMargin < 0 ? 'Long' : 'Depth left before long'}
            />
            <Stat label="Shot length" value={`${f1(shot.L)} ft`} sub={`Angle ${Math.abs(angleDeg).toFixed(1)}° off straight`} />
            <Stat
              label="Distance to the out line"
              value={g.box.reaches && g.box.tOut > 0 ? `${f1(g.box.tOut)} ft` : '—'}
              sub="From contact, along the path"
            />
            {g.band && (
              <div className="col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
                <div className="flex items-baseline justify-between">
                  <p className="text-xs font-bold text-zinc-400">±{err}° direction error</p>
                  <p className={`text-lg font-black ${g.band.pctIn < 75 ? 'text-red-400' : g.band.pctIn < 95 ? 'text-amber-300' : 'text-lime-400'}`}>
                    {g.band.pctIn.toFixed(0)}% in
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Mini label="Side to side" value={`±${f1(g.band.lateral)} ft`} />
                  <Mini label="Out wide / long" value={`${g.band.pctWide.toFixed(0)}% / ${g.band.pctLong.toFixed(0)}%`} />
                  <Mini label="Net height" value={`${g.band.netLo.toFixed(2)}–${g.band.netHi.toFixed(2)}`} />
                </div>
                <p className="text-[11px] text-zinc-500">
                  Same length, direction anywhere within ±{err}° of your aim. Green arc = lands in, red = out.
                </p>
              </div>
            )}
          </div>
        ) : null}
        {showTraj && <CompareCard cmp={cmp} deg={cmpDeg} mode={mode} defaulted={!err} />}
        {!showTraj && (
          <button
            onClick={() => setShowTraj(true)}
            className="w-full rounded-2xl border border-dashed border-amber-400/30 bg-amber-400/[0.04] p-5 text-left space-y-1 active:scale-[0.99]"
          >
            <p className="text-sm font-black text-amber-300">Quiz mode</p>
            <p className="text-sm text-zinc-400">
              Before revealing: Is it in? How high is the net where it crosses? How much room before it goes out? Where should everyone move?
            </p>
            <p className="text-xs font-bold text-zinc-300 pt-1">Tap to reveal →</p>
          </button>
        )}
      </section>

      {/* ── Takeaways ── */}
      <section className="space-y-3">
        <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Why It Matters</p>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800 overflow-hidden">
          {[
            { t: 'Crosscourt = lower net + more court', d: 'Corner-to-corner is ~82.5 ft in singles vs 78 ft down the line, and it crosses near the 3 ft center strap.' },
            { t: 'Down the line = higher net + less court', d: 'It crosses near the posts (up to 3.5 ft) with 4.5 fewer feet of court. Change direction here with purpose.' },
            { t: 'Errors grow with distance', d: 'A 2° mis-hit is ~2.7 ft sideways over 78 ft — more on longer shots. Aim a few feet inside the lines.' },
            { t: 'Recover to the bisector', d: 'After you hit, move to the middle of your opponent’s possible replies — not the middle of the court.' },
          ].map(x => (
            <div key={x.t} className="px-4 py-3">
              <p className="text-sm font-bold text-zinc-100">{x.t}</p>
              <p className="text-sm text-zinc-400 mt-0.5">{x.d}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-zinc-500 px-1">
          Model: straight-line path seen from above, no spin or arc. Net sag treated as linear from 3.5 ft at the posts
          {mode === 'singles' ? ' (singles sticks)' : ''} to 3 ft at the center.
        </p>
      </section>
    </div>
  );
}

// ─── Crosscourt vs down the line ──────────────────────────────────────────────

function CompareCard({ cmp, deg, mode, defaulted }: { cmp: ReturnType<typeof compareShots>; deg: number; mode: Mode; defaulted: boolean }) {
  const { cc, dtl, extraDepthFt, extraDepthPct, widthGain } = cmp;
  const sign = (n: number, d = 1) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(d)}`;
  const rows: { label: string; cc: string; dtl: string }[] = [
    { label: 'Court to the baseline', cc: `${f1(cc.toBaseline)} ft`, dtl: `${f1(dtl.toBaseline)} ft` },
    { label: `Lands in (±${deg}°)`, cc: `${cc.band.pctIn.toFixed(0)}%`, dtl: `${dtl.band.pctIn.toFixed(0)}%` },
    { label: 'Net at crossing', cc: `${cc.netH.toFixed(2)} ft`, dtl: `${dtl.netH.toFixed(2)} ft` },
    { label: 'Angle off straight', cc: `${Math.abs(toDeg(cc.theta)).toFixed(1)}°`, dtl: `${Math.abs(toDeg(dtl.theta)).toFixed(1)}°` },
  ];
  return (
    <div className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.04] p-4 space-y-3">
      <div>
        <p className="text-sm font-black text-zinc-100">Crosscourt vs Down the line</p>
        <p className="text-[11px] text-zinc-500">
          From the ball’s current spot, each aimed 3 ft inside its corner ({mode}).
        </p>
      </div>

      <div className="rounded-xl bg-zinc-950/60 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300">Depth — the big one</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-black text-zinc-100 tabular-nums">{sign(extraDepthFt)} ft</p>
          <p className="text-sm font-bold text-violet-300 tabular-nums">{sign(extraDepthPct)}% more court</p>
        </div>
        <p className="text-[11px] text-zinc-400">
          Same length of ball: down the line leaves ~{f1(dtl.toBaseline - dtl.L)} ft to spare before the baseline, crosscourt leaves ~{f1(cc.toBaseline - dtl.L)} ft.
        </p>
      </div>
      <div className="rounded-xl bg-zinc-950/60 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-pink-300">Width</p>
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-black text-zinc-100 tabular-nums">{sign(widthGain, 0)}%</p>
          <p className="text-xs font-bold text-pink-300">chance of landing in with ±{deg}° error</p>
        </div>
        <p className="text-[11px] text-zinc-400">
          {Math.abs(widthGain) < 1
            ? `About even: both shots keep the same ${INSET} ft sideline cushion, so direction error pushes them out equally often.`
            : widthGain > 0
              ? 'Crosscourt keeps more balls inside the sideline from this spot.'
              : 'Down the line keeps more balls inside the sideline from this spot.'}
        </p>
      </div>

      <div className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 overflow-hidden text-sm">
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          <span />
          <span className="w-16 text-right text-violet-300">CC</span>
          <span className="w-16 text-right text-pink-300">DTL</span>
        </div>
        {rows.map(r => (
          <div key={r.label} className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2">
            <span className="text-zinc-400 text-xs">{r.label}</span>
            <span className="w-16 text-right font-bold text-zinc-100 tabular-nums text-xs">{r.cc}</span>
            <span className="w-16 text-right font-bold text-zinc-100 tabular-nums text-xs">{r.dtl}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-zinc-500">
        Depth is the extra court along the diagonal: room to hit harder or deeper before it goes long. It is biggest
        from a corner and shrinks to zero from the center mark.
        {defaulted ? ' (Using ±3° until you pick a direction error.)' : ''}
      </p>
    </div>
  );
}

// ─── Small UI pieces ──────────────────────────────────────────────────────────

function Segmented({
  value, onChange, options, compact,
}: { value: string; onChange: (v: string) => void; options: { v: string; label: string }[]; compact?: boolean }) {
  return (
    <div className={`flex rounded-xl border border-zinc-800 bg-zinc-900/60 p-1 ${compact ? '' : 'w-full'}`}>
      {options.map(o => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
            value === o.v ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Slider({
  label, value, display, min, max, step, onChange,
}: { label: string; value: number; display: string; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="block space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-bold text-zinc-300">{label}</span>
        <span className="text-xs font-bold text-lime-300 tabular-nums">{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={clamp(value, min, max)}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-lime-400"
      />
    </label>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors active:scale-95 ${
        on ? 'border-lime-400/40 bg-lime-400/10 text-lime-300' : 'border-zinc-800 text-zinc-500'
      }`}
    >
      {label}
    </button>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' }) {
  const color = tone === 'good' ? 'text-lime-400' : tone === 'bad' ? 'text-red-400' : 'text-zinc-100';
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3">
      <p className="text-[11px] font-bold text-zinc-500">{label}</p>
      <p className={`text-lg font-black tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-zinc-400 leading-snug">{sub}</p>}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-950/60 px-2 py-2">
      <p className="text-[10px] text-zinc-500">{label}</p>
      <p className="text-sm font-bold text-zinc-100 tabular-nums">{value}</p>
    </div>
  );
}
