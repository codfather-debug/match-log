'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { KeyPoints, LevelBadge } from '../KeyPoints';

// ─── Data ────────────────────────────────────────────────────────────────────

const STRATEGIES = [
  {
    n: 1,
    title: 'Out-Rally the Opponent',
    summary: 'Win by keeping the ball in play until your opponent misses.',
    points: [
      'Hit at a pace you can control — consistency over power.',
      'Pick large targets; hit high over the net and away from the lines.',
      'Favor cross-court: longer hitting area, lower part of net.',
      'Be ready to run down every ball.',
    ],
    best_against: 'Aggressive baseliners who make unforced errors under pressure.',
  },
  {
    n: 2,
    title: 'Play Aggressively',
    summary: 'Force your opponent onto the back foot from the very first shot.',
    points: [
      'Start every point with an aggressive serve or return.',
      'Step inside the court — catch the ball early and on the rise.',
      'Drive through the ball; push your opponent behind the baseline.',
      'Continue attacking until they hit a quality defensive shot.',
    ],
    best_against: 'Players who struggle when they can\'t set up from the baseline.',
  },
  {
    n: 3,
    title: 'Play Your Strengths',
    summary: 'Hit your best shot as often as possible.',
    points: [
      'If your forehand is stronger, run around your backhand to hit it.',
      'If you\'re a net player, look for every opportunity to get forward.',
      'Build the point around your most reliable weapon.',
      'Opponents have to adjust to your game — not the other way around.',
    ],
    best_against: 'Any opponent — this is your default game plan.',
  },
  {
    n: 4,
    title: 'Attack the Opponent\'s Weakness',
    summary: 'Make your opponent hit their weaker shot on every ball.',
    points: [
      'Play relentlessly to the weakness — don\'t stop until it breaks.',
      'Don\'t be fooled by the open court: they\'d rather run to their strength.',
      'Identify weakness early in warm-up (forehand, backhand, high balls, low balls).',
      'Mix in variety to the weakness to prevent adjustment.',
    ],
    best_against: 'Players with a clear, exploitable weakness on one side.',
  },
  {
    n: 5,
    title: 'Attack the Net',
    summary: 'Put pressure on opponents by coming forward and finishing at the net.',
    points: [
      'Approach on short balls — step in and redirect to opponent\'s weakness.',
      'Prefer down-the-line or through the middle as approach options.',
      'Serve-and-volley or return-and-volley when momentum is in your favor.',
      'Just charging the net often forces a mistake — volleys aren\'t always necessary.',
    ],
    best_against: 'Consistent opponents and players with a weak passing shot.',
  },
  {
    n: 6,
    title: 'Bring the Opponent to the Net',
    summary: 'Pull reluctant net players forward with drop shots and short balls.',
    points: [
      'Play consistently until you get a short ball to counter.',
      'Hit with slice for a lower, harder-to-handle short ball.',
      'Once they\'re at the net, pass them or lob over them.',
      'Use the lob liberally to take time away and change the pace.',
    ],
    best_against: 'Consistent baseliners who rarely miss but avoid the net.',
  },
  {
    n: 7,
    title: 'Use Variety to Create Errors',
    summary: 'Force your opponent to constantly adjust by mixing every variable.',
    points: [
      'Spin: topspin → slice → flat',
      'Depth: push deep, then drop short',
      'Height: high, medium, low over the net',
      'Direction: wide, middle, body',
      'Speed: fast → slow → fast',
    ],
    best_against: 'Robots — players who thrive on repetition and rhythm.',
  },
  {
    n: 8,
    title: 'Open the Court',
    summary: 'Use angles to move your opponent wide, then hit to the open space.',
    points: [
      'Hit deep and consistently until the opponent gives you a short, wide ball.',
      'Angle it back wider to pull them completely off the court.',
      'Step forward and take the next ball early — hit to the open court.',
      'The player who moves more, loses. Make them run.',
    ],
    best_against: 'Slow-moving players and those who struggle to recover after wide balls.',
  },
];

const PATTERNS = [
  {
    title: 'The 2-1',
    icon: '🎯',
    steps: [
      { shot: 'Shot 1', detail: 'Deep down the middle — push your opponent behind the baseline.' },
      { shot: 'Shot 2', detail: 'Wide to D — pull them off the court, opening the far side.' },
      { shot: 'Shot 3', detail: 'To A — the unspectacular winner into the open court.' },
    ],
    note: 'This is your default point-building pattern.',
  },
  {
    title: 'The Backhand Cage',
    icon: '🛡️',
    steps: [
      { shot: 'Step 1', detail: 'Use your forehand (sword) to attack their backhand (shield).' },
      { shot: 'Step 2', detail: 'Make them hit 4 backhands in a row — no relief.' },
      { shot: 'Step 3', detail: 'Wait for the short ball and put it away.' },
    ],
    note: 'Counter: if opponent uses this on you, hit backhand down the line without giving up position.',
  },
  {
    title: 'Serve + 1 Forehand',
    icon: '⚡',
    steps: [
      { shot: 'Serve', detail: 'Out wide or into the body to create an angle.' },
      { shot: '+ 1', detail: 'If the reply is short or to your forehand side, step in and hit your forehand to the open court.' },
      { shot: 'Tip', detail: 'Attack the Deuce or Ad side twice in a row — removes opponent\'s anticipation.' },
    ],
    note: 'Only when your serve is reliable. A serve that goes in beats a big serve that misses.',
  },
];

