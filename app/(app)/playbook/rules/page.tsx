'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// ─── Data ────────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: 'principles',
    title: 'Principles',
    icon: '🤝',
    color: 'border-lime-400/20 bg-lime-400/[0.03]',
    badge: 'text-lime-400',
    rules: [
      { n: 1, title: 'Courtesy is expected', body: 'Tennis requires cooperation and courtesy from both players at all times.' },
      { n: 2, title: 'Points played in good faith stand', body: 'All points played in good faith count — even if a mistake is discovered afterward (e.g., net was too high, wrong court). Corrective action may only be taken after a point is completed.' },
    ],
  },
  {
    id: 'warmup',
    title: 'Warm-Up',
    icon: '🔄',
    color: 'border-sky-400/20 bg-sky-400/[0.03]',
    badge: 'text-sky-400',
    rules: [
      { n: 3, title: 'Warm-up is not practice', body: 'Provide your opponent a 5–10 minute warm-up. Hit shots directly to them. Declining to warm up your opponent forfeits your own right to a warm-up.' },
      { n: 4, title: 'Warm-up serves before the first point', body: 'All warm-up serves must be taken before the first serve of the match. Return warm-up serves at a moderate pace without disrupting the server.' },
    ],
  },
  {
    id: 'calls',
    title: 'Making Calls',
    icon: '📣',
    color: 'border-amber-400/20 bg-amber-400/[0.03]',
    badge: 'text-amber-400',
    rules: [
      { n: 5,  title: 'You call your own side', body: 'A player calls all shots landing on, or aimed at, their side of the net.' },
      { n: 6,  title: 'Opponent gets benefit of the doubt', body: 'Any doubt must be resolved in favor of your opponent. When a match is played without officials, you are the judge — and fairness over self-interest is the standard.' },
      { n: 7,  title: 'Ball touching any part of a line is good', body: 'A ball 99% out is still 100% good. Do not call a ball out unless you clearly see space between where the ball lands and the line.' },
      { n: 8,  title: 'Ball that can\'t be called out is good', body: 'You may not claim a let because you didn\'t see a ball. If you can\'t call it out with certainty, it is in.' },
      { n: 9,  title: 'Either doubles partner may call', body: 'In doubles, either partner may make a call — but the player looking down the line is more likely to be accurate than the one looking across.' },
      { n: 10, title: 'All points are treated equally', body: 'There is no justification for treating a match point differently from a first point. All points matter the same.' },
      { n: 11, title: 'Requesting opponent\'s help', body: 'If you ask your opponent and they give a positive opinion, it must be accepted. If neither player has an opinion, the ball is good.' },
      { n: 12, title: 'Reversing a call', body: 'If you call a ball out and then realize it was good, reverse the call. The point goes to your opponent — it is not replayed.' },
      { n: 13, title: 'Call your own shots out', body: 'With the exception of the first serve, if you clearly see your own shot land out, call it — even if not asked.' },
      { n: 14, title: 'Partners disagree on a call', body: 'If one partner calls out and the other sees it good, the ball is good. Tell your partner quietly and concede the point.' },
      { n: 15, title: 'Calls must be audible or visible', body: 'No matter how obvious it seems, your opponent is entitled to a prompt audible or visible out call.' },
      { n: 16, title: 'Spectators never make calls', body: 'Never enlist a spectator to help with a call. No spectator has a part in a match.' },
      { n: 17, title: 'Make calls promptly', body: 'A call must be made before your return goes out of play or before your opponent has had a chance to play it. Delayed calls that give you a \'second chance\' are not valid.' },
      { n: 21, title: 'Clay court marks', body: 'On clay, if any part of a ball mark touches a line, the ball is good. Take a careful second look at any close point-ending placement near the lines.' },
    ],
  },
  {
    id: 'serving',
    title: 'Serving',
    icon: '🎾',
    color: 'border-red-400/20 bg-red-400/[0.03]',
    badge: 'text-red-400',
    rules: [
      { n: 22, title: 'Third ball request', body: 'When a server requests three balls, the receiver must comply when the third ball is readily available. Distant balls are retrieved at the end of a game.' },
      { n: 23, title: 'Avoid foot faults', body: 'It\'s a foot fault whenever a foot even just touches the baseline, even if you don\'t follow the serve to the net.' },
      { n: 24, title: 'Calling foot faults', body: 'The receiver may only call foot faults after warning the server and attempting to get an official, and only when the foot fault is flagrant and clearly perceptible.' },
      { n: 25, title: 'Service calls in doubles', body: 'The receiver\'s partner calls the service line; the receiver calls the sideline and center service line. Either partner may call anything they clearly see.' },
      { n: 26, title: 'Serving team doesn\'t call first serves out', body: 'The server or their partner shall not call a fault on the first serve — the receiver may be giving the benefit of the doubt. Exception: if the receiver doesn\'t return the ball, then the server may call the fault. The server must call any second serve clearly out.' },
      { n: 27, title: 'Service let calls', body: 'Any player may call a service let. It must be called before the return goes out of play or is hit by the server. Near-ace lets must be called promptly.' },
      { n: 28, title: 'Don\'t play obvious faults', body: 'Don\'t put an obvious fault ball into play. Doing so is rude and may be gamesmanship.' },
      { n: 29, title: 'Receiver readiness', body: 'The receiver plays to the server\'s reasonable pace. If the receiver attempts to return a serve, they are presumed ready.' },
      { n: 30, title: 'Delays during service', body: 'If a ball rolls onto court during second serve, the server gets two serves. If the delay was caused by the server, they get one serve.' },
    ],
  },
  {
    id: 'hindrance',
    title: 'Hindrance',
    icon: '🚫',
    color: 'border-zinc-800 bg-zinc-900/50',
    badge: 'text-zinc-400',
    rules: [
      { n: 33, title: 'Stop play immediately', body: 'A player who claims a hindrance must stop play as soon as possible.' },
      { n: 34, title: 'Talking during points', body: 'Singles players should not talk during points. Doubles partners may talk when the ball is moving toward them, but not when it\'s moving toward the opponent\'s court. Talking that interferes with an opponent\'s play is a hindrance.' },
      { n: 35, title: 'Body movement', body: 'A player may fake with the body while a ball is in play. Any movement or sound made solely to distract an opponent (waving arms, stamping feet) is not allowed.' },
      { n: 36, title: 'Unintentional hindrance', body: 'A player hindered by an opponent\'s unintentional act gets a let only if they could have made the shot. No let is granted for something within the player\'s own control (e.g., tripping over your own hat).' },
      { n: 37, title: 'Grunting', body: 'Avoid grunting and loud noises. If grunting affects the outcome of a point, it is a hindrance — but only an official may make this ruling.' },
      { n: 38, title: 'Injury caused by a player', body: 'If a player accidentally injures an opponent and the opponent can\'t continue, the opponent loses by retirement. If the injury is deliberate, the causing player loses by default.' },
    ],
  },
  {
    id: 'balls',
    title: 'Ball Issues',
    icon: '⚪',
    color: 'border-zinc-800 bg-zinc-900/50',
    badge: 'text-zinc-400',
    rules: [
      { n: 18, title: 'Let when a ball rolls onto court', body: 'Any player may call a let as soon as they become aware of a ball entering the playing area. The right to call a let is lost if the player unreasonably delays.' },
      { n: 19, title: 'Self-call violations', body: 'Promptly acknowledge when: a ball touches you; you touch the net or opponent\'s court; you hit the ball before it crosses the net; you double-hit a ball; or the ball bounces twice in your court. Your opponent cannot make these calls for you.' },
      { n: 42, title: 'Retrieving stray balls', body: 'Each player removes stray balls from their end. Honor any request to clear a ball during play stoppages. Do not retrieve balls from an adjacent court while a point is in play.' },
      { n: 43, title: 'Catching a ball', body: 'If you catch a ball in play before it bounces, you lose the point — regardless of where you\'re standing.' },
    ],
  },
  {
    id: 'misc',
    title: 'Miscellaneous',
    icon: '📋',
    color: 'border-zinc-800 bg-zinc-900/50',
    badge: 'text-zinc-400',
    rules: [
      { n: 40, title: 'Stalling', body: 'Stalling violates continuous play rules. Actions that constitute stalling: warming up longer than allotted; playing at one-third normal pace; taking more than 90 seconds on a changeover or 2 minutes on a set break; excessive ball bouncing before serves.' },
      { n: 41, title: 'When to contact an official', body: 'Contact an official for: stalling, flagrant foot faults, extreme grunting, medical timeouts, scoring disputes, or a pattern of bad calls. You may refuse to play until an official responds.' },
      { n: 45, title: 'Equipment malfunction', body: 'If clothing or equipment (other than a racket) becomes unusable beyond your control, play may be suspended. For broken rackets, you may replace it but are subject to delay violations.' },
      { n: 46, title: 'Towel placement', body: 'Towels go on the ground outside the net post or at the back fence. Never place clothing or towels on the net.' },
    ],
  },
];

