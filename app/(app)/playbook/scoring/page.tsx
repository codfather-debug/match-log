'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// ─── Data ────────────────────────────────────────────────────────────────────

const FORMATS = [
  {
    id: 'ad',
    title: 'Ad Scoring',
    icon: '🎾',
    color: 'border-lime-400/20 bg-lime-400/[0.03]',
    badge: 'text-lime-400',
    summary: 'Standard tennis scoring used in most matches.',
    rules: [
      'Points are scored as: Love (0), 15, 30, 40, Game.',
      'When both players reach 40, the score is Deuce.',
      'After deuce, the server wins the next point → Ad-In; receiver wins it → Ad-Out.',
      'The player with the Ad must win the next point to win the game.',
      'If the Ad player loses the point, the score returns to Deuce.',
      'There is no limit to the number of Deuces in a single game.',
    ],
  },
  {
    id: 'noad',
    title: 'No-Ad Scoring',
    icon: '⏱️',
    color: 'border-lime-400/20 bg-lime-400/[0.03]',
    badge: 'text-lime-400',
    summary: 'Same as ad scoring, but 40–40 is decided by one point.',
    rules: [
      'Points are scored the same way: Love (0), 15, 30, 40, Game.',
      'When both players reach 40, the next point wins the game — no Ad.',
      'That point is called the deciding point (announce "40–all, deciding point").',
      'The receiver chooses which side (Deuce or Ad court) to receive the deciding point from.',
      'In doubles, the receiving team chooses which player returns the deciding point.',
      'Games are shorter and every 40–all is a must-win point for both players.',
    ],
  },
  {
    id: 'proset',
    title: 'Pro-Set',
    icon: '⚡',
    color: 'border-amber-400/20 bg-amber-400/[0.03]',
    badge: 'text-amber-400',
    summary: 'One extended set played to 8 games. Common in HS tennis.',
    rules: [
      'The winner must reach 8 games to win the set.',
      'If the score reaches 8–8, a 7-point tiebreaker is played.',
      'Common in freshman and JV tennis, and varsity doubles during the regular season.',
      'No second set — the match is decided in one pro-set.',
      'Tiebreak rules are identical to those used at 6–6 in a regular set.',
    ],
  },
  {
    id: 'tiebreak7',
    title: '7-Point Tiebreaker',
    icon: '🔥',
    color: 'border-sky-400/20 bg-sky-400/[0.03]',
    badge: 'text-sky-400',
    summary: 'Used at 6–6 in a regular set (or 8–8 in a pro-set).',
    rules: [
      'First to 7 points wins, must win by 2.',
      'The player whose turn it is to serve starts the tiebreak (1 point from the right court).',
      'After the first point, players alternate serving in groups of 2.',
      'Players change ends after every 6 total points.',
      'If the score reaches 6–6, change ends and keep serving in sequence until one player leads by 2.',
      'The set is recorded as 7–6.',
      'After the tiebreak the team who received the first point in the tiebreaker is now the first to serve in the next set.',
    ],
  },
  {
    id: 'super',
    title: 'Super Tiebreaker (10-Point)',
    icon: '🏆',
    color: 'border-red-400/20 bg-red-400/[0.03]',
    badge: 'text-red-400',
    summary: 'Played in lieu of a full third set. First to 10 points, win by 2.',
    rules: [
      'First to 10 points wins, must win by 2.',
      'Same serving rotation as a 7-point tiebreaker.',
      'Change ends when the total point score equals a multiple of 6 (e.g. 3–3, 0–6, 7–5, 6–6…).',
      'Doubles partners preserve their serving sequence throughout.',
      'You may change doubles service order for 10-point tiebreakers.',
    ],
  },
];

