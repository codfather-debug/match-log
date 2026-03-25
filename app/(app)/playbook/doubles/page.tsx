'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// ─── Data ────────────────────────────────────────────────────────────────────

const FUNDAMENTALS = [
  {
    title: 'Win the Net',
    summary: 'The team that controls the net wins. Make it your constant goal to get both players forward.',
    points: [
      'Both players at net win far more points than either baseline formation.',
      'Every serve + volley or return + approach opportunity is worth taking.',
      'Force your opponents back with pace and depth, then move in together.',
      'Net control shifts momentum — defend it aggressively.',
    ],
  },
  {
    title: 'Keep the Ball Low',
    summary: 'Low balls force opponents to volley up, giving you the opportunity to put it away.',
    points: [
      'Aim below the tape on most cross-court returns and passing attempts.',
      'Topspin dips the ball quickly — ideal for keeping opponents from attacking.',
      'A low dipping ball into the net player\'s feet neutralizes any formation.',
      'The team forced to volley up is the team that\'s losing the exchange.',
    ],
  },
  {
    title: 'Communicate Constantly',
    summary: 'Talk before every point, between points, and during points.',
    points: [
      'Call \'mine\' or \'yours\' on every ball down the middle.',
      'Signal poaching intentions before the serve with a hand behind the back.',
      'Compliment every good shot from your partner — keep energy high.',
      'Discuss what\'s working between games. Short, focused adjustments.',
    ],
  },
  {
    title: 'Cover the Middle',
    summary: 'Most doubles errors come from balls hit through the middle seam.',
    points: [
      'Default rule: forehand player takes the middle when both can reach.',
      'When both are back, the player who hit last covers the middle.',
      'When both are at net, the player closest to the center takes the middle.',
      'Never both go for it — call it or default to forehand.',
    ],
  },
  {
    title: 'Pick On the Weaker Player',
    summary: 'Find the vulnerability in the opposing team and exploit it relentlessly.',
    points: [
      'Target the weaker volleyer or the player who mis-hits under pressure.',
      'Hit at the body of the net player — most miss or pop it up.',
      'Identify who\'s struggling mentally and press their side.',
      'Don\'t switch targets mid-plan unless the opponent completely adjusts.',
    ],
  },
];

const ROLES = [
  {
    title: 'Server',
    icon: '🎾',
    color: 'border-lime-400/20 bg-lime-400/[0.03]',
    badge: 'text-lime-400',
    points: [
      'Serve wide or into the body — create an angle or jam the returner.',
      'Follow your serve to the net when first serve lands in.',
      'On second serve, move in slightly to cut off the angle.',
      'Communicate with partner: signal where you\'re serving before each point.',
      'After serving, split step as partner volleys — be ready for anything.',
    ],
  },
  {
    title: 'Server\'s Partner',
    icon: '🤝',
    color: 'border-sky-400/20 bg-sky-400/[0.03]',
    badge: 'text-sky-400',
    points: [
      'Start in the net position — you own the front of the court.',
      'Poach aggressively on predictable cross-court returns.',
      'Signal your intention to poach before the serve with a hand signal.',
      'If not poaching, move toward the middle to take anything short.',
      'After a poach, switch sides with your partner automatically.',
    ],
  },
  {
    title: 'Returner',
    icon: '↩️',
    color: 'border-amber-400/20 bg-amber-400/[0.03]',
    badge: 'text-amber-400',
    points: [
      'Default return: low and cross-court, away from the net player.',
      'Attack the second serve — step in, take it early, go for a winner.',
      'Lob the net player when they\'re poaching or standing too close.',
      'Hit at the net player\'s feet if the opportunity is there.',
      'After a quality return, move in to take the net with your partner.',
    ],
  },
  {
    title: 'Returner\'s Partner',
    icon: '📍',
    color: 'border-zinc-800 bg-zinc-900/50',
    badge: 'text-zinc-400',
    points: [
      'Start at the service line — not too far forward, not at the baseline.',
      'Watch the net player. If they poach, move to the net and take over.',
      'Move back if the return is weak and you expect a put-away.',
      'If partner hits a great return, move in together to take the net.',
      'Call \'back\' or \'up\' to coordinate your movements clearly.',
    ],
  },
];