// ─── Components ──────────────────────────────────────────────────────────────

function SectionCard({ s }: { s: typeof SECTIONS[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-2xl border transition-all ${open ? s.color : 'border-zinc-800 bg-zinc-900/50'}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl flex-shrink-0">{s.icon}</span>
          <span className={`text-sm font-bold ${open ? s.badge : 'text-zinc-100'}`}>{s.title}</span>
          <span className="text-xs text-zinc-500">{s.rules.length} rules</span>
        </div>
        <svg
          className={`text-zinc-400 transition-transform flex-shrink-0 ml-2 ${open ? 'rotate-90' : ''}`}
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
      {open && (
        <div className="border-t border-zinc-800 divide-y divide-zinc-800/50">
          {s.rules.map(r => (
            <div key={r.n} className="px-4 py-3.5 space-y-1">
              <div className="flex items-start gap-2">
                <span className={`text-[10px] font-black mt-0.5 flex-shrink-0 ${s.badge}`}>§{r.n}</span>
                <p className="text-sm font-bold text-zinc-200">{r.title}</p>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed pl-6">{r.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TennisRulesPage() {
  return (
    <div className="space-y-6 pb-6">

      <Link href="/playbook" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 mb-2">
        <ArrowLeft className="h-4 w-4" /> Playbook
      </Link>

      <div className="space-y-7">

        {/* Hero */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-1">
          <p className="text-sm font-black text-zinc-200">The Code — USTA Unwritten Rules</p>
          <p className="text-xs text-zinc-400 leading-relaxed">
            These are the principles of conduct expected from players when no official is present. When in doubt, give the point to your opponent.
          </p>
        </section>

        {/* Golden rule highlight */}
        <div className="rounded-2xl border border-lime-400/20 bg-lime-400/[0.05] px-4 py-3.5 flex items-start gap-3">
          <span className="text-lime-400 text-xl flex-shrink-0">★</span>
          <p className="text-sm text-zinc-300 leading-relaxed">
            <span className="font-bold text-zinc-100">Golden Rule:</span> Any doubt must be resolved in favor of your opponent. A ball cannot be called out unless you clearly see space between where it lands and the line.
          </p>
        </div>

        {/* Rule sections */}
        <section className="space-y-3">
          <div>
            <p className="text-xs font-black tracking-widest uppercase text-zinc-400">The Code</p>
            <p className="text-xs text-zinc-500 mt-0.5">Tap a section to expand all rules</p>
          </div>
          <div className="space-y-2">
            {SECTIONS.map(s => <SectionCard key={s.id} s={s} />)}
          </div>
        </section>

        {/* Quick dos and don'ts */}
        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Do&apos;s & Don&apos;ts</p>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800 overflow-hidden">
            {[
              { do: true,  text: 'Call the ball good when uncertain' },
              { do: true,  text: 'Reverse out calls if you realize the ball was in' },
              { do: true,  text: 'Call your own shots out if you see them out' },
              { do: true,  text: 'Stop play immediately when claiming a hindrance' },
              { do: false, text: 'Call a let because you didn\'t see the ball' },
              { do: false, text: 'Enlist spectators to make calls' },
              { do: false, text: 'Delay calling a let to see if your shot lands in' },
              { do: false, text: 'Put an obvious fault into play' },
              { do: false, text: 'React visibly after a disputed call' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <span className={`font-black text-sm flex-shrink-0 mt-0.5 ${item.do ? 'text-lime-400' : 'text-red-400'}`}>
                  {item.do ? '✓' : '✗'}
                </span>
                <p className="text-sm text-zinc-400">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