const TIEBREAK_SERVING = {
  singles: [
    { pts: '1',     server: 'A', court: 'Deuce' },
    { pts: '2–3',   server: 'B', court: 'Ad → Deuce' },
    { pts: '4–5',   server: 'A', court: 'Ad → Deuce' },
    { pts: '6',     server: 'B', court: 'Ad' },
    { pts: '—',     server: '',  court: 'Change ends' },
    { pts: '7',     server: 'B', court: 'Deuce' },
    { pts: '8–9',   server: 'A', court: 'Ad → Deuce' },
    { pts: '10–11', server: 'B', court: 'Ad → Deuce' },
    { pts: '12',    server: 'A', court: 'Ad' },
  ],
  doubles: [
    { pts: '1',     server: 'A', court: 'Deuce' },
    { pts: '2–3',   server: 'C', court: 'Ad → Deuce' },
    { pts: '4–5',   server: 'B', court: 'Ad → Deuce' },
    { pts: '6',     server: 'D', court: 'Ad' },
    { pts: '—',     server: '',  court: 'Change ends' },
    { pts: '7',     server: 'D', court: 'Deuce' },
    { pts: '8–9',   server: 'A', court: 'Ad → Deuce' },
    { pts: '10–11', server: 'C', court: 'Ad → Deuce' },
    { pts: '12',    server: 'B', court: 'Ad' },
  ],
};

const SCORE_QUICK = [
  { situation: 'Both at 40',                        call: 'Deuce' },
  { situation: 'Server wins point after Deuce',     call: 'Ad-In' },
  { situation: 'Receiver wins point after Deuce',   call: 'Ad-Out' },
  { situation: 'Ad player loses next point',        call: 'Back to Deuce' },
  { situation: '40–40 in No-Ad',                    call: 'Deciding Point' },
  { situation: '6–6 in regular set',                call: '7-pt Tiebreak' },
  { situation: '8–8 in pro-set',                    call: '7-pt Tiebreak' },
  { situation: 'Tied in sets (most formats)',        call: 'Super Tiebreak' },
];

// Practice games — score is always called with the SERVER'S score first.
type PracticePoint = { winner: 'S' | 'R'; call: string; note: string };

const PRACTICE: Record<'ad' | 'noad', { intro: string; points: PracticePoint[] }> = {
  ad: {
    intro: 'Watch the score go to Deuce twice. Nobody wins until they win 2 points in a row from Deuce.',
    points: [
      { winner: 'S', call: '15–Love',     note: 'Server wins the first point. "Love" means zero.' },
      { winner: 'R', call: '15–All',      note: 'Tied at 15. "All" means the score is tied.' },
      { winner: 'S', call: '30–15',       note: 'Server\'s score is always said first.' },
      { winner: 'R', call: '30–All',      note: 'Tied again at 30.' },
      { winner: 'S', call: '40–30',       note: 'Server is one point away from the game (game point).' },
      { winner: 'R', call: 'Deuce',       note: 'Both at 40 = Deuce. With ad scoring, you must now win by 2.' },
      { winner: 'R', call: 'Ad-Out',      note: 'Receiver wins after Deuce → the Ad goes to the receiver ("Ad-Out").' },
      { winner: 'S', call: 'Deuce',       note: 'The Ad player lost the point, so it goes back to Deuce.' },
      { winner: 'S', call: 'Ad-In',       note: 'Server wins after Deuce → "Ad-In." One more point wins it.' },
      { winner: 'S', call: 'Game Server', note: 'Server won 2 points in a row from Deuce. Game over!' },
    ],
  },
  noad: {
    intro: 'Same counting — but at 40–all, ONE point decides the game. The receiver picks the side.',
    points: [
      { winner: 'R', call: 'Love–15',       note: 'Receiver wins the first point. Server\'s score (Love) is said first.' },
      { winner: 'S', call: '15–All',        note: 'Tied at 15.' },
      { winner: 'S', call: '30–15',         note: 'Server leads.' },
      { winner: 'R', call: '30–All',        note: 'Tied at 30.' },
      { winner: 'R', call: '30–40',         note: 'Receiver has break point — one point from winning the game.' },
      { winner: 'S', call: '40–All',        note: 'Deciding point! No Deuce/Ad. Receiver chooses Deuce or Ad court.' },
      { winner: 'R', call: 'Game Receiver', note: 'Receiver wins the deciding point → game. (In ad scoring this would only be Ad-Out.)' },
    ],
  },
};