const ZONES = [
  {
    label: 'Kill Zone',
    sublabel: 'Around the service line',
    color: 'bg-lime-100 border-lime-400/30 text-lime-700',
    dot: 'bg-lime-400',
    tip: 'Finish the point. All attacking-zone rules apply. Look to volley or put away.',
  },
  {
    label: 'Attack Zone',
    sublabel: 'Inside the baseline',
    color: 'bg-amber-400/15 border-amber-400/30 text-amber-400',
    dot: 'bg-amber-400',
    tip: 'Court has shortened — keep the ball within 3 ft over the net. Don\'t let it sail long.',
  },
  {
    label: 'Neutral Zone',
    sublabel: 'Behind baseline, comfortable',
    color: 'bg-sky-400/15 border-sky-400/30 text-sky-400',
    dot: 'bg-sky-400',
    tip: 'Focus on depth. Hit 3–6 ft over the net with topspin to push opponent back.',
  },
  {
    label: 'Defend Zone',
    sublabel: '6+ feet behind the baseline',
    color: 'bg-red-400/10 border-red-500/30 text-red-400',
    dot: 'bg-red-400',
    tip: 'Hit at least 6 ft over the net. Prioritize consistency, depth, and recovery time.',
  },
];

const SERVE_GOALS = [
  { label: '1st Serve In', target: '60%+' },
  { label: '2nd Serve In', target: '90%+' },
  { label: 'Double Faults per Set', target: '2 or fewer' },
  { label: 'Returns in Play', target: '8 of 10' },
];

// Which strategies to learn first
const STRATEGY_LEVEL: Record<number, '3.0' | '3.5'> = { 1: '3.0', 2: '3.5', 3: '3.0', 4: '3.0', 5: '3.5', 6: '3.5', 7: '3.5', 8: '3.5' };

// ─── Components ──────────────────────────────────────────────────────────────