const FORMATIONS = [
  {
    title: 'Both Up',
    icon: '⬆️⬆️',
    label: 'Aggressive',
    color: 'text-lime-400',
    description: 'Both players at the net. Most effective when you\'ve forced a weak ball or taken control of the point.',
    pros: ['Highest win % for net exchanges', 'Puts maximum pressure on opponents', 'Forces lobs or low-percentage passing shots'],
    cons: ['Vulnerable to lobs', 'Requires good reflexes and communication'],
  },
  {
    title: 'Both Back',
    icon: '⬇️⬇️',
    label: 'Defensive',
    color: 'text-red-400',
    description: 'Both players at the baseline. Use only when forced — opponents at net win far more often.',
    pros: ['More time to react to hard shots', 'Better for lob coverage'],
    cons: ['Surrenders net control', 'Gives opponents easy volleys', 'Use as a reset, not a strategy'],
  },
  {
    title: 'Up & Back (I-Formation)',
    icon: '⬆️⬇️',
    label: 'Standard',
    color: 'text-sky-400',
    description: 'One player at net, one at baseline. The standard starting formation — transition to Both Up as quickly as possible.',
    pros: ['Good coverage of lobs and passing shots', 'Natural starting point for most points'],
    cons: ['Middle gap is exploitable', 'Net player must be active or they become a liability'],
  },
];

const NET_PLAY = [
  {
    category: 'Eyework',
    icon: '👁️',
    items: [
      'Watch the opponent\'s racket face at contact — read direction early.',
      'Keep your eyes up, not on the ball coming over the net.',
      'Track the ball all the way to your strings on every volley.',
      'After hitting, immediately refocus on the opponent\'s next contact.',
    ],
  },
  {
    category: 'Footwork',
    icon: '👟',
    items: [
      'Split step as your opponent contacts the ball — every time.',
      'Move toward the ball at a 45° angle forward when possible.',
      'Keep your weight moving forward on all easy volleys.',
      'When lobbed, one player calls it and both retreat together.',
    ],
  },
];

const THEMES = [
  { icon: '🏆', tip: 'The team that wins the net wins the match. Make both-up your mission.' },
  { icon: '📣', tip: 'Talk on every ball down the middle. Silence = errors.' },
  { icon: '⬇️', tip: 'Keep the ball low — a ball below the net forces opponents to hit up.' },
  { icon: '🎯', tip: 'Target the weaker player consistently. Don\'t switch plans too early.' },
  { icon: '↩️', tip: 'Return cross-court by default. Never give the net player an easy put-away.' },
  { icon: '🔄', tip: 'After a poach, switch sides. Movement must be automatic.' },
  { icon: '💪', tip: 'Hit at the body of the net player when uncertain. It neutralizes their angle.' },
  { icon: '🧠', tip: 'Trust each other. One bad shot doesn\'t change the game plan.' },
];

const GOOD_PARTNER = [
  {
    trait: 'Communicates clearly',
    detail: 'Calls every ball, signals before poaching, gives feedback between points.',
  },
  {
    trait: 'Moves together',
    detail: 'Advances and retreats as a unit. Never leaves a gap by acting independently.',
  },
  {
    trait: 'Stays positive',
    detail: 'Encourages after errors. Never shows frustration toward partner — it\'s contagious.',
  },
  {
    trait: 'Takes ownership',
    detail: 'Doesn\'t let balls drop between them. Makes a decision and commits to it.',
  },
  {
    trait: 'Adapts',
    detail: 'Adjusts the game plan based on what\'s working, not what they\'re comfortable with.',
  },
];

const PRE_MATCH_QUESTIONS = [
  'Where do you like to serve — wide, body, or T?',
  'Do you prefer to poach or stay home by default?',
  'How should we handle lobs — who covers which side?',
  'What\'s your strongest shot? I\'ll try to set you up for it.',
  'How do you like to communicate during points? Any signals?',
];

const IN_MATCH_QUESTIONS = [
  'What\'s working for them right now?',
  'Which opponent is more vulnerable?',
  'Are we getting to the net enough?',
  'Are we covering the middle?',
  'What adjustment can we make right now?',
];

// ─── Components ──────────────────────────────────────────────────────────────

