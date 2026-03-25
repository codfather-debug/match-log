'use client';
import Link from 'next/link';

const BOOKS = [
  {
    href: '/playbook/singles',
    icon: '🎾',
    title: 'Singles Playbook',
    sub: '8 strategies · patterns · court zones',
    accent: 'border-lime-400/20 hover:border-lime-400/40',
    badge: 'text-lime-400',
  },
  {
    href: '/playbook/doubles',
    icon: '👥',
    title: 'Doubles Playbook',
    sub: 'Roles · formations · communication',
    accent: 'border-sky-400/20 hover:border-sky-400/40',
    badge: 'text-sky-400',
  },
  {
    href: '/playbook/mental',
    icon: '🧠',
    title: 'Mental Toughness',
    sub: 'Routines · focus · momentum',
    accent: 'border-amber-400/20 hover:border-amber-400/40',
    badge: 'text-amber-400',
  },
  {
    href: '/playbook/return',
    icon: '↩️',
    title: 'Return Game',
    sub: 'Positioning · patterns · reading serves',
    accent: 'border-sky-400/20 hover:border-sky-400/40',
    badge: 'text-sky-300',
  },
  {
    href: '/playbook/warmup',
    icon: '🔥',
    title: 'Warm-Up Routine',
    sub: '10-min protocol · dynamic prep · mental checklist',
    accent: 'border-orange-400/20 hover:border-orange-400/40',
    badge: 'text-orange-400',
  },
  {
    href: '/playbook/scoring',
    icon: '📊',
    title: 'Match Scoring',
    sub: 'Ad scoring · tiebreaks · pro-set',
    accent: 'border-red-400/20 hover:border-red-400/40',
    badge: 'text-red-400',
  },
  {
    href: '/playbook/rules',
    icon: '📋',
    title: 'Rules & The Code',
    sub: 'Line calls · serving · hindrance',
    accent: 'border-zinc-800 hover:border-zinc-700',
    badge: 'text-zinc-300',
  },
];

export default function PlaybookIndexPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-100">Playbook</h1>

      <div className="space-y-3">
        {BOOKS.map(b => (
          <Link
            key={b.href}
            href={b.href}
            className={`flex items-center gap-4 rounded-2xl border bg-zinc-900/50 p-5 transition-all active:scale-[0.98] ${b.accent}`}
          >
            <span className="text-4xl flex-shrink-0">{b.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-base font-black ${b.badge}`}>{b.title}</p>
              <p className="text-sm text-zinc-400 mt-0.5">{b.sub}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-zinc-500 flex-shrink-0">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
