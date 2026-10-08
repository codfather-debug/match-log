'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type PageLink = { label: string; href: string };

type Fix = {
  kind: 'fix';
  title: string;
  why: string;
  steps: string[];
  strategy: string;
  links: PageLink[];
};

type Question = {
  kind: 'q';
  q: string;
  options: { icon: string; label: string; next: Question | Fix }[];
};

const SINGLES: PageLink = { label: 'Singles Playbook', href: '/playbook/singles' };
const DOUBLES: PageLink = { label: 'Doubles Playbook', href: '/playbook/doubles' };
const MENTAL:  PageLink = { label: 'Mental Toughness', href: '/playbook/mental' };
const RETURN:  PageLink = { label: 'Return Game',      href: '/playbook/return' };

// ─── Flowchart data ──────────────────────────────────────────────────────────

const TREE: Question = {
  kind: 'q',
  q: 'What is happening right now?',
  options: [
    {
      icon: '✅',
      label: "I'm winning",
      next: {
        kind: 'fix',
        title: "Don't change a winning game",
        why: 'Players lose leads by relaxing or trying something new. Keep doing what is working.',
        steps: [
          'Name the one thing that is winning you points — and keep doing it.',
          'Keep the same targets and the same pace. Don\'t start going for lines.',
          'Play every point like it\'s 0–0. Leads disappear fast.',
          'Stay on your between-point routine, even when it feels easy.',
        ],
        strategy: 'Play Your Strengths',
        links: [SINGLES],
      },
    },
    {
      icon: '❌',
      label: "I'm missing too much",
      next: {
        kind: 'q',
        q: 'Where are most of your misses going?',
        options: [
          {
            icon: '🥅',
            label: 'Into the net',
            next: {
              kind: 'fix',
              title: 'Aim higher over the net',
              why: 'Missing into the net is the worst error — the opponent never even has to hit a ball.',
              steps: [
                'Aim 3–5 feet over the net on rally balls.',
                'Swing low-to-high and brush up for more topspin.',
                'Bend your knees on low balls — get down to the ball.',
                'Cross-court goes over the lowest part of the net.',
              ],
              strategy: 'Out-Rally the Opponent',
              links: [SINGLES],
            },
          },
          {
            icon: '↥',
            label: 'Long',
            next: {
              kind: 'fix',
              title: 'Add spin, take 20% off',
              why: 'Long misses usually mean too much pace and not enough spin.',
              steps: [
                'Swing smooth — about 80% of your full power.',
                'Brush up the back of the ball for more topspin so it drops in.',
                'Aim 3–4 feet inside the baseline, not at the baseline.',
                'Finish your swing over your shoulder.',
              ],
              strategy: 'Out-Rally the Opponent',
              links: [SINGLES],
            },
          },
          {
            icon: '↔️',
            label: 'Wide',
            next: {
              kind: 'fix',
              title: 'Pick bigger targets',
              why: 'Aiming at the lines leaves no room for error.',
              steps: [
                'Aim a few feet inside the sidelines — never at the line.',
                'Go cross-court: it\'s the longest part of the court.',
                'When in doubt, hit deep down the middle.',
                'Be early: turn your shoulders as soon as you see where the ball is going.',
              ],
              strategy: 'Out-Rally the Opponent',
              links: [SINGLES],
            },
          },
          {
            icon: '🎾',
            label: 'Double faults',
            next: {
              kind: 'fix',
              title: 'Fix the second serve',
              why: 'Every double fault is a free point for the opponent.',
              steps: [
                'Use the exact same routine before every serve.',
                'Hit the 2nd serve with more spin and a little less pace.',
                'Aim for the middle of the service box, with plenty of net clearance.',
                'Take one deep breath before you toss.',
              ],
              strategy: 'Get 1st serves in — take a little pace off the 1st serve too',
              links: [MENTAL],
            },
          },
        ],
      },
    },
    {
      icon: '💥',
      label: "They're hitting winners / pushing me around",
      next: {
        kind: 'q',
        q: 'What are they doing to you?',
        options: [
          {
            icon: '🔥',
            label: 'Crushing their forehand',
            next: {
              kind: 'fix',
              title: 'Keep the ball away from their forehand',
              why: 'Don\'t let them hit their best shot. Make them use their weaker side.',
              steps: [
                'Hit most balls to their backhand.',
                'Make them hit 4 backhands in a row before you change direction.',
                'Hit high and deep to the backhand — that\'s hard to attack.',
                'Only go to the forehand when the court is wide open.',
              ],
              strategy: 'Attack the Opponent\'s Weakness · The Backhand Cage',
              links: [SINGLES],
            },
          },
          {
            icon: '⬆️',
            label: 'Attacking my short balls',
            next: {
              kind: 'fix',
              title: 'Hit deeper',
              why: 'Short balls let your opponent step in and attack.',
              steps: [
                'Aim past the service line — deep balls push them back.',
                'Add net clearance: higher over the net = deeper.',
                'When you\'re in trouble, hit a high, deep loop to reset the point.',
                'Recover to the middle of the baseline after every shot.',
              ],
              strategy: 'Out-Rally the Opponent',
              links: [SINGLES],
            },
          },
          {
            icon: '🏃',
            label: 'Rushing the net',
            next: {
              kind: 'fix',
              title: 'Pass or lob',
              why: 'A net player needs you to give them an easy, high ball to volley.',
              steps: [
                'Hit low, dipping balls at their feet — make them volley up.',
                'If they are close to the net, lob over their backhand side.',
                'Pick one side to pass and commit to it.',
                'Hit right at them if you\'re rushed — it\'s hard to volley from the body.',
              ],
              strategy: 'Bring the Opponent to the Net (pass or lob)',
              links: [SINGLES],
            },
          },
          {
            icon: '🚀',
            label: 'Big serve',
            next: {
              kind: 'fix',
              title: 'Just get the return back',
              why: 'Against a big serve, a deep, safe return is a win.',
              steps: [
                'Step back 3–4 feet to give yourself more time.',
                'Use a short, compact swing — block it back.',
                'Aim deep down the middle.',
                'On their 2nd serve, step in and attack.',
              ],
              strategy: 'Return Game — neutralize, then attack 2nd serves',
              links: [RETURN],
            },
          },
        ],
      },
    },
    {
      icon: '🧱',
      label: 'They get everything back',
      next: {
        kind: 'q',
        q: 'What kind of player are they?',
        options: [
          {
            icon: '🐢',
            label: 'Slow, high, loopy balls (pusher)',
            next: {
              kind: 'fix',
              title: 'Be patient, then come forward',
              why: 'Pushers win when you get impatient and overhit.',
              steps: [
                'Don\'t try to hit a winner on the first ball — build the point.',
                'Step in and take high balls early, before they bounce up high.',
                'Approach the net on short balls and finish with a volley.',
                'Use a drop shot to bring them forward, where they\'re uncomfortable.',
              ],
              strategy: 'Attack the Net · Bring the Opponent to the Net',
              links: [SINGLES],
            },
          },
          {
            icon: '⚡',
            label: 'Fast runner who chases everything',
            next: {
              kind: 'fix',
              title: 'Make them run — then change direction',
              why: 'Fast players are great at running to the open court, so hit behind them.',
              steps: [
                'Hit wide to pull them off the court.',
                'Hit the next ball behind them, back where they came from.',
                'Mix in a drop shot followed by a lob.',
                'The player who moves more, loses. Make them move.',
              ],
              strategy: 'Open the Court · The 2-1',
              links: [SINGLES],
            },
          },
          {
            icon: '🤖',
            label: 'Steady, same ball every time',
            next: {
              kind: 'fix',
              title: 'Break their rhythm',
              why: 'Steady players love rhythm. Take it away.',
              steps: [
                'Mix spin: topspin, then slice.',
                'Mix height: a high loop, then a low drive.',
                'Mix depth: push deep, then drop short.',
                'Mix speed: fast, slow, fast.',
              ],
              strategy: 'Use Variety to Create Errors',
              links: [SINGLES],
            },
          },
        ],
      },
    },
    {
      icon: '⏱️',
      label: "I'm losing the long rallies",
      next: {
        kind: 'fix',
        title: 'Shorten the points',
        why: '70% of points end in 1–4 shots. If you lose long rallies, win the point early.',
        steps: [
          'Serve wide or into the body, then hit a forehand on the next ball (Serve +1).',
          'Step in and attack their 2nd serve.',
          'Move forward on any short ball — don\'t back up.',
          'Approach the net after a deep, strong shot.',
        ],
        strategy: 'Play Aggressively · Serve + 1 Forehand',
        links: [SINGLES],
      },
    },
    {
      icon: '😤',
      label: "I'm nervous, mad, or lost momentum",
      next: {
        kind: 'q',
        q: 'Which one sounds most like you?',
        options: [
          {
            icon: '😬',
            label: 'Nervous / tight',
            next: {
              kind: 'fix',
              title: 'Breathe and move your feet',
              why: 'Nerves make your arm tight and your feet slow.',
              steps: [
                'Take a long, slow breath out before each point.',
                'Bounce on your toes — happy feet.',
                'Swing all the way through. Don\'t steer the ball.',
                'Pick big, safe targets until you feel loose.',
              ],
              strategy: 'Out-Rally the Opponent until you settle in',
              links: [MENTAL],
            },
          },
          {
            icon: '😡',
            label: 'Frustrated / mad',
            next: {
              kind: 'fix',
              title: 'React → Release → Reset → Ready',
              why: 'The last point is over. The next point is the only one you can win.',
              steps: [
                'React: one quick reaction — then let it go.',
                'Release: turn away from the net, breathe out, look at your strings.',
                'Reset: bounce the ball and pick your target.',
                'Ready: split step, eyes up, trust your plan.',
              ],
              strategy: 'Between-point routine',
              links: [MENTAL],
            },
          },
          {
            icon: '📉',
            label: "They've won several games in a row",
            next: {
              kind: 'fix',
              title: 'Break their momentum',
              why: 'Momentum changes when something changes. Be the one who changes it.',
              steps: [
                'Slow down. Use your full time between points (within the rules).',
                'Change one thing: pace, spin, or come to the net.',
                'Make them play: get every 1st serve and every return in.',
                'Focus on winning just the next point.',
              ],
              strategy: 'Change one thing — then go back to your strengths',
              links: [MENTAL, SINGLES],
            },
          },
        ],
      },
    },
    {
      icon: '👥',
      label: "Doubles: we're losing points",
      next: {
        kind: 'q',
        q: "What's happening in doubles?",
        options: [
          {
            icon: '🦅',
            label: 'Their net player is picking off our shots',
            next: {
              kind: 'fix',
              title: 'Keep the net player honest',
              why: 'If you never test them, the net player will poach every ball.',
              steps: [
                'Lob over the net player — especially on returns.',
                'Once in a while, hit down the line at them.',
                'Keep cross-court balls low so they can\'t reach them.',
                'If they keep poaching, try both players back for a game.',
              ],
              strategy: 'Return low cross-court, lob the poacher',
              links: [DOUBLES],
            },
          },
          {
            icon: '🕳️',
            label: 'Balls are going through the middle',
            next: {
              kind: 'fix',
              title: 'Talk and cover the middle',
              why: 'Most doubles mistakes happen in the middle.',
              steps: [
                'Call "mine" or "yours" on every middle ball.',
                'Default rule: the forehand player takes the middle.',
                'Move together like you\'re tied by a rope.',
                'Never both go for it — and never both leave it.',
              ],
              strategy: 'Cover the Middle',
              links: [DOUBLES],
            },
          },
          {
            icon: '⤴️',
            label: "We're getting lobbed",
            next: {
              kind: 'fix',
              title: 'Plan for the lob',
              why: 'Standing too close to the net makes you easy to lob.',
              steps: [
                'Net player: stand a step farther back from the net.',
                'Call it: "Mine!" or "Switch!" — then move together.',
                'If the lob is good, both players go back.',
                'Overhead anything you can reach — point at the ball with your free hand.',
              ],
              strategy: 'Communicate and move as a team',
              links: [DOUBLES],
            },
          },
        ],
      },
    },
  ],
};