function PracticeGame() {
  const [mode, setMode] = useState<'ad' | 'noad'>('ad');
  const [step, setStep] = useState(0);
  const [quiz, setQuiz] = useState(false);
  const [revealed, setRevealed] = useState(true);
  const game = PRACTICE[mode];
  const played = game.points.slice(0, step);
  const current = step > 0 ? game.points[step - 1] : null;
  const done = step === game.points.length;
  const accent = mode === 'ad' ? 'text-lime-400' : 'text-amber-400';
  const hidden = quiz && !revealed;

  function next() {
    if (done) return;
    setStep(s => s + 1);
    setRevealed(!quiz);
  }
  function back() {
    setStep(s => Math.max(0, s - 1));
    setRevealed(true);
  }
  function reset(m: 'ad' | 'noad' = mode) {
    setMode(m);
    setStep(0);
    setRevealed(true);
  }

  return (
    <section className="space-y-3">
      <div>
        <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Practice Game</p>
        <p className="text-xs text-zinc-500 mt-0.5">Tap through a game point by point</p>
      </div>

      <div className="flex gap-2 p-1 rounded-2xl bg-zinc-900/50 border border-zinc-800">
        {([['ad', 'Ad Scoring'], ['noad', 'No-Ad']] as const).map(([m, label]) => (
          <button key={m} onClick={() => reset(m)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${mode === m ? (m === 'ad' ? 'bg-lime-400 text-black shadow' : 'bg-amber-400 text-black shadow') : 'text-zinc-400 hover:text-zinc-200'}`}>
            {label}
          </button>
        ))}
      </div>

      <p className="text-xs text-zinc-400 px-1">{game.intro}</p>

      {/* Scoreboard */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-center space-y-2">
        <p className="text-[10px] font-black tracking-widest uppercase text-zinc-500">
          {step === 0 ? 'Ready' : `Point ${step} of ${game.points.length}`}
        </p>
        {current ? (
          <>
            <p className="text-sm text-zinc-300">
              <span className={`font-black ${current.winner === 'S' ? 'text-sky-400' : 'text-red-400'}`}>
                {current.winner === 'S' ? 'Server' : 'Receiver'}
              </span>{' '}wins the point
            </p>
            {hidden ? (
              <button onClick={() => setRevealed(true)}
                className="mx-auto block rounded-xl border border-dashed border-zinc-600 px-4 py-2 text-sm font-bold text-zinc-300 hover:border-zinc-400">
                What&apos;s the score? Tap to check
              </button>
            ) : (
              <>
                <p className={`text-3xl font-black ${accent}`}>{current.call}</p>
                <p className="text-xs text-zinc-400">{current.note}</p>
              </>
            )}
          </>
        ) : (
          <>
            <p className={`text-3xl font-black ${accent}`}>Love–All</p>
            <p className="text-xs text-zinc-400">New game. Server&apos;s score is always called first.</p>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button onClick={back} disabled={step === 0}
          className="flex-1 py-2.5 rounded-xl border border-zinc-800 text-sm font-bold text-zinc-300 disabled:opacity-30">
          ← Back
        </button>
        {done ? (
          <button onClick={() => reset()}
            className="flex-[2] py-2.5 rounded-xl bg-zinc-100 text-black text-sm font-black">
            Play again
          </button>
        ) : (
          <button onClick={next}
            className="flex-[2] py-2.5 rounded-xl bg-zinc-100 text-black text-sm font-black">
            Next point →
          </button>
        )}
      </div>
      <label className="flex items-center justify-center gap-2 text-xs text-zinc-400">
        <input type="checkbox" checked={quiz} onChange={e => { setQuiz(e.target.checked); setRevealed(true); }}
          className="accent-lime-400" />
        Quiz me — hide the score until I guess
      </label>

      {/* Point log */}
      {played.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="grid grid-cols-[3rem_1fr_1fr] border-b border-zinc-800">
            <div className="px-3 py-2 text-[10px] font-black text-zinc-400 uppercase tracking-wider">Pt</div>
            <div className="px-3 py-2 text-[10px] font-black text-zinc-400 uppercase tracking-wider">Won by</div>
            <div className="px-3 py-2 text-[10px] font-black text-zinc-400 uppercase tracking-wider">Score</div>
          </div>
          {played.map((p, i) => {
            const isLast = i === played.length - 1;
            return (
              <div key={i} className={`grid grid-cols-[3rem_1fr_1fr] border-b border-zinc-800 last:border-b-0 ${i % 2 ? 'bg-zinc-900/50' : ''}`}>
                <div className="px-3 py-2 text-sm font-bold text-zinc-500">{i + 1}</div>
                <div className={`px-3 py-2 text-sm font-bold ${p.winner === 'S' ? 'text-sky-400' : 'text-red-400'}`}>
                  {p.winner === 'S' ? 'Server' : 'Receiver'}
                </div>
                <div className="px-3 py-2 text-sm font-black text-zinc-100">{isLast && hidden ? '?' : p.call}</div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─── Components ──────────────────────────────────────────────────────────────

function FormatCard({ f }: { f: typeof FORMATS[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-2xl border transition-all ${open ? f.color : 'border-zinc-800 bg-zinc-900/50'}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl flex-shrink-0">{f.icon}</span>
          <div>
            <span className={`text-sm font-bold ${open ? f.badge : 'text-zinc-100'}`}>{f.title}</span>
            {!open && <p className="text-xs text-zinc-400 mt-0.5">{f.summary}</p>}
          </div>
        </div>
        <svg
          className={`text-zinc-400 transition-transform flex-shrink-0 ml-2 ${open ? 'rotate-90' : ''}`}
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
      {open && (
        <ul className="px-4 pb-4 space-y-2 border-t border-zinc-800 pt-3">
          {f.rules.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
              <span className={`mt-0.5 flex-shrink-0 font-black ${f.badge}`}>›</span>
              {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScoringPlaybookPage() {
  const [tbView, setTbView] = useState<'singles' | 'doubles'>('singles');

  return (
    <div className="space-y-6 pb-6">

      <Link href="/playbook" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 mb-2">
        <ArrowLeft className="h-4 w-4" /> Playbook
      </Link>

      <div className="space-y-7">

        {/* Quick reference */}
        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Quick Reference</p>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800 overflow-hidden">
            {SCORE_QUICK.map(s => (
              <div key={s.situation} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-zinc-400">{s.situation}</p>
                <span className="text-sm font-black text-zinc-100 ml-2">{s.call}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Practice game */}
        <PracticeGame />

        {/* Format cards */}
        <section className="space-y-3">
          <div>
            <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Match Formats</p>
            <p className="text-xs text-zinc-500 mt-0.5">Tap to expand</p>
          </div>
          <div className="space-y-2">
            {FORMATS.map(f => <FormatCard key={f.id} f={f} />)}
          </div>
        </section>

        {/* Tiebreak serving order */}
        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Tiebreak Serving Order</p>
          {/* Toggle */}
          <div className="flex gap-2 p-1 rounded-2xl bg-zinc-900/50 border border-zinc-800">
            {(['singles', 'doubles'] as const).map(t => (
              <button key={t} onClick={() => setTbView(t)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold capitalize transition-all ${tbView === t ? 'bg-sky-400 text-black shadow' : 'text-zinc-400 hover:text-zinc-200'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="grid grid-cols-3 border-b border-zinc-800">
              <div className="px-3 py-2 text-[10px] font-black text-zinc-400 uppercase tracking-wider">Points</div>
              <div className="px-3 py-2 text-[10px] font-black text-zinc-400 uppercase tracking-wider">Server</div>
              <div className="px-3 py-2 text-[10px] font-black text-zinc-400 uppercase tracking-wider">Court</div>
            </div>
            {tieBreakRows(tbView).map((row, i) => (
              row.server === '' ? (
                <div key={i} className="col-span-3 px-3 py-1.5 bg-zinc-900/50 border-y border-zinc-800">
                  <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest text-center">↔ Change Ends</p>
                </div>
              ) : (
                <div key={i} className={`grid grid-cols-3 border-b border-zinc-800 ${i % 2 === 0 ? '' : 'bg-zinc-900/50'}`}>
                  <div className="px-3 py-2.5 text-sm font-bold text-zinc-300">{row.pts}</div>
                  <div className="px-3 py-2.5 text-sm font-black text-sky-400">{row.server}</div>
                  <div className="px-3 py-2.5 text-xs text-zinc-400">{row.court}</div>
                </div>
              )
            ))}
          </div>
          {tbView === 'doubles' && (
            <p className="text-xs text-zinc-500 text-center px-2">Team (A & B) vs (C & D). Assumes D served game 12.</p>
          )}
        </section>

      </div>
    </div>
  );
}

function tieBreakRows(view: 'singles' | 'doubles') {
  return TIEBREAK_SERVING[view];
}

