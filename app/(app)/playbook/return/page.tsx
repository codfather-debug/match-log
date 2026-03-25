'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const RETURN_PATTERNS = [
  {
    title: 'Down the Middle',
    desc: 'Safe, high-percentage return. Neutralizes serve angles, limits opponent\'s attack options. Best on 1st serve.',
    cue: 'Aim 3 feet over net, bisect the court',
    use: 'When under pressure or returning big serves',
  },
  {
    title: 'Cross-Court Angle',
    desc: 'Opens the court and pulls opponent wide. Use on 2nd serve when you have time to set up.',
    cue: 'Step in, hit early, aim inside-out',
    use: '2nd serve → attack wide',
  },
  {
    title: 'Down the Line',
    desc: 'Catches opponent flat-footed when they shade cross-court. High risk, high reward.',
    cue: 'Short backswing, contact in front',
    use: 'When opponent predictably charges net',
  },
  {
    title: 'Chip & Charge',
    desc: 'Block the return low at opponent\'s feet, immediately follow to net. Disrupts rhythm on slow serves.',
    cue: 'Slice low → sprint → volley',
    use: 'On weak 2nd serves, slow clay',
  },
];

const READING_CUES = [
  { icon: '👀', label: 'Toss position',   tip: 'Toss over right shoulder = wide to deuce side / down-T to ad side' },
  { icon: '🦶', label: 'Foot position',   tip: 'Server stepping in → net rusher coming. Prepare a low return.' },
  { icon: '🎾', label: 'Ball toss height',tip: 'Low toss = kick or slice. High toss = flat bomb. Adjust stance early.' },
  { icon: '↕️', label: 'Shoulder turn',   tip: 'Early shoulder rotation = fast flat serve. Late = spin or placement.' },
];

const POSITIONS = [
  {
    label: 'Flat / Big Serve',
    desc: 'Stand 1–2 feet behind baseline. Give yourself reaction time. Compact backswing, redirect pace.',
    emoji: '💨',
  },
  {
    label: 'Slice / Kick Serve',
    desc: 'Move inside the baseline after the toss. Attack the ball before it climbs too high. Step in.',
    emoji: '🌀',
  },
  {
    label: 'Slow / Weak 2nd',
    desc: 'Step well inside baseline. Take it early, hit on the rise. Dictate with pace or angle immediately.',
    emoji: '⚡',
  },
];