function StrategyCard({ s }: { s: typeof STRATEGIES[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-2xl border transition-all ${open ? 'border-lime-400/20 bg-lime-400/[0.04]' : 'border-zinc-800 bg-zinc-900/50'}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-3">
          <span className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center ${open ? 'bg-lime-400 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
            {s.n}
          </span>
          <span className="text-sm font-bold text-zinc-100">{s.title}</span>
          <LevelBadge level={STRATEGY_LEVEL[s.n] ?? '3.5'} />
        </div>
        <svg
          className={`text-zinc-400 transition-transform flex-shrink-0 ml-2 ${open ? 'rotate-90' : ''}`}
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-zinc-800 pt-3">
          <p className="text-sm text-zinc-400 italic">{s.summary}</p>
          <ul className="space-y-1.5">
            {s.points.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-lime-400 mt-0.5 flex-shrink-0">›</span>
                {p}
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-500 pt-1">
            <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">Best against — </span>
            {s.best_against}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SinglesPlaybookPage() {
  return (
    <div className="space-y-6 pb-6">

      <Link href="/playbook" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 mb-2">
        <ArrowLeft className="h-4 w-4" /> Playbook
      </Link>

      <KeyPoints
        points={[
          'Most points at your level end on a mistake — make one more ball than your opponent.',
          'Hit high (3–6 ft over the net), deep, and mostly cross-court.',
          'Attack short balls only. On everything else, keep it in play.',
        ]}
        level30='Learn Out-Rally, Play Your Strengths, and Attack the Weakness. Get your 1st serve in.'
        level35='Add the patterns (The 2-1, Backhand Cage, Serve + 1) and come to the net on short balls.'
      />


      <div className="px-0 space-y-7">

        {/* How points are won at your level */}
        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">How Points Are Won at Your Level</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { big: '❌', label: 'Most points end on a mistake', color: 'text-zinc-300' },
              { big: '5+', label: 'Make 5 in a row and you usually win the point', color: 'text-lime-400' },
              { big: '⬆️', label: 'High & deep beats hard & low', color: 'text-amber-400' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-3 text-center">
                <p className={`text-2xl font-black ${s.color}`}>{s.big}</p>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-1 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-3.5">
            <p className="text-xs text-zinc-400 text-center">
              Pros win points with big shots. At 3.0–3.5, the player who misses less almost always wins.{' '}
              <span className="text-lime-400 font-bold">Consistency first, then add pressure.</span>
            </p>
          </div>
        </section>

        {/* When to attack */}
        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">When to Attack</p>
          <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 divide-y divide-zinc-800 overflow-hidden">
            {[
              { ball: 'Deep ball', what: 'Rally it back high, deep, cross-court', color: 'text-sky-400' },
              { ball: 'Medium ball', what: 'Hit to their weaker side', color: 'text-amber-400' },
              { ball: 'Short ball', what: 'Step in, attack, and come forward', color: 'text-lime-400' },
            ].map(r => (
              <div key={r.ball} className="flex items-center justify-between px-4 py-3">
                <span className={`text-sm font-black ${r.color}`}>{r.ball}</span>
                <span className="text-sm text-zinc-300 text-right ml-3">{r.what}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 8 Strategies */}
        <section className="space-y-3">
          <div>
            <p className="text-xs font-black tracking-widest uppercase text-zinc-400">8 Strategies</p>
            <p className="text-xs text-zinc-500 mt-0.5">Tap any strategy to expand</p>
          </div>
          <div className="space-y-2">
            {STRATEGIES.map(s => <StrategyCard key={s.n} s={s} />)}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-zinc-500 px-1">
            <span className="flex items-center gap-1"><LevelBadge level="3.0" /> start here</span>
            <span className="flex items-center gap-1"><LevelBadge level="3.5" /> add when 3.0 ones work</span>
          </div>
        </section>

        {/* Court Zones */}
        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Court Zones</p>
          <div className="space-y-2">
            {ZONES.map(z => (
              <div key={z.label} className={`rounded-2xl border p-4 ${z.color}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${z.dot}`} />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black">{z.label}</p>
                      <p className="text-xs opacity-60">{z.sublabel}</p>
                    </div>
                    <p className="text-sm text-zinc-400">{z.tip}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Patterns of Play */}
        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Patterns of Play</p>
          <div className="space-y-3">
            {PATTERNS.map(p => (
              <div key={p.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{p.icon}</span>
                  <p className="text-sm font-black text-zinc-100">{p.title}</p>
                  <LevelBadge level="3.5" />
                </div>
                <div className="space-y-2">
                  {p.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider w-12 mt-0.5 flex-shrink-0">{step.shot}</span>
                      <p className="text-sm text-zinc-300">{step.detail}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-lime-400/70 border-t border-zinc-800 pt-2">{p.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Serve */}
        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Serve</p>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-black text-zinc-400 uppercase tracking-wider">Patterns</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-xs text-lime-400 font-black mt-0.5 flex-shrink-0">1ST</span>
                  <p className="text-sm text-zinc-300">Pick a target before every serve: wide, body, or T. At 3.0, aim for the middle of the box and get it in.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs text-amber-400 font-black mt-0.5 flex-shrink-0">2ND</span>
                  <p className="text-sm text-zinc-300">Use spin and aim deep in the box toward their backhand or body. Never go for a big 2nd serve.</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 border-t border-zinc-800 pt-3">
              <p className="text-xs font-black text-zinc-400 uppercase tracking-wider">Goals</p>
              <div className="grid grid-cols-1 gap-1.5">
                {SERVE_GOALS.map(g => (
                  <div key={g.label} className="flex items-center justify-between">
                    <p className="text-sm text-zinc-400">{g.label}</p>
                    <span className="text-sm font-black text-zinc-200">{g.target}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Return */}
        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Return</p>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <span className="text-xs text-sky-400 font-black mt-0.5 flex-shrink-0 w-8">1ST</span>
                <div>
                  <p className="text-sm font-bold text-zinc-200">Defensive</p>
                  <p className="text-sm text-zinc-400">Return deep down the middle — neutralize the serve and start the point.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs text-lime-400 font-black mt-0.5 flex-shrink-0 w-8">2ND</span>
                <div>
                  <p className="text-sm font-bold text-zinc-200">Offensive</p>
                  <p className="text-sm text-zinc-400">Step in a little. Hit deep to their weaker side. Big shots go to big targets — never the lines.</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-zinc-500 border-t border-zinc-800 pt-2">
              Goal: get 8 out of 10 returns in play. A return in play makes the server hit another ball.
            </p>
          </div>
        </section>

        {/* Passing Shots */}
        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Passing Shots</p>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-300">Primary</p>
              <span className="text-sm font-bold text-lime-400">Crosscourt roll</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-300">Secondary</p>
              <span className="text-sm font-bold text-zinc-400">Down the line</span>
            </div>
          </div>
        </section>

        {/* Keys for Success */}
        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Keys for Success</p>
          <div className="space-y-2">
            {[
              { icon: '🧠', tip: 'You will lose lots of points even in matches you win. Forget the last point and play the next one.' },
              { icon: '❌', tip: 'Most points at your level end on a mistake. Make one more ball than your opponent.' },
              { icon: '💪', tip: 'Most players have a stronger forehand. Use yours, and keep the ball away from theirs.' },
              { icon: '📍', tip: 'Recover to the middle of the baseline after every shot.' },
              { icon: '🔁', tip: 'Spend 80% of time developing strengths, 20% minimizing weaknesses.' },
              { icon: '🎾', tip: 'Play more than you practice. Match experience builds court instincts.' },
            ].map((k, i) => (
              <div key={i} className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                <span className="text-lg flex-shrink-0">{k.icon}</span>
                <p className="text-sm text-zinc-400">{k.tip}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
