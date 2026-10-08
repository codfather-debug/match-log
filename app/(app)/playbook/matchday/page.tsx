'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LevelBadge } from '../KeyPoints';

// ─── Data ────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    id: 'before',
    icon: '🔥',
    title: 'Before the match',
    color: 'text-orange-300',
    items: [
      'Dynamic warm-up: leg swings, arm circles, high knees, shuffles',
      'Rally soft, then build to match pace',
      'Hit a few serves — pick your 1st-serve target for game 1',
      'Pick your return target (deep down the middle)',
      'Pick a focus word (like "deep," "feet," or "breathe")',
    ],
    link: { label: 'Warm-Up Routine', href: '/playbook/warmup' },
  },
  {
    id: 'plan',
    icon: '🎯',
    title: 'My game plan',
    color: 'text-lime-400',
    items: [
      'Get my 1st serve in — aim for the middle of the box',
      'Rally high, deep, and cross-court',
      'Hit to their weaker side',
      'Attack only short balls',
    ],
    link: { label: 'Singles Playbook', href: '/playbook/singles' },
  },
  {
    id: 'between',
    icon: '🔁',
    title: 'Between every point',
    color: 'text-sky-400',
    items: [
      'React — one quick reaction, then let it go',
      'Release — turn around, breathe out',
      'Reset — bounce the ball, pick a target',
      'Ready — split step, eyes up',
    ],
    link: { label: 'Mental Toughness', href: '/playbook/mental' },
  },
  {
    id: 'changeover',
    icon: '🧭',
    title: 'Every changeover',
    color: 'text-amber-400',
    items: [
      'Score check: winning → keep it. Losing → change ONE thing',
      'What\'s working? What isn\'t?',
      'Drink water and breathe',
    ],
    link: { label: 'In-Match Troubleshooting', href: '/playbook/troubleshoot' },
  },
  {
    id: 'after',
    icon: '📝',
    title: 'After the match',
    color: 'text-zinc-300',
    items: [
      'Shake hands and thank your opponent',
      'Name 1 thing I did well',
      'Name 1 thing to practice this week',
    ],
    link: null,
  },
];

const PLAN_35 = 'Add: use The 2-1 or Backhand Cage, step in on weak 2nd serves, and come forward on short balls.';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MatchDayPage() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<string>('before');

  const toggle = (key: string) => setDone(d => ({ ...d, [key]: !d[key] }));
  const countDone = (id: string, n: number) =>
    Array.from({ length: n }, (_, i) => done[`${id}-${i}`]).filter(Boolean).length;

  return (
    <div className="space-y-6 pb-6">

      <Link href="/playbook" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 mb-2">
        <ArrowLeft className="h-4 w-4" /> Playbook
      </Link>

      <div className="space-y-2">
        <h1 className="text-xl font-black text-zinc-100">Match Day</h1>
        <p className="text-sm text-zinc-400">Everything you need, in order. Tap a step, check things off.</p>
      </div>

      <div className="space-y-2">
        {STEPS.map((s, idx) => {
          const isOpen = open === s.id;
          const n = countDone(s.id, s.items.length);
          const complete = n === s.items.length;
          return (
            <div key={s.id}
              className={`rounded-2xl border transition-all ${isOpen ? 'border-zinc-700 bg-zinc-900/70' : 'border-zinc-800 bg-zinc-900/50'}`}>
              <button
                onClick={() => setOpen(isOpen ? '' : s.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-black text-zinc-300">
                  {complete ? '✓' : idx + 1}
                </span>
                <span className="text-xl flex-shrink-0">{s.icon}</span>
                <span className={`flex-1 text-sm font-black ${s.color}`}>{s.title}</span>
                <span className="text-xs font-bold text-zinc-500">{n}/{s.items.length}</span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-2 border-t border-zinc-800 pt-3">
                  {s.items.map((it, i) => {
                    const key = `${s.id}-${i}`;
                    return (
                      <button key={key} onClick={() => toggle(key)}
                        className="w-full flex items-start gap-3 rounded-xl px-2 py-2 text-left hover:bg-zinc-800/50">
                        <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border text-[11px] font-black ${done[key] ? 'border-lime-400 bg-lime-400 text-black' : 'border-zinc-600 text-transparent'}`}>
                          ✓
                        </span>
                        <span className={`text-sm ${done[key] ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>{it}</span>
                      </button>
                    );
                  })}
                  {s.id === 'plan' && (
                    <div className="flex items-start gap-2 px-2 pt-1">
                      <LevelBadge level="3.5" />
                      <p className="text-xs text-zinc-400">{PLAN_35}</p>
                    </div>
                  )}
                  {s.link && (
                    <Link href={s.link.href}
                      className="inline-block mt-1 rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:border-zinc-500 hover:text-zinc-100">
                      More in {s.link.label} →
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-lime-400/20 bg-lime-400/[0.04] px-4 py-4 text-center">
        <p className="text-base font-black text-zinc-100">Make one more ball than they do.</p>
        <p className="text-xs text-zinc-400 mt-1">That wins more matches at your level than any big shot.</p>
      </div>

    </div>
  );
}
