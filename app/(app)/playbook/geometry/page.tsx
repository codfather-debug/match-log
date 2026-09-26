'use client';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Share2 } from 'lucide-react';
import {
  CX, LEN, MAX_ANGLE, NET_Y, PLAYERS, RALLY_PRESETS, SERVE_PRESETS, SIDES, SVC, INSET,
  analyze, along, clamp, compareShots, dirOf, dist, f1, hittingTeam, isDeuce, moveWords, play, presetShot,
  returnReady, serveSpot, targetZone, NET_REACH, shotTo, shotWords, sideSign, snapTargets, teamOf, toDeg, toRad,
  type Comparison, type Kind, type Mode, type PlayerId, type Preset, type Pt, type Reply,
} from './geometry';
import { Chips, Collapsible, SectionLabel, Segmented, Slider, Stat, Toggle } from './ui';

// ─── Shot Geometry ────────────────────────────────────────────────────────────
// Interactive top-down court. Simple view: where the shot goes, where to move, and the best reply.
// Advanced view adds the numbers: angles, margins, net height, error bands, comparisons.

type View = 'simple' | 'advanced';
type DragId = 'ball' | 'target' | PlayerId;
type Profile = { wide: number; long: number; net: number };
type QuizState = {
  inOut?: 'in' | 'out';
  net?: 0 | 1 | 2;
  recover?: Pt;
  revealed: boolean;
};

const VB = { x: -9, y: -10, w: 54, h: 98 };
const ERR_LEVELS = [0, 1, 2, 3, 5];
const NET_BUCKETS = ['Under 3.10', '3.10–3.25', 'Over 3.25'];
const netBucket = (h: number): 0 | 1 | 2 => (h < 3.1 ? 0 : h <= 3.25 ? 1 : 2);
const RECOVER_OK_FT = 3;

const C = {
  in: '#4ade80',
  out: '#f87171',
  reply: '#fbbf24',
  cmp: '#a78bfa',
  pos: '#38bdf8',
  recv: '#d4d4d8',
  ball: '#d9f99d',
};

const DEFAULT_POS: Record<PlayerId, Pt> = {
  A: { x: 24, y: 80.5 },
  B: { x: 18, y: -2 },
  A1: { x: 24, y: 80.5 },
  A2: { x: 11, y: 52 },
  B1: { x: 9, y: -1.5 },
  B2: { x: 25, y: 27 },
};
const DEFAULT_BALL: Pt = { x: 22, y: 79 };

const REPLY_WHY: Record<Reply['key'], string> = {
  cc: 'the most court and the lowest part of the net',
  mid: 'the safest ball from deep; it takes away the angles',
  dtl: 'it changes direction, but the net is higher and the court shorter',
  short: 'a short ball opens up the sharp angle',
  lob: 'the net player covers the low shots, so go over them',
};

const REPLY_NOUN: Record<Reply['key'], string> = {
  cc: 'the crosscourt',
  dtl: 'the line',
  mid: 'the middle',
  short: 'the short angle',
  lob: 'the lob',
};

const PROFILE_KEY = 'shot-geometry-profile';
const BEST_KEY = 'shot-geometry-quiz-best';
const VIEW_KEY = 'shot-geometry-view';
const store = {
  get(k: string) { try { return window.localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string | null) {
    try { if (v === null) window.localStorage.removeItem(k); else window.localStorage.setItem(k, v); } catch { /* storage unavailable */ }
  },
};

const num = (q: URLSearchParams, k: string) => {
  const v = q.get(k);
  const n = v === null ? NaN : Number(v);
  return Number.isFinite(n) ? n : null;
};

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

function arcPath(b: Pt, s: number, a0: number, a1: number, rad: number) {
  const n = 32;
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const p = along(b, dirOf(a0 + ((a1 - a0) * i) / n, s), rad);
    pts.push(`${p.x.toFixed(2)},${p.y.toFixed(2)}`);
  }
  return `M${pts.join('L')}`;
}