function PatternCard({ pattern, idx }: { pattern: typeof RETURN_PATTERNS[0]; idx: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-lime-400/10 text-lime-400 text-xs font-black flex items-center justify-center">{idx + 1}</span>
          <span className="text-sm font-bold text-zinc-100">{pattern.title}</span>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={`text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-zinc-800 pt-3">
          <p className="text-sm text-zinc-300 leading-relaxed">{pattern.desc}</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="rounded-xl bg-zinc-800 px-3 py-2">
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Cue</p>
              <p className="text-xs text-zinc-300">{pattern.cue}</p>
            </div>
            <div className="rounded-xl bg-zinc-800 px-3 py-2">
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Use When</p>
              <p className="text-xs text-zinc-300">{pattern.use}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReturnPlaybookPage() {
  return (
    <div className="space-y-6 pb-6">

      <Link href="/playbook" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 mb-2">
        <ArrowLeft className="h-4 w-4" /> Playbook
      </Link>

      <div className="space-y-6">
        {/* Hero */}
        <div className="rounded-3xl border border-sky-400/20 bg-gradient-to-br from-sky-400/15 to-sky-400/5 p-6">
          <p className="text-xs font-black tracking-widest uppercase text-sky-400 mb-1">Return Game</p>
          <h1 className="text-2xl font-black text-zinc-100">Win the Return</h1>
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
            The return is the second most important shot in tennis. A solid return game shifts pressure back to the server immediately.
          </p>
          <div className="mt-4 flex gap-2">
            <div className="flex-1 rounded-2xl bg-zinc-800 px-3 py-2 text-center">
              <p className="text-xs text-zinc-400 font-bold">Key Stat</p>
              <p className="text-sm font-black text-sky-400">50%+</p>
              <p className="text-[10px] text-zinc-400">of points start on return</p>
            </div>
            <div className="flex-1 rounded-2xl bg-zinc-800 px-3 py-2 text-center">
              <p className="text-xs text-zinc-400 font-bold">Goal</p>
              <p className="text-sm font-black text-sky-400">In Play</p>
              <p className="text-[10px] text-zinc-400">on 1st serve return</p>
            </div>
            <div className="flex-1 rounded-2xl bg-zinc-800 px-3 py-2 text-center">
              <p className="text-xs text-zinc-400 font-bold">Mindset</p>
              <p className="text-sm font-black text-sky-400">Neutralize</p>
              <p className="text-[10px] text-zinc-400">then take control</p>
            </div>
          </div>
        </div>

        {/* Reading the Serve */}
        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Reading the Serve</p>
          <div className="space-y-2">
            {READING_CUES.map(cue => (
              <div key={cue.label} className="flex gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                <span className="text-lg flex-shrink-0">{cue.icon}</span>
                <div>
                  <p className="text-xs font-black text-zinc-400 mb-0.5">{cue.label}</p>
                  <p className="text-sm text-zinc-300 leading-snug">{cue.tip}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Return Positioning */}
        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Return Positioning</p>
          <div className="space-y-2">
            {POSITIONS.map(pos => (
              <div key={pos.label} className="flex gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                <span className="text-xl flex-shrink-0">{pos.emoji}</span>
                <div>
                  <p className="text-xs font-black text-zinc-400 mb-0.5">{pos.label}</p>
                  <p className="text-sm text-zinc-300 leading-snug">{pos.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 1st Serve Return */}
        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">1st Serve Return</p>
          <div className="rounded-2xl border border-blue-400/20 bg-blue-400/[0.04] p-4 space-y-2">
            <p className="text-sm font-black text-blue-300">Defensive Priority — Get It In</p>
            <ul className="space-y-1.5">
              {[
                'Compact swing — no big backswing on fast serves',
                'Aim cross-court and deep (biggest margin)',
                'Redirect pace rather than adding your own',
                'Goal: start the rally, not win the point',
                'Split step as server\'s racket meets ball',
              ].map(t => (
                <li key={t} className="flex gap-2 text-sm text-zinc-300">
                  <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 2nd Serve Return */}
        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">2nd Serve Return</p>
          <div className="rounded-2xl border border-lime-400/20 bg-lime-400/[0.04] p-4 space-y-2">
            <p className="text-sm font-black text-lime-400">Offensive Opportunity — Take Control</p>
            <ul className="space-y-1.5">
              {[
                'Step inside the baseline — take it on the rise',
                'Go for angles or drive it deep cross-court',
                'Attack the weaker side consistently',
                'Consider chip & charge on very slow serves',
                'Make server feel the pressure of every 2nd serve',
              ].map(t => (
                <li key={t} className="flex gap-2 text-sm text-zinc-300">
                  <span className="text-lime-400 mt-0.5 flex-shrink-0">•</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Return Patterns */}
        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Return Patterns</p>
          <div className="space-y-2">
            {RETURN_PATTERNS.map((p, i) => (
              <PatternCard key={p.title} pattern={p} idx={i} />
            ))}
          </div>
        </section>

        {/* Mental Approach */}
        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Mental Approach</p>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-4 space-y-3">
            <div>
              <p className="text-xs font-black text-amber-400 mb-1">Pre-Return Routine</p>
              <p className="text-sm text-zinc-300 leading-relaxed">Between serves: bounce on your toes, pick a target, commit before the toss. Decision before the ball is hit.</p>
            </div>
            <div>
              <p className="text-xs font-black text-amber-400 mb-1">After an Ace</p>
              <p className="text-sm text-zinc-300 leading-relaxed">Reset immediately. Aces are noise — stay ready for the next return. One point at a time.</p>
            </div>
            <div>
              <p className="text-xs font-black text-amber-400 mb-1">Return Game Focus Word</p>
              <p className="text-sm text-zinc-300 leading-relaxed">Pick one: <span className="text-zinc-100 font-bold">&quot;Ready&quot;</span> · <span className="text-zinc-100 font-bold">&quot;Attack&quot;</span> · <span className="text-zinc-100 font-bold">&quot;In play&quot;</span>. Repeat it as the server bounces the ball.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