const CHANGEOVER = [
  { n: '1', label: 'Score check',     detail: 'Am I winning or losing? (Winning → keep it. Losing → change one thing.)' },
  { n: '2', label: "What's working?", detail: 'Which shot or pattern is winning me points?' },
  { n: '3', label: "What's not?",     detail: 'Where are my errors going? What are they hurting me with?' },
  { n: '4', label: 'One change',      detail: 'Pick ONE thing to do differently in the next game.' },
  { n: '5', label: 'Reset',           detail: 'Drink water, breathe, walk out ready.' },
];

// ─── Components ──────────────────────────────────────────────────────────────

function FixCard({ fix }: { fix: Fix }) {
  return (
    <div className="rounded-2xl border border-orange-400/30 bg-orange-400/[0.05] p-4 space-y-3">
      <div>
        <p className="text-[10px] font-black tracking-widest uppercase text-orange-300">Try this</p>
        <p className="text-lg font-black text-zinc-100 mt-0.5">{fix.title}</p>
        <p className="text-sm text-zinc-400 mt-1">{fix.why}</p>
      </div>
      <ol className="space-y-2">
        {fix.steps.map((s, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-zinc-200">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-orange-400 text-[11px] font-black text-black">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
        <p className="text-[10px] font-black tracking-widest uppercase text-zinc-500">Recommended strategy</p>
        <p className="text-sm font-bold text-lime-400 mt-0.5">{fix.strategy}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {fix.links.map(l => (
          <Link key={l.href} href={l.href}
            className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:border-zinc-500 hover:text-zinc-100">
            Open {l.label} →
          </Link>
        ))}
      </div>
    </div>
  );
}

function Flowchart() {
  // path = list of option indexes chosen so far
  const [path, setPath] = useState<number[]>([]);

  // Walk the tree along the chosen path
  const trail: { q: string; answer: string }[] = [];
  let node: Question | Fix = TREE;
  for (const idx of path) {
    if (node.kind !== 'q') break;
    const opt: Question["options"][number] = node.options[idx];
    trail.push({ q: node.q, answer: `${opt.icon} ${opt.label}` });
    node = opt.next;
  }

  return (
    <section className="space-y-3">
      <div>
        <p className="text-xs font-black tracking-widest uppercase text-zinc-400">What&apos;s Not Working?</p>
        <p className="text-xs text-zinc-500 mt-0.5">Tap what you see. Follow the arrows to a fix.</p>
      </div>

      {/* Trail of answers so far */}
      {trail.map((t, i) => (
        <div key={i} className="space-y-1">
          <button
            onClick={() => setPath(path.slice(0, i))}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-left hover:border-zinc-700"
          >
            <p className="text-[11px] text-zinc-500">{t.q}</p>
            <p className="text-sm font-bold text-zinc-200">{t.answer}</p>
          </button>
          <p className="text-center text-zinc-600 text-sm leading-none">↓</p>
        </div>
      ))}

      {/* Current step */}
      {node.kind === 'q' ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
          <p className="text-base font-black text-zinc-100">{node.q}</p>
          <div className="space-y-2">
            {node.options.map((o, i) => (
              <button
                key={o.label}
                onClick={() => setPath([...path, i])}
                className="w-full flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-3 text-left transition-all hover:border-orange-400/40 active:scale-[0.98]"
              >
                <span className="text-xl w-7 text-center flex-shrink-0">{o.icon}</span>
                <span className="flex-1 text-sm font-bold text-zinc-200">{o.label}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-zinc-500 flex-shrink-0">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <FixCard fix={node} />
      )}

      {path.length > 0 && (
        <div className="flex gap-2">
          <button onClick={() => setPath(path.slice(0, -1))}
            className="flex-1 py-2.5 rounded-xl border border-zinc-800 text-sm font-bold text-zinc-300">
            ← Back
          </button>
          <button onClick={() => setPath([])}
            className="flex-1 py-2.5 rounded-xl bg-zinc-100 text-black text-sm font-black">
            Start over
          </button>
        </div>
      )}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TroubleshootPlaybookPage() {
  return (
    <div className="space-y-6 pb-6">

      <Link href="/playbook" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 mb-2">
        <ArrowLeft className="h-4 w-4" /> Playbook
      </Link>

      <div className="space-y-7">

        {/* Golden rule */}
        <div className="rounded-2xl border border-lime-400/20 bg-lime-400/[0.04] px-4 py-4 text-center space-y-1">
          <p className="text-[10px] font-black tracking-widest uppercase text-lime-400">The Golden Rule</p>
          <p className="text-base font-black text-zinc-100">Never change a winning game.<br />Always change a losing game.</p>
          <p className="text-xs text-zinc-400">Change ONE thing at a time, and give it at least 2 games.</p>
        </div>

        <Flowchart />

        {/* Changeover checklist */}
        <section className="space-y-3">
          <div>
            <p className="text-xs font-black tracking-widest uppercase text-zinc-400">60-Second Changeover Check</p>
            <p className="text-xs text-zinc-500 mt-0.5">Ask yourself these on every changeover</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800 overflow-hidden">
            {CHANGEOVER.map(c => (
              <div key={c.n} className="flex items-start gap-3 px-4 py-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-zinc-700 text-xs font-black text-zinc-300">
                  {c.n}
                </span>
                <div>
                  <p className="text-sm font-bold text-zinc-200">{c.label}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{c.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