/** Point `back` ft short of `to` along from→to, so arrowheads don't sit under a marker. */
function shortOf(from: Pt, to: Pt, back: number): Pt {
  const d = dist(from, to);
  if (d <= back + 0.5) return to;
  return { x: to.x - ((to.x - from.x) / d) * back, y: to.y - ((to.y - from.y) / d) * back };
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
/** "move 4 ft to your left" — or "stay where you are" when there's nothing to do. */
const go = (verb: string, where: string) => (where === 'stay where you are' ? where : `${verb} ${where}`);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShotGeometryPage() {
  const uid = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement>(null);
  const lastSnap = useRef<string | null>(null);

  const [view, setView] = useState<View>('simple');
  const [kind, setKind] = useState<Kind>('rally');
  const [mode, setMode] = useState<Mode>('singles');
  const [ball, setBall] = useState<Pt>(DEFAULT_BALL);
  const [preset, setPreset] = useState<Preset | null>('cc');
  const [shot, setShot] = useState(() => shotTo(DEFAULT_BALL, presetShot('cc', DEFAULT_BALL, 'singles', 'rally').target));
  const [err, setErr] = useState(0);
  const [showSpots, setShowSpots] = useState(true);
  const [showCompare, setShowCompare] = useState(false);
  const [pos, setPos] = useState<Record<PlayerId, Pt>>(DEFAULT_POS);
  const [ghost, setGhost] = useState<Partial<Record<PlayerId, Pt>>>({});
  const [drag, setDrag] = useState<DragId | null>(null);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [score, setScore] = useState({ streak: 0, best: 0, rounds: 0, perfect: 0 });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // ── derived ──
  const simple = view === 'simple';
  const g = useMemo(() => analyze(ball, shot.theta, shot.L, mode, kind, err), [ball, shot, mode, kind, err]);
  const pl = useMemo(() => play(mode, kind, pos, ball, g), [mode, kind, pos, ball, g]);
  const cmpDeg = err || 3;
  const cmp = useMemo(
    () => (!simple && showCompare && kind === 'rally' ? compareShots(ball, mode, cmpDeg) : null),
    [simple, showCompare, kind, ball, mode, cmpDeg],
  );
  const ids = PLAYERS[mode];
  const quizAsk = !!quiz && !quiz.revealed;
  const showPlay = !quizAsk && (simple || showSpots || !!quiz?.revealed);

  const verdict: { word: string; good: boolean; why: string } = g.short
    ? { word: 'NET', good: false, why: 'lands before the net' }
    : g.landIn
      ? { word: 'IN', good: true, why: `${f1(g.room)} ft to spare before the ${g.box.exitLine}` }
      : {
          word: 'OUT',
          good: false,
          why: g.box.reaches && g.box.tOut > 0 ? `${f1(-g.room)} ft past the ${g.box.exitLine}` : 'never inside the lines',
        };
  const pathColor = verdict.good ? C.in : C.out;
  const blockedReplies = pl.replies.filter(r => r.blocked);
  const poachTarget = pl.replies.find(r => r.key !== 'lob');

  // ── URL + saved state: read once on load ──
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const k: Kind = q.get('k') === 'serve' ? 'serve' : 'rally';
    const m: Mode = q.get('m') === 'd' ? 'doubles' : 'singles';
    const bx = num(q, 'bx'), by = num(q, 'by'), a = num(q, 'a'), l = num(q, 'l'), e = num(q, 'e');
    const p = q.get('p') as Preset | null;
    const vw = q.get('view') ?? store.get(VIEW_KEY);
    /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from the URL */
    if (vw === 'advanced' || vw === 'simple') setView(vw);
    setKind(k);
    setMode(m);
    if (bx !== null && by !== null) {
      const b = { x: clamp(bx, VB.x + 1, VB.x + VB.w - 1), y: clamp(by, VB.y + 1, VB.y + VB.h - 1) };
      setBall(b);
      if (a !== null && l !== null) setShot({ theta: toRad(clamp(a, -MAX_ANGLE, MAX_ANGLE)), L: clamp(l, 10, 110) });
      setPreset(p && [...RALLY_PRESETS, ...SERVE_PRESETS].some(x => x.v === p) ? p : null);
    } else if (k === 'serve') {
      const b = serveSpot(1, true);
      setBall(b);
      setPreset('T');
      setShot(shotTo(b, presetShot('T', b, m, 'serve').target));
    }
    if (e !== null && ERR_LEVELS.includes(e)) setErr(e);

    const w = num(q, 'w'), lg = num(q, 'lg'), n = num(q, 'n');
    if (w !== null || lg !== null || n !== null) {
      const pr = { wide: w ?? 0, long: lg ?? 0, net: n ?? 0 };
      setProfile(pr);
      store.set(PROFILE_KEY, JSON.stringify(pr));
    } else {
      try {
        const saved = store.get(PROFILE_KEY);
        if (saved) setProfile(JSON.parse(saved));
      } catch { /* ignore a bad saved profile */ }
    }
    const best = Number(store.get(BEST_KEY)) || 0;
    setScore(sc => ({ ...sc, best }));
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // ── keep the URL in sync so the current setup can be shared ──
  useEffect(() => {
    if (!ready || drag) return;
    const t = setTimeout(() => {
      const q = new URLSearchParams();
      q.set('view', view);
      q.set('k', kind);
      q.set('m', mode === 'doubles' ? 'd' : 's');
      q.set('bx', f1(ball.x));
      q.set('by', f1(ball.y));
      q.set('a', f1(toDeg(shot.theta)));
      q.set('l', f1(shot.L));
      if (preset) q.set('p', preset);
      if (err) q.set('e', String(err));
      window.history.replaceState(window.history.state, '', `${window.location.pathname}?${q}`);
    }, 300);
    return () => clearTimeout(t);
  }, [ready, drag, view, kind, mode, ball, shot, preset, err]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── actions ──
  const switchView = (v: View) => {
    setView(v);
    store.set(VIEW_KEY, v);
  };

  const applyPreset = (p: Preset, b = ball, m = mode, k = kind) => {
    const { ball: nb, target } = presetShot(p, b, m, k);
    const sh = shotTo(nb, target);
    setBall(nb);
    setPreset(p);
    setShot(sh);
    return { nb, sh };
  };

  /** Serve formation: server at the ball, everyone else where they start the point. */
  const serveFormation = (nb: Pt, sh: { theta: number; L: number }, m: Mode) => {
    const list = PLAYERS[m];
    const s = sideSign(nb);
    const server = list
      .filter(id => teamOf(id) === hittingTeam(list, pos, nb))
      .reduce((a, c) => (dist(pos[c], nb) < dist(pos[a], nb) ? c : a));
    const next = { ...pos, [server]: { x: nb.x + (nb.x >= CX ? 1.2 : -1.2) * s, y: nb.y + s * 1.5 } };
    const pl2 = play(m, 'serve', next, nb, analyze(nb, sh.theta, sh.L, m, 'serve', 0));
    const spots = { ...pl2.spots, [pl2.receiver]: returnReady(targetZone(nb, m, 'serve'), s) };
    delete spots[server];
    setGhost({});
    setPos({ ...next, ...spots });
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setGhost({});
    if (preset) {
      const { nb, sh } = applyPreset(preset, ball, m);
      if (kind === 'serve') serveFormation(nb, sh, m);
    }
  };

  const switchKind = (k: Kind) => {
    if (k === kind) return;
    setKind(k);
    setGhost({});
    setShowCompare(false);
    const s = sideSign(ball);
    if (k === 'serve') {
      const { nb, sh } = applyPreset('T', serveSpot(s, true), mode, 'serve');
      serveFormation(nb, sh, mode);
    } else {
      applyPreset('cc', s === 1 ? DEFAULT_BALL : { x: CX * 2 - DEFAULT_BALL.x, y: LEN - DEFAULT_BALL.y }, mode, 'rally');
    }
  };

  const setServeSide = (deuce: boolean) => {
    const { nb, sh } = applyPreset(preset ?? 'T', serveSpot(sideSign(ball), deuce), mode, 'serve');
    serveFormation(nb, sh, mode);
  };

  /** Move everyone to where they should be for this shot. */
  const moveEveryone = () => {
    setGhost(Object.fromEntries(ids.map(id => [id, pos[id]])));
    setPos(ps => ({ ...ps, ...pl.spots }));
  };

  const resetAll = () => {
    setKind('rally');
    setBall(DEFAULT_BALL);
    setPos(DEFAULT_POS);
    setGhost({});
    setErr(0);
    applyPreset('cc', DEFAULT_BALL, mode, 'rally');
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Shot Geometry', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setToast('Link copied');
    } catch {
      /* share sheet dismissed */
    }
  };

  // ── quiz ──
  const newQuizShot = () => {
    const { l, r } = SIDES[mode];
    for (let tries = 0; tries < 20; tries++) {
      const bottom = Math.random() < 0.75;
      const b = { x: 3 + Math.random() * 30, y: bottom ? 76 + Math.random() * 7 : 2 - Math.random() * 7 };
      const s = sideSign(b);
      const farY = s === 1 ? 0 : LEN;
      const t = { x: l - 2.5 + Math.random() * (r - l + 5), y: farY + s * (-3 + Math.random() * 20) };
      const sh = shotTo(b, t);
      const test = analyze(b, sh.theta, sh.L, mode, 'rally', 0);
      if (test.aroundPost || test.short) continue;
      setBall(b);
      setPreset(null);
      setShot(sh);
      break;
    }
    setKind('rally');
    setGhost({});
    setShowCompare(false);
    setQuiz({ revealed: false });
  };

  const quizTruth = quiz
    ? {
        inOut: g.landIn ? 'in' : 'out',
        net: netBucket(g.netH),
        recoverMiss: quiz.recover ? dist(quiz.recover, pl.recover) : null,
      }
    : null;

  const reveal = () => {
    if (!quiz || !quizTruth) return;
    const right =
      Number(quiz.inOut === quizTruth.inOut) +
      Number(quiz.net === quizTruth.net) +
      Number(quizTruth.recoverMiss !== null && quizTruth.recoverMiss <= RECOVER_OK_FT);
    const perfect = right === 3;
    setScore(sc => {
      const streak = perfect ? sc.streak + 1 : 0;
      const best = Math.max(sc.best, streak);
      if (best !== sc.best) store.set(BEST_KEY, String(best));
      return { streak, best, rounds: sc.rounds + 1, perfect: sc.perfect + Number(perfect) };
    });
    setQuiz({ ...quiz, revealed: true });
  };

  // ── pointer handling ──
  const svgPoint = (e: { clientX: number; clientY: number }): Pt | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const q = p.matrixTransform(ctm.inverse());
    return { x: clamp(q.x, VB.x + 1, VB.x + VB.w - 1), y: clamp(q.y, VB.y + 1, VB.y + VB.h - 1) };
  };

  /** Grab whichever draggable is nearest the finger, so overlapping handles never grab the wrong thing. */
  const startDrag = (e: React.PointerEvent) => {
    if (quizAsk) return; // during a quiz, taps on the court set the recovery guess instead
    const p = svgPoint(e);
    if (!p) return;
    const cands: [DragId, Pt][] = [['ball', ball], ['target', g.T], ...ids.map(id => [id, pos[id]] as [DragId, Pt])];
    let best: DragId = cands[0][0];
    let bd = Infinity;
    for (const [id, q] of cands) {
      const d = dist(p, q);
      if (d < bd) { bd = d; best = id; }
    }
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDrag(best);
    lastSnap.current = null;
    if (best !== 'ball' && best !== 'target' && !ghost[best]) setGhost(gh => ({ ...gh, [best]: pos[best as PlayerId] }));
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = svgPoint(e);
    if (!p) return;
    if (drag === 'ball') {
      setBall(p);
      if (preset) {
        const pr: Preset = preset === 'io' ? 'cc' : preset === 'ii' ? 'dtl' : preset;
        setPreset(pr);
        setShot(shotTo(p, presetShot(pr, p, mode, kind).target));
      }
    } else if (drag === 'target') {
      let t = p;
      const snap = snapTargets(ball, mode, kind).find(s => dist(s, p) < 1.5);
      const key = snap ? `${snap.x.toFixed(1)},${snap.y.toFixed(1)}` : null;
      if (snap) t = snap;
      if (key && key !== lastSnap.current) navigator.vibrate?.(10);
      lastSnap.current = key;
      setPreset(null);
      setShot(shotTo(ball, t));
    } else {
      setPos(ps => ({ ...ps, [drag]: p }));
    }
  };

  const endDrag = () => setDrag(null);

  const onCourtClick = (e: React.MouseEvent) => {
    if (!quizAsk) return;
    const p = svgPoint(e);
    if (p) setQuiz(q => (q ? { ...q, recover: p } : q));
  };

  // ── drawing bits ──
  const angleDeg = toDeg(shot.theta);
  const extEnd = along(ball, g.d, 200);
  const dragRing = (p: Pt, id: DragId) =>
    drag === id ? <circle cx={p.x} cy={p.y} r={2.8} fill="none" stroke="#fafafa" strokeWidth={0.25} opacity={0.8} /> : null;
  const handle = (p: Pt) => (
    <circle cx={p.x} cy={p.y} r={2.6} fill="transparent" style={{ cursor: 'grab', touchAction: 'none' }} onPointerDown={startDrag} />
  );
  const zoneRect = { x: g.z.x0, y: g.z.y0, width: g.z.x1 - g.z.x0, height: g.z.y1 - g.z.y0 };
  const showLines = !quizAsk;
  const showNumbers = !simple && !quizAsk;
  const deuce = isDeuce(ball);
  const teamColor = (id: PlayerId) => (teamOf(id) === pl.hit ? C.pos : C.recv);
  const shownReplies = simple ? [pl.best] : pl.replies.filter(r => r.p >= 0.03);

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <Link href="/playbook" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100">
          <ArrowLeft className="h-4 w-4" /> Playbook
        </Link>
        <div className="flex items-center gap-2">
          {!quiz && (
            <button onClick={newQuizShot} className="rounded-full border border-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-300 active:scale-95">
              Quiz me
            </button>
          )}
          <button onClick={share} aria-label="Share this setup" className="rounded-full border border-zinc-800 p-2 text-zinc-300 active:scale-95">
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-zinc-100">Shot Geometry</h1>
          <Segmented
            className="w-44 shrink-0"
            value={view}
            onChange={v => switchView(v as View)}
            options={[{ v: 'simple', label: 'Simple' }, { v: 'advanced', label: 'Advanced' }]}
          />
        </div>
        {!quiz && (
          <div className="grid grid-cols-2 gap-2">
            <Segmented value={kind} onChange={v => switchKind(v as Kind)} options={[{ v: 'rally', label: 'Rally' }, { v: 'serve', label: 'Serve' }]} />
            <Segmented value={mode} onChange={v => switchMode(v as Mode)} options={[{ v: 'singles', label: 'Singles' }, { v: 'doubles', label: 'Doubles' }]} />
          </div>
        )}
      </div>

      {/* ── One-line verdict ── */}
      {!quizAsk && (
        <div className="flex items-baseline gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2">
          <span className={`text-base font-black ${verdict.good ? 'text-green-400' : 'text-red-400'}`}>{verdict.word}</span>
          <span className="text-xs text-zinc-300 leading-snug">
            {verdict.why}
            {!simple && !g.aroundPost && ` · net ${g.netH.toFixed(2)} ft`}
            {!simple && g.band && ` · ${g.band.pctIn.toFixed(0)}% in at ±${err}°`}
          </span>
        </div>
      )}
      {quizAsk && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-300">
          The aim line runs to the net. The ball travels <span className="font-bold text-zinc-100">{shot.L.toFixed(0)} ft</span> in total.
        </div>
      )}

      {/* ── Court ── */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-2">
        <svg
          ref={svgRef}
          viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
          className="mx-auto block w-full select-none"
          style={{ maxHeight: '62vh' }}
          onPointerMove={onMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClick={onCourtClick}
        >
          <defs>
            <clipPath id={`in-${uid}`}>
              <rect {...zoneRect} />
            </clipPath>
            {(['w', 'r', 'p'] as const).map(k => (
              <marker
                key={k}
                id={`arrow-${k}-${uid}`}
                viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"
              >
                <path d="M0,0 L10,5 L0,10 z" fill={k === 'w' ? '#e4e4e7' : k === 'r' ? C.reply : C.pos} />
              </marker>
            ))}
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
          <rect {...zoneRect} fill={C.in} opacity={0.06} />

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
              <circle cx={1.5} cy={NET_Y} r={0.4} fill="#a1a1aa" />
              <circle cx={34.5} cy={NET_Y} r={0.4} fill="#a1a1aa" />
            </>
          )}
          {!simple && (
            <>
              <text x={CX} y={NET_Y - 0.9} fontSize={1.5} fill="#a1a1aa" textAnchor="middle">3.0 ft</text>
              <text x={mode === 'singles' ? 1.5 : -3} y={NET_Y - 0.9} fontSize={1.3} fill="#71717a" textAnchor="middle">3.5</text>
              <text x={mode === 'singles' ? 34.5 : 39} y={NET_Y - 0.9} fontSize={1.3} fill="#71717a" textAnchor="middle">3.5</text>
            </>
          )}

          {/* Compare overlay: crosscourt solid, down the line dashed */}
          {showNumbers && cmp && (
            <g>
              {([['cc', cmp.cc, 'CC', undefined], ['dtl', cmp.dtl, 'DTL', '1 0.6']] as const).map(([k, c, lab, dash]) => {
                const end = along(ball, dirOf(c.theta, g.s), c.L);
                return (
                  <g key={k}>
                    <path d={sectorPath(ball, g.s, c.theta - c.band.delta, c.theta + c.band.delta, 0, c.L)} fill={C.cmp} opacity={0.1} />
                    <line x1={ball.x} y1={ball.y} x2={end.x} y2={end.y} stroke={C.cmp} strokeWidth={0.25} strokeDasharray={dash} />
                    <circle cx={end.x} cy={end.y} r={0.5} fill={C.cmp} />
                    <text x={end.x} y={end.y + g.s * 2.6} fontSize={1.5} fill={C.cmp} textAnchor="middle" fontWeight="bold">{lab}</text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Error band: cone of paths + landing arc, green = in, red = out */}
          {showNumbers && g.band && (
            <g>
              <path d={sectorPath(ball, g.s, shot.theta - g.band.delta, shot.theta + g.band.delta, 0, shot.L)} fill="#e4e4e7" opacity={0.1} />
              <path d={arcPath(ball, g.s, shot.theta - g.band.delta, shot.theta + g.band.delta, shot.L)} fill="none" stroke={C.out} strokeWidth={0.9} strokeLinecap="round" />
              <path
                d={arcPath(ball, g.s, shot.theta - g.band.delta, shot.theta + g.band.delta, shot.L)}
                fill="none" stroke={C.in} strokeWidth={0.9}
                clipPath={`url(#in-${uid})`}
              />
            </g>
          )}

          {/* Trajectory */}
          {showLines && (
            <g>
              {!simple && (
                <line x1={g.T.x} y1={g.T.y} x2={extEnd.x} y2={extEnd.y} stroke={pathColor} strokeWidth={0.25} strokeDasharray="0.9 0.7" opacity={0.5} />
              )}
              {/* after the bounce, the ball carries on to where the receiver meets it */}
              {showPlay && g.landIn && (
                <line x1={g.T.x} y1={g.T.y} x2={pl.H.x} y2={pl.H.y} stroke={pathColor} strokeWidth={0.25} strokeDasharray="0.6 0.5" opacity={0.7} />
              )}
              <line x1={ball.x} y1={ball.y} x2={g.T.x} y2={g.T.y} stroke={pathColor} strokeWidth={0.4} />
              {!simple && g.exitPt && !g.landIn && (
                <g stroke={C.out} strokeWidth={0.35}>
                  <line x1={g.exitPt.x - 0.8} y1={g.exitPt.y - 0.8} x2={g.exitPt.x + 0.8} y2={g.exitPt.y + 0.8} />
                  <line x1={g.exitPt.x - 0.8} y1={g.exitPt.y + 0.8} x2={g.exitPt.x + 0.8} y2={g.exitPt.y - 0.8} />
                </g>
              )}
              {!simple && !g.aroundPost && (
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

          {/* Quiz: aim line only as far as the net */}
          {quizAsk && (
            <line x1={ball.x} y1={ball.y} x2={g.netPt.x} y2={g.netPt.y} stroke="#e4e4e7" strokeWidth={0.3} strokeDasharray="1 0.6" markerEnd={`url(#arrow-w-${uid})`} />
          )}

          {/* The play: likely replies, where everyone goes, poach */}
          {showPlay && g.landIn && (
            <g pointerEvents="none">
              {shownReplies.map(rp => {
                const top = rp === pl.best;
                const end = shortOf(rp.from, rp.to, 0.6);
                return (
                  <g key={rp.key}>
                    <line
                      x1={rp.from.x} y1={rp.from.y} x2={end.x} y2={end.y}
                      stroke={C.reply}
                      strokeWidth={top ? 0.45 : 0.2}
                      strokeDasharray={rp.blocked ? '0.5 0.5' : undefined}
                      opacity={top ? 0.95 : 0.25 + rp.p}
                      markerEnd={top ? `url(#arrow-r-${uid})` : undefined}
                    />
                    {!simple && (
                      <text x={rp.to.x} y={rp.to.y + g.s * 2.2} fontSize={1.3} fill={C.reply} textAnchor="middle" fontWeight="bold" opacity={top ? 1 : 0.75}>
                        {Math.round(rp.p * 100)}%{rp.blocked ? ' ✕' : ''}
                      </text>
                    )}
                  </g>
                );
              })}
              {simple && (
                <text x={pl.best.to.x} y={pl.best.to.y + g.s * 2.4} fontSize={1.4} fill={C.reply} textAnchor="middle" fontWeight="bold">
                  shot back
                </text>
              )}

              {ids.map(id => {
                const sp = pl.spots[id];
                if (!sp) return null;
                const col = teamColor(id);
                const from = pos[id];
                const far = dist(from, sp) > 2.5;
                return (
                  <g key={`spot-${id}`}>
                    {far && (
                      <line
                        x1={from.x} y1={from.y}
                        {...(() => { const e = shortOf(from, sp, 1.9); return { x2: e.x, y2: e.y }; })()}
                        stroke={id === pl.receiver ? '#e4e4e7' : col}
                        strokeWidth={id === pl.receiver ? 0.3 : 0.18}
                        strokeDasharray="0.6 0.45"
                        markerEnd={`url(#arrow-${id === pl.receiver ? 'w' : 'p'}-${uid})`}
                        opacity={0.85}
                      />
                    )}
                    <circle cx={sp.x} cy={sp.y} r={1.6} fill="none" stroke={col} strokeWidth={0.22} strokeDasharray="0.5 0.35" />
                    <text x={sp.x} y={sp.y + 0.5} fontSize={1.3} fill={col} textAnchor="middle" fontWeight="bold">{id}</text>
                  </g>
                );
              })}

              {pl.poach && pl.hitterPartner && (
                <g>
                  <line
                    x1={pos[pl.hitterPartner].x} y1={pos[pl.hitterPartner].y}
                    {...(() => { const e = shortOf(pos[pl.hitterPartner!], pl.poach!, 1.2); return { x2: e.x, y2: e.y }; })()}
                    stroke={C.pos} strokeWidth={0.3} markerEnd={`url(#arrow-p-${uid})`}
                  />
                  <circle cx={pl.poach.x} cy={pl.poach.y} r={1} fill={C.pos} opacity={0.35} />
                  <text x={pl.poach.x} y={pl.poach.y + g.s * 2.4} fontSize={1.3} fill={C.pos} textAnchor="middle" fontWeight="bold">
                    poach
                  </text>
                </g>
              )}
              {quiz?.revealed && <circle cx={pl.recover.x} cy={pl.recover.y} r={RECOVER_OK_FT} fill={C.pos} opacity={0.12} />}
            </g>
          )}

          {/* Players */}
          {ids.map(id => {
            const p = pos[id];
            const gp = ghost[id];
            const col = teamColor(id);
            const d = gp ? dist(gp, p) : 0;
            return (
              <g key={id}>
                {gp && d > 1.5 && (
                  <>
                    <circle cx={gp.x} cy={gp.y} r={1.5} fill="none" stroke={col} strokeWidth={0.15} strokeDasharray="0.4 0.4" opacity={0.6} />
                    <line
                      x1={gp.x} y1={gp.y}
                      x2={p.x - ((p.x - gp.x) / d) * 1.9}
                      y2={p.y - ((p.y - gp.y) / d) * 1.9}
                      stroke="#e4e4e7" strokeWidth={0.2} markerEnd={`url(#arrow-w-${uid})`} opacity={0.6}
                    />
                  </>
                )}
                {dragRing(p, id)}
                <circle cx={p.x} cy={p.y} r={1.6} fill={col} stroke="#09090b" strokeWidth={0.25} />
                <text x={p.x} y={p.y + 0.55} fontSize={1.5} fill="#09090b" textAnchor="middle" fontWeight="900" pointerEvents="none">
                  {id}
                </text>
                {handle(p)}
              </g>
            );
          })}

          {/* Landing target */}
          {showLines && (
            <g>
              {dragRing(g.T, 'target')}
              <circle cx={g.T.x} cy={g.T.y} r={1.1} fill="none" stroke={pathColor} strokeWidth={0.3} />
              <circle cx={g.T.x} cy={g.T.y} r={0.3} fill={pathColor} />
              {handle(g.T)}
            </g>
          )}

          {/* Quiz: recovery guess */}
          {quiz?.recover && (
            <g pointerEvents="none">
              <line x1={quiz.recover.x - 1} y1={quiz.recover.y - 1} x2={quiz.recover.x + 1} y2={quiz.recover.y + 1} stroke="#fafafa" strokeWidth={0.35} />
              <line x1={quiz.recover.x - 1} y1={quiz.recover.y + 1} x2={quiz.recover.x + 1} y2={quiz.recover.y - 1} stroke="#fafafa" strokeWidth={0.35} />
            </g>
          )}

          {/* Ball (contact point) */}
          {dragRing(ball, 'ball')}
          <circle cx={ball.x} cy={ball.y} r={0.9} fill={C.ball} stroke="#365314" strokeWidth={0.2} />
          {!quizAsk && handle(ball)}
        </svg>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 pt-2 pb-1 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> Hitting team</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-zinc-300" /> Receiving team</span>
          {showPlay && (
            <>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-amber-400" /> Shot back</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-dashed border-zinc-300" /> Where to be</span>
            </>
          )}
          {toast && <span className="ml-auto font-bold text-zinc-200">{toast}</span>}
        </div>
      </section>

      {quiz ? (
        <QuizPanel
          quiz={quiz}
          truth={quizTruth!}
          netH={g.netH}
          verdictWhy={verdict.why}
          canReveal={!!quiz.inOut && quiz.net !== undefined && !!quiz.recover}
          score={score}
          onAnswer={a => setQuiz(q => (q ? { ...q, ...a } : q))}
          onReveal={reveal}
          onNext={newQuizShot}
          onExit={() => setQuiz(null)}
        />
      ) : (
        <>
          {/* ── Shot picker ── */}
          <section className="space-y-3">
            {kind === 'rally' ? (
              <Chips value={preset} onChange={v => applyPreset(v as Preset)} options={RALLY_PRESETS} />
            ) : (
              <div className="flex gap-2">
                <Segmented
                  className="w-36 shrink-0"
                  value={deuce ? 'deuce' : 'ad'}
                  onChange={v => setServeSide(v === 'deuce')}
                  options={[{ v: 'deuce', label: 'Deuce' }, { v: 'ad', label: 'Ad' }]}
                />
                <Segmented className="flex-1" value={preset ?? ''} onChange={v => applyPreset(v as Preset)} options={SERVE_PRESETS} />
              </div>
            )}
            {!simple && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
                <Slider
                  label="Aim"
                  value={angleDeg}
                  display={`${Math.abs(angleDeg).toFixed(0)}° ${Math.abs(angleDeg) < 0.5 ? 'straight' : angleDeg > 0 ? 'right →' : '← left'}`}
                  min={-MAX_ANGLE}
                  max={MAX_ANGLE}
                  step={0.5}
                  onChange={v => {
                    setPreset(null);
                    setShot(sh => ({ ...sh, theta: toRad(v) }));
                  }}
                />
                <Slider
                  label="Length"
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
              </div>
            )}
          </section>

          {/* ── The point, in plain words ── */}
          {(simple || showSpots) && (
            <PlayCard
              verdictGood={verdict.good}
              verdictWhy={verdict.why}
              shotText={`${pl.hitter} hits ${shotWords(ball, g, kind)}`}
              receiver={pl.receiver}
              moveText={moveWords(pos[pl.receiver], pl.H)}
              best={pl.best}
              blocked={blockedReplies}
              hitterPartner={pl.hitterPartner}
              hitter={pl.hitter}
              recoverText={moveWords(pos[pl.hitter], pl.recover)}
              partnerText={pl.hitterPartner && pl.spots[pl.hitterPartner] ? moveWords(pos[pl.hitterPartner], pl.spots[pl.hitterPartner]!) : null}
              poachText={pl.hitterPartner && pl.poach ? moveWords(pos[pl.hitterPartner], pl.poach) : null}
              poachLabel={poachTarget?.label.toLowerCase() ?? ''}
              receiverPartner={pl.receiverPartner}
              receiverPartnerText={pl.receiverPartner && pl.spots[pl.receiverPartner] ? moveWords(pos[pl.receiverPartner], pl.spots[pl.receiverPartner]!) : null}
              serve={kind === 'serve'}
              onMoveEveryone={moveEveryone}
            />
          )}

          {!simple && (
            <>
              {/* ── Settings ── */}
              <Collapsible title="Settings" hint="error, positions, compare">
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs font-bold text-zinc-300">Direction error</p>
                    <p className="text-[11px] text-zinc-500">how far off your aim the ball can leave</p>
                  </div>
                  <Segmented
                    value={String(err)}
                    onChange={v => setErr(Number(v))}
                    options={ERR_LEVELS.map(e => ({ v: String(e), label: e ? `±${e}°` : 'Off' }))}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Toggle on={showSpots} onClick={() => setShowSpots(v => !v)} label="Where to be" />
                  {kind === 'rally' && <Toggle on={showCompare} onClick={() => setShowCompare(v => !v)} label="Compare CC / DTL" />}
                  <button onClick={resetAll} className="rounded-full border border-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-400 active:scale-95">
                    Reset
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Drag the ball, the landing spot, or any player. The landing spot snaps to the standard targets.
                  {!profile && ' Tip: in Match Log, open Stats → UErrors → “Practice these misses” to load your own miss pattern.'}
                </p>
              </Collapsible>

              {showSpots && g.landIn && <RepliesCard replies={pl.replies} doubles={mode === 'doubles'} />}

              {cmp && <CompareCard cmp={cmp} deg={cmpDeg} mode={mode} defaulted={!err} />}

              {profile && (
                <ProfileCard
                  profile={profile}
                  onApply={deg => setErr(deg)}
                  onClear={() => {
                    setProfile(null);
                    store.set(PROFILE_KEY, null);
                  }}
                />
              )}

              {/* ── Details ── */}
              <Collapsible title="Details" hint="margins, distances, error band">
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Result" value={verdict.word} tone={verdict.good ? 'good' : 'bad'} sub={verdict.why} />
                  <Stat
                    label="Net height at crossing"
                    value={g.aroundPost ? '—' : `${g.netH.toFixed(2)} ft`}
                    sub={g.aroundPost ? 'Passes outside the post' : `${f1(Math.abs(g.netPt.x - CX))} ft from center strap`}
                  />
                  <Stat
                    label="Margin to sideline"
                    value={`${f1(g.sideMargin)} ft`}
                    tone={g.sideMargin < 0 ? 'bad' : undefined}
                    sub={g.sideMargin < 0 ? 'Wide' : kind === 'serve' ? 'Service box' : mode === 'doubles' ? 'Doubles sideline' : 'Singles sideline'}
                  />
                  <Stat
                    label={kind === 'serve' ? 'Margin to service line' : 'Margin to baseline'}
                    value={`${f1(g.baseMargin)} ft`}
                    tone={g.baseMargin < 0 ? 'bad' : undefined}
                    sub={g.baseMargin < 0 ? 'Long' : 'Depth left before long'}
                  />
                  <Stat label="Shot length" value={`${f1(shot.L)} ft`} sub={`${Math.abs(angleDeg).toFixed(1)}° off straight`} />
                  <Stat
                    label="Distance to the out line"
                    value={g.box.reaches && g.box.tOut > 0 ? `${f1(g.box.tOut)} ft` : '—'}
                    sub="From contact, along the path"
                  />
                </div>
                {g.band ? (
                  <div className="rounded-xl bg-zinc-950/60 p-3 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <p className="text-xs font-bold text-zinc-400">±{err}° direction error</p>
                      <p className={`text-base font-black ${g.band.pctIn < 75 ? 'text-red-400' : g.band.pctIn < 95 ? 'text-zinc-100' : 'text-green-400'}`}>
                        {g.band.pctIn.toFixed(0)}% in
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <Mini label="Side to side" value={`±${f1(g.band.lateral)} ft`} />
                      <Mini label="Out wide / long" value={`${g.band.pctWide.toFixed(0)}% / ${g.band.pctLong.toFixed(0)}%`} />
                      <Mini label="Net height" value={`${g.band.netLo.toFixed(2)}–${g.band.netHi.toFixed(2)}`} />
                    </div>
                    <p className="text-[11px] text-zinc-500">Same length, direction anywhere within ±{err}° of your aim. Green arc = lands in, red = out.</p>
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-500">Turn on a direction error in Settings to see how often this shot stays in.</p>
                )}
              </Collapsible>
            </>
          )}
        </>
      )}

      {/* ── Takeaways ── */}
      <section className="space-y-3">
        <SectionLabel>Why It Matters</SectionLabel>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800 overflow-hidden">
          {[
            { t: 'Crosscourt = lower net + more court', d: 'Corner-to-corner is ~82.5 ft in singles vs 78 ft down the line, and it crosses near the 3 ft center strap.' },
            { t: 'Down the line = higher net + less court', d: 'It crosses near the posts (up to 3.5 ft) with 4.5 fewer feet of court. Change direction here with purpose.' },
            { t: 'Recover toward their likely reply', d: 'After you hit, don’t go back to the middle — go to where their most likely shot will come.' },
            { t: 'In doubles, play away from the net player', d: 'Keep the ball out of the net player’s reach: crosscourt, through the middle, or over their head.' },
            ...(simple ? [] : [{ t: 'Errors grow with distance', d: 'A 2° mis-hit is ~2.7 ft sideways over 78 ft — more on longer shots. Aim a few feet inside the lines.' }]),
          ].map(x => (
            <div key={x.t} className="px-4 py-3">
              <p className="text-sm font-bold text-zinc-100">{x.t}</p>
              <p className="text-sm text-zinc-400 mt-0.5">{x.d}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-zinc-500 px-1">
          {simple
            ? 'Assumes right-handed players and typical choices; real points vary.'
            : `Model: from above, the ball travels in a straight line. Net sag is treated as linear from 3.5 ft at the posts${
                mode === 'singles' ? ' (singles sticks)' : ''
              } to 3 ft at the center. Reply odds are rough rules of thumb: crosscourt by default, fewer lines when pulled wide, fewer angles from deep, and a net player can reach about ${NET_REACH} ft to either side without poaching. Inside-out/in assume a right-hander.`}
        </p>
      </section>
    </div>
  );
}

// ─── The point, in plain words ────────────────────────────────────────────────

function Step({ n, title, color, children }: { n: number; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-zinc-900 ${color}`}>{n}</span>
      <div className="space-y-0.5">
        <p className="text-sm font-bold text-zinc-100">{title}</p>
        <div className="text-sm text-zinc-400 leading-snug">{children}</div>
      </div>
    </div>
  );
}

function PlayCard({
  verdictGood, verdictWhy, shotText, receiver, moveText, best, blocked, hitter, recoverText,
  hitterPartner, partnerText, poachText, poachLabel, receiverPartner, receiverPartnerText, serve, onMoveEveryone,
}: {
  verdictGood: boolean;
  verdictWhy: string;
  shotText: string;
  receiver: PlayerId;
  moveText: string;
  best: Reply;
  blocked: Reply[];
  hitter: PlayerId;
  recoverText: string;
  hitterPartner: PlayerId | null;
  partnerText: string | null;
  poachText: string | null;
  poachLabel: string;
  receiverPartner: PlayerId | null;
  receiverPartnerText: string | null;
  serve: boolean;
  onMoveEveryone: () => void;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800 overflow-hidden">
      <Step n={1} title="Where the shot goes" color={verdictGood ? 'bg-green-400' : 'bg-red-400'}>
        {cap(shotText)}. {verdictGood ? `It lands in, ${verdictWhy}.` : `It’s out: ${verdictWhy}.`}
      </Step>
      {verdictGood && (
        <>
          <Step n={2} title={`${receiver}: move to hit it`} color="bg-zinc-100">
            {cap(go('Move', moveText))} {serve ? '— return from just behind the baseline' : 'to meet the ball a few feet past the bounce'}.
            {receiverPartner && receiverPartnerText && (
              <> {receiverPartner}: {go('move', receiverPartnerText)} {serve ? 'on the service line' : 'to cover the middle at the net'}.</>
            )}
          </Step>
          <Step n={3} title={`Best shot back: ${best.label.toLowerCase()}`} color="bg-amber-400">
            {cap(REPLY_WHY[best.key])}.
            {blocked.length > 0 && hitterPartner && (
              <> Avoid {hitterPartner} at the net — they can reach {blocked.map(b => REPLY_NOUN[b.key]).join(' and ')}.</>
            )}
          </Step>
          <Step n={4} title={`${hitter}${hitterPartner ? ` & ${hitterPartner}` : ''}: get ready for it`} color="bg-sky-400">
            {hitter}: {go('recover', recoverText)}, ready for the {best.label.toLowerCase()}.
            {hitterPartner && partnerText && (
              <>
                {' '}{hitterPartner}: {go('move', partnerText)} to guard the line
                {poachText && poachLabel && <> — or poach: go {poachText} to cut off the {poachLabel}</>}.
              </>
            )}
          </Step>
          <div className="px-4 py-3">
            <button onClick={onMoveEveryone} className="w-full rounded-xl border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-200 active:scale-[0.98]">
              Move everyone into place
            </button>
          </div>
        </>
      )}
    </section>
  );
}

// ─── Likely replies (advanced) ────────────────────────────────────────────────

function RepliesCard({ replies, doubles }: { replies: Reply[]; doubles: boolean }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-black text-zinc-100">Likely replies</p>
        <p className="text-[11px] text-zinc-500">rough odds from the receiver’s spot</p>
      </div>
      {replies.map(r => (
        <div key={r.key} className="flex items-center gap-2">
          <span className="w-28 text-xs text-zinc-300">{r.label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-amber-400" style={{ width: `${r.p * 100}%` }} />
          </div>
          <span className="w-9 text-right text-xs font-bold tabular-nums text-zinc-200">{Math.round(r.p * 100)}%</span>
        </div>
      ))}
      {doubles && replies.some(r => r.blocked) && (
        <p className="text-[11px] text-zinc-500">✕ on court = within the net player’s reach, so much less likely.</p>
      )}
      <p className="text-[11px] text-zinc-500">The hitter’s recovery spot is weighted by these odds.</p>
    </section>
  );
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

function QuizPanel({
  quiz, truth, netH, verdictWhy, canReveal, score, onAnswer, onReveal, onNext, onExit,
}: {
  quiz: QuizState;
  truth: { inOut: string; net: 0 | 1 | 2; recoverMiss: number | null };
  netH: number;
  verdictWhy: string;
  canReveal: boolean;
  score: { streak: number; best: number; rounds: number; perfect: number };
  onAnswer: (a: Partial<QuizState>) => void;
  onReveal: () => void;
  onNext: () => void;
  onExit: () => void;
}) {
  const r = quiz.revealed;
  const mark = (ok: boolean) => (
    <span className={`text-xs font-black ${ok ? 'text-green-400' : 'text-red-400'}`}>{ok ? '✓' : '✗'}</span>
  );
  const recoverOk = truth.recoverMiss !== null && truth.recoverMiss <= RECOVER_OK_FT;
  const choice = (active: boolean, correct: boolean) =>
    `flex-1 rounded-lg px-2 py-2 text-xs font-bold transition-colors ${
      r && correct ? 'bg-green-400/20 text-green-300 ring-1 ring-green-400/50'
        : active ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-950/60 text-zinc-400'
    }`;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-black text-zinc-100">Quiz</p>
        <p className="text-[11px] text-zinc-500 tabular-nums">
          Streak {score.streak} · Best {score.best}
          {score.rounds > 0 && ` · ${score.perfect}/${score.rounds} perfect`}
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-zinc-300">1. In or out?</p>
          {r && mark(quiz.inOut === truth.inOut)}
        </div>
        <div className="flex gap-2">
          {(['in', 'out'] as const).map(v => (
            <button key={v} disabled={r} onClick={() => onAnswer({ inOut: v })} className={choice(quiz.inOut === v, truth.inOut === v)}>
              {v === 'in' ? 'In' : 'Out'}
            </button>
          ))}
        </div>
        {r && <p className="text-[11px] text-zinc-400">{truth.inOut === 'in' ? 'In' : 'Out'}: {verdictWhy}.</p>}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-zinc-300">2. Net height where it crosses?</p>
          {r && mark(quiz.net === truth.net)}
        </div>
        <div className="flex gap-2">
          {NET_BUCKETS.map((label, i) => (
            <button key={label} disabled={r} onClick={() => onAnswer({ net: i as 0 | 1 | 2 })} className={choice(quiz.net === i, truth.net === i)}>
              {label}
            </button>
          ))}
        </div>
        {r && <p className="text-[11px] text-zinc-400">It crosses at {netH.toFixed(2)} ft.</p>}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-zinc-300">3. Tap the court where the hitter should recover</p>
          {r ? mark(recoverOk) : quiz.recover && <span className="text-xs font-black text-zinc-300">✓</span>}
        </div>
        {r && truth.recoverMiss !== null && (
          <p className="text-[11px] text-zinc-400">
            Your spot is {f1(truth.recoverMiss)} ft from the recovery point (blue circle, within {RECOVER_OK_FT} ft counts).
          </p>
        )}
      </div>

      <div className="flex gap-2">
        {r ? (
          <button onClick={onNext} className="flex-1 rounded-xl bg-zinc-100 px-3 py-2.5 text-sm font-black text-zinc-900 active:scale-[0.98]">
            Next shot
          </button>
        ) : (
          <button
            onClick={onReveal}
            disabled={!canReveal}
            className="flex-1 rounded-xl bg-zinc-100 px-3 py-2.5 text-sm font-black text-zinc-900 disabled:opacity-30 active:scale-[0.98]"
          >
            Reveal
          </button>
        )}
        <button onClick={onExit} className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm font-bold text-zinc-400 active:scale-[0.98]">
          Done
        </button>
      </div>
    </section>
  );
}

// ─── Your misses (from Match Log stats) ───────────────────────────────────────

function ProfileCard({
  profile, onApply, onClear,
}: { profile: Profile; onApply: (deg: number) => void; onClear: () => void }) {
  const total = profile.wide + profile.long + profile.net;
  const share = (n: number) => (total ? n / total : 0);
  const rows = [
    { k: 'Wide', v: profile.wide },
    { k: 'Long', v: profile.long },
    { k: 'Net', v: profile.net },
  ];
  const top = [...rows].sort((a, b) => b.v - a.v)[0];
  const wideShare = share(profile.wide);
  const deg = wideShare >= 0.45 ? 3 : wideShare >= 0.25 ? 2 : 1;
  const tip =
    top.k === 'Wide'
      ? `Most misses go wide: aim ${INSET + 1}–${INSET + 2} ft inside the sidelines and lean on crosscourt, which has the most room.`
      : top.k === 'Long'
        ? 'Most misses go long: aim 5–6 ft inside the baseline, or add topspin so the ball dips in.'
        : 'Most misses hit the net: aim higher over the net and hit through the middle, where the net is lowest (3 ft).';

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-black text-zinc-100">Your misses</p>
        <p className="text-[11px] text-zinc-500">{total} unforced errors from Match Log</p>
      </div>
      {total < 5 ? (
        <p className="text-xs text-zinc-400">Not enough logged errors yet. Log a few more matches with error direction to get a read.</p>
      ) : (
        <>
          <div className="space-y-1.5">
            {rows.map(x => (
              <div key={x.k} className="flex items-center gap-2">
                <span className="w-10 text-xs text-zinc-400">{x.k}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full rounded-full bg-sky-400" style={{ width: `${share(x.v) * 100}%` }} />
                </div>
                <span className="w-9 text-right text-xs font-bold tabular-nums text-zinc-200">{Math.round(share(x.v) * 100)}%</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-300">{tip}</p>
          <p className="text-[11px] text-zinc-500">
            Suggested starting point: ±{deg}° direction error. It’s a rough guide from
            where your misses go, not a measurement of your swing.
          </p>
        </>
      )}
      <div className="flex gap-2">
        {total >= 5 && (
          <button onClick={() => onApply(deg)} className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-900 active:scale-95">
            Use my numbers
          </button>
        )}
        <button onClick={onClear} className="rounded-full border border-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-400 active:scale-95">
          Clear
        </button>
      </div>
    </section>
  );
}

// ─── Crosscourt vs down the line ──────────────────────────────────────────────

function CompareCard({ cmp, deg, mode, defaulted }: { cmp: Comparison; deg: number; mode: Mode; defaulted: boolean }) {
  const { cc, dtl, extraDepthFt, extraDepthPct, widthGain } = cmp;
  const sign = (n: number, d = 1) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(d)}`;
  const rows: { label: string; cc: string; dtl: string }[] = [
    { label: 'Court to the baseline', cc: `${f1(cc.toBaseline)} ft`, dtl: `${f1(dtl.toBaseline)} ft` },
    { label: `Lands in (±${deg}°)`, cc: `${cc.band.pctIn.toFixed(0)}%`, dtl: `${dtl.band.pctIn.toFixed(0)}%` },
    { label: 'Net at crossing', cc: `${cc.netH.toFixed(2)} ft`, dtl: `${dtl.netH.toFixed(2)} ft` },
    { label: 'Angle off straight', cc: `${Math.abs(toDeg(cc.theta)).toFixed(1)}°`, dtl: `${Math.abs(toDeg(dtl.theta)).toFixed(1)}°` },
  ];
  return (
    <section className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.04] p-4 space-y-3">
      <div>
        <p className="text-sm font-black text-zinc-100">Crosscourt vs Down the line</p>
        <p className="text-[11px] text-zinc-500">
          From the ball’s current spot, each aimed {INSET} ft inside its corner ({mode}). On court: CC solid, DTL dashed.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-zinc-950/60 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300">Depth</p>
          <p className="text-xl font-black text-zinc-100 tabular-nums">{sign(extraDepthFt)} ft</p>
          <p className="text-[11px] text-zinc-400">{sign(extraDepthPct)}% more court crosscourt</p>
        </div>
        <div className="rounded-xl bg-zinc-950/60 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300">Width</p>
          <p className="text-xl font-black text-zinc-100 tabular-nums">{sign(widthGain, 0)}%</p>
          <p className="text-[11px] text-zinc-400">
            {Math.abs(widthGain) < 1 ? 'About even with the same cushion' : widthGain > 0 ? 'More crosscourt balls land in' : 'More down-the-line balls land in'}
          </p>
        </div>
      </div>

      <div className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 overflow-hidden text-sm">
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          <span />
          <span className="w-16 text-right">CC</span>
          <span className="w-16 text-right">DTL</span>
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
        Depth is the extra court along the diagonal: room to hit harder or deeper before it goes long. It is biggest from a
        corner and shrinks to zero from the center mark.
        {defaulted ? ` (Using ±${deg}° until you pick a direction error.)` : ''}
      </p>
    </section>
  );
}

function Mini({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="rounded-xl bg-zinc-950/60 px-2 py-2">
      <p className="text-[10px] text-zinc-500">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${bad ? 'text-red-400' : 'text-zinc-100'}`}>{value}</p>
    </div>
  );
}