function RoleCard({ r }: { r: typeof ROLES[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-2xl border transition-all ${open ? r.color : 'border-zinc-800 bg-zinc-900/50'}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl flex-shrink-0">{r.icon}</span>
          <span className={`text-sm font-bold ${open ? r.badge : 'text-zinc-100'}`}>{r.title}</span>
        </div>
        <svg
          className={`text-zinc-400 transition-transform flex-shrink-0 ml-2 ${open ? 'rotate-90' : ''}`}
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
      {open && (
        <ul className="px-4 pb-4 space-y-1.5 border-t border-zinc-800 pt-3">
          {r.points.map((p, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
              <span className={`mt-0.5 flex-shrink-0 ${r.badge}`}>›</span>
              {p}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FundamentalCard({ f, n }: { f: typeof FUNDAMENTALS[0]; n: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-2xl border transition-all ${open ? 'border-sky-400/20 bg-sky-400/[0.04]' : 'border-zinc-800 bg-zinc-900/50'}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-3">
          <span className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center ${open ? 'bg-sky-400 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
            {n}
          </span>
          <span className="text-sm font-bold text-zinc-100">{f.title}</span>
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
          <p className="text-sm text-zinc-400 italic">{f.summary}</p>
          <ul className="space-y-1.5">
            {f.points.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-sky-400 mt-0.5 flex-shrink-0">›</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DoublesPlaybookPage() {
  return (
    <div className="space-y-6 pb-6">

      <Link href="/playbook" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 mb-2">
        <ArrowLeft className="h-4 w-4" /> Playbook
      </Link>

      <div className="space-y-7">

        {/* Key Stat */}
        <section className="rounded-2xl border border-sky-400/20 bg-sky-400/[0.04] p-4 text-center space-y-1">
          <p className="text-4xl font-black text-sky-400">Both Up</p>
          <p className="text-sm text-zinc-400">The team that wins the net wins the match.</p>
          <p className="text-xs text-zinc-500">All strategy flows from this principle.</p>
        </section>

        {/* 5 Fundamentals */}
        <section className="space-y-3">
          <div>
            <p className="text-xs font-black tracking-widest uppercase text-zinc-400">5 Fundamentals</p>
            <p className="text-xs text-zinc-500 mt-0.5">Tap to expand</p>
          </div>
          <div className="space-y-2">
            {FUNDAMENTALS.map((f, i) => <FundamentalCard key={f.title} f={f} n={i + 1} />)}
          </div>
        </section>

        {/* 4 Roles */}
        <section className="space-y-3">
          <div>
            <p className="text-xs font-black tracking-widest uppercase text-zinc-400">4 Roles on Court</p>
            <p className="text-xs text-zinc-500 mt-0.5">Know your job on every point</p>
          </div>
          <div className="space-y-2">
            {ROLES.map(r => <RoleCard key={r.title} r={r} />)}
          </div>
        </section>

        {/* 3 Formations */}
        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">3 Formations</p>
          <div className="space-y-3">
            {FORMATIONS.map(f => (
              <div key={f.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{f.icon}</span>
                    <p className="text-sm font-black text-zinc-100">{f.title}</p>
                  </div>
                  <span className={`text-xs font-black uppercase tracking-wider ${f.color}`}>{f.label}</span>
                </div>
                <p className="text-sm text-zinc-400">{f.description}</p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-lime-400 uppercase tracking-wider">Pros</p>
                    {f.pros.map((p, i) => (
                      <p key={i} className="text-xs text-zinc-400 flex items-start gap-1">
                        <span className="text-lime-400 flex-shrink-0">+</span>{p}
                      </p>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-wider">Cons</p>
                    {f.cons.map((c, i) => (
                      <p key={i} className="text-xs text-zinc-400 flex items-start gap-1">
                        <span className="text-red-400 flex-shrink-0">−</span>{c}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Net Play */}
        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Net Play</p>
          <div className="space-y-3">
            {NET_PLAY.map(n => (
              <div key={n.category} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{n.icon}</span>
                  <p className="text-sm font-black text-zinc-100">{n.category}</p>
                </div>
                <ul className="space-y-1.5">
                  {n.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                      <span className="text-sky-400 mt-0.5 flex-shrink-0">›</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* What Makes a Good Partner */}
        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Good Partner Traits</p>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800 overflow-hidden">
            {GOOD_PARTNER.map(g => (
              <div key={g.trait} className="px-4 py-3 space-y-0.5">
                <p className="text-sm font-bold text-zinc-200">{g.trait}</p>
                <p className="text-xs text-zinc-400">{g.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Common Themes */}
        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Common Themes</p>
          <div className="space-y-2">
            {THEMES.map((t, i) => (
              <div key={i} className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                <span className="text-lg flex-shrink-0">{t.icon}</span>
                <p className="text-sm text-zinc-400">{t.tip}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pre-Match Questions */}
        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Pre-Match Partner Questions</p>
          <p className="text-xs text-zinc-500">Ask your partner before you step on court</p>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800 overflow-hidden">
            {PRE_MATCH_QUESTIONS.map((q, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <span className="text-xs font-black text-sky-400 w-4 flex-shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-sm text-zinc-400">{q}</p>
              </div>
            ))}
          </div>
        </section>

        {/* In-Match Questions */}
        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">In-Match Check-In</p>
          <p className="text-xs text-zinc-500">Ask between sets or when momentum shifts</p>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800 overflow-hidden">
            {IN_MATCH_QUESTIONS.map((q, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <span className="text-xs font-black text-amber-400 w-4 flex-shrink-0 mt-0.5">?</span>
                <p className="text-sm text-zinc-400">{q}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
