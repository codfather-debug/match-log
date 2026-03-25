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
  { situation: '6–6 in regular set',                call: '7-pt Tiebreak' },
  { situation: '8–8 in pro-set',                    call: '7-pt Tiebreak' },
  { situation: 'Tied in sets (most formats)',        call: 'Super Tiebreak' },
];

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

        {/* Court Diagram */}
        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Court Reference</p>
          <CourtDiagram />
        </section>

      </div>
    </div>
  );
}

function tieBreakRows(view: 'singles' | 'doubles') {
  return TIEBREAK_SERVING[view];
}

// ─── Court Diagram ────────────────────────────────────────────────────────────
// Top-down SVG. All measurements in feet scaled at 5px/ft.
// Full court: 78ft × 36ft. Singles width: 27ft. Service line: 21ft from net.
// Net at y=195 (center). Court origin top-left.

function CourtDiagram() {
  // SVG coordinate space (px): width=240, height=390 (78ft × 5, 36ft → 240 scaled to fit)
  // Scale: x = 240/36 = 6.667px/ft, y = 390/78 = 5px/ft
  const W = 240, H = 390
  const scaleX = W / 36, scaleY = H / 78

  // Key x positions (feet from left doubles sideline)
  const dblLeft = 0
  const sglLeft = 4.5  // alley width
  const center = 18
  const sglRight = 31.5
  const dblRight = 36

  const x = (ft: number) => ft * scaleX
  const y = (ft: number) => ft * scaleY

  // Key y positions (feet from top baseline)
  const topBaseline = 0
  const topServiceLine = 21
  const net = 39
  const botServiceLine = 57
  const botBaseline = 78

  // Court zone colors (subtle fills)
  const zones = [
    // Kill zone: within ~6ft of net on each side
    { y1: net - 6, y2: net + 6, color: '#16a34a22', label: null },
    // Attack zone: service line area
    { y1: topServiceLine, y2: net - 6, color: '#d9770622', label: null },
    { y1: net + 6, y2: botServiceLine, color: '#d9770622', label: null },
    // Neutral zone: between service line and ~10ft behind
    { y1: topBaseline + 10, y2: topServiceLine, color: '#0284c722', label: null },
    { y1: botServiceLine, y2: botBaseline - 10, color: '#0284c722', label: null },
    // Defend zone: deep behind baseline
    { y1: topBaseline, y2: topBaseline + 10, color: '#dc262622', label: null },
    { y1: botBaseline - 10, y2: botBaseline, color: '#dc262622', label: null },
  ]

  const lineStyle = { stroke: '#a1a1aa', strokeWidth: 1.5, fill: 'none' }
  const thinLine = { stroke: '#71717a', strokeWidth: 0.75, fill: 'none' }
  const labelStyle = { fontSize: 7, fill: '#a1a1aa', textAnchor: 'middle' as const }
  const smallLabel = { fontSize: 6, fill: '#71717a', textAnchor: 'middle' as const }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3">
        <svg viewBox={`-36 -20 ${W + 72} ${H + 40}`} className="w-full" style={{ maxHeight: 480 }}>

          {/* Zone fills (singles width only) */}
          {zones.map((z, i) => (
            <rect key={i}
              x={x(sglLeft)} y={y(z.y1)}
              width={x(sglRight) - x(sglLeft)} height={y(z.y2) - y(z.y1)}
              fill={z.color}
            />
          ))}

          {/* Alley fills */}
          <rect x={x(dblLeft)} y={y(topBaseline)} width={x(sglLeft) - x(dblLeft)} height={y(botBaseline)} fill="#3f3f4622" />
          <rect x={x(sglRight)} y={y(topBaseline)} width={x(dblRight) - x(sglRight)} height={y(botBaseline)} fill="#3f3f4622" />

          {/* Outer doubles court */}
          <rect x={x(dblLeft)} y={y(topBaseline)} width={x(dblRight)} height={y(botBaseline)} {...lineStyle} />

          {/* Singles sidelines */}
          <line x1={x(sglLeft)} y1={y(topBaseline)} x2={x(sglLeft)} y2={y(botBaseline)} {...thinLine} />
          <line x1={x(sglRight)} y1={y(topBaseline)} x2={x(sglRight)} y2={y(botBaseline)} {...thinLine} />

          {/* Service lines */}
          <line x1={x(sglLeft)} y1={y(topServiceLine)} x2={x(sglRight)} y2={y(topServiceLine)} {...lineStyle} />
          <line x1={x(sglLeft)} y1={y(botServiceLine)} x2={x(sglRight)} y2={y(botServiceLine)} {...lineStyle} />

          {/* Center service line */}
          <line x1={x(center)} y1={y(topServiceLine)} x2={x(center)} y2={y(botServiceLine)} {...thinLine} />

          {/* Center mark (baseline) */}
          <line x1={x(center)} y1={y(topBaseline)} x2={x(center)} y2={y(topBaseline) + 5} {...thinLine} />
          <line x1={x(center)} y1={y(botBaseline)} x2={x(center)} y2={y(botBaseline) - 5} {...thinLine} />

          {/* Net */}
          <line x1={x(dblLeft) - 6} y1={y(net)} x2={x(dblRight) + 6} y2={y(net)} stroke="#e4e4e7" strokeWidth={2.5} />
          {/* Net posts */}
          <circle cx={x(dblLeft) - 6} cy={y(net)} r={2.5} fill="#e4e4e7" />
          <circle cx={x(dblRight) + 6} cy={y(net)} r={2.5} fill="#e4e4e7" />

          {/* ── Zone labels (left margin) ── */}
          {/* Defend */}
          <text x={x(dblLeft) - 4} y={y(topBaseline + 5)} {...smallLabel} fill="#f87171">Defend</text>
          {/* Neutral */}
          <text x={x(dblLeft) - 4} y={y((topBaseline + 10 + topServiceLine) / 2)} {...smallLabel} fill="#38bdf8">Neutral</text>
          {/* Attack */}
          <text x={x(dblLeft) - 4} y={y((topServiceLine + net - 6) / 2)} {...smallLabel} fill="#fb923c">Attack</text>
          {/* Kill */}
          <text x={x(dblLeft) - 4} y={y(net)} {...smallLabel} fill="#4ade80">Kill</text>
          {/* Attack bottom */}
          <text x={x(dblLeft) - 4} y={y((net + 6 + botServiceLine) / 2)} {...smallLabel} fill="#fb923c">Attack</text>
          {/* Neutral bottom */}
          <text x={x(dblLeft) - 4} y={y((botServiceLine + botBaseline - 10) / 2)} {...smallLabel} fill="#38bdf8">Neutral</text>
          {/* Defend bottom */}
          <text x={x(dblLeft) - 4} y={y(botBaseline - 5)} {...smallLabel} fill="#f87171">Defend</text>

          {/* ── Court area labels ── */}
          {/* Deuce service box */}
          <text x={x((sglLeft + center) / 2)} y={y((topServiceLine + net) / 2)} {...labelStyle}>Deuce</text>
          {/* Ad service box */}
          <text x={x((center + sglRight) / 2)} y={y((topServiceLine + net) / 2)} {...labelStyle}>Ad</text>
          {/* Deuce service box bottom */}
          <text x={x((sglLeft + center) / 2)} y={y((net + botServiceLine) / 2)} {...labelStyle}>Deuce</text>
          {/* Ad service box bottom */}
          <text x={x((center + sglRight) / 2)} y={y((net + botServiceLine) / 2)} {...labelStyle}>Ad</text>

          {/* Alley labels */}
          <text x={x(sglLeft / 2)} y={y(net)} {...smallLabel} fill="#a1a1aa">Alley</text>
          <text x={x((sglRight + dblRight) / 2)} y={y(net)} {...smallLabel} fill="#a1a1aa">Alley</text>

          {/* ── Dimension labels (right margin) ── */}
          {/* Baseline label */}
          <text x={x(dblRight) + 6} y={y(topBaseline) + 4} fontSize={6} fill="#71717a" textAnchor="start">Baseline</text>
          <text x={x(dblRight) + 6} y={y(botBaseline) + 4} fontSize={6} fill="#71717a" textAnchor="start">Baseline</text>
          {/* Service line */}
          <text x={x(dblRight) + 6} y={y(topServiceLine) + 4} fontSize={6} fill="#71717a" textAnchor="start">Svc line</text>
          <text x={x(dblRight) + 6} y={y(botServiceLine) + 4} fontSize={6} fill="#71717a" textAnchor="start">Svc line</text>

          {/* ── Net height callouts ── */}
          {/* Center: 3ft */}
          <text x={x(center)} y={y(net) - 5} fontSize={6.5} fill="#e4e4e7" textAnchor="middle" fontWeight="bold">3 ft</text>
          {/* Posts: 3.5ft */}
          <text x={x(dblLeft) - 16} y={y(net) - 5} fontSize={6} fill="#a1a1aa" textAnchor="middle">3.5 ft</text>
          <text x={x(dblRight) + 16} y={y(net) - 5} fontSize={6} fill="#a1a1aa" textAnchor="middle">3.5 ft</text>

          {/* ── Top labels ── */}
          <text x={x(center)} y={y(topBaseline) - 10} fontSize={7} fill="#e4e4e7" textAnchor="middle" fontWeight="bold">Tennis Court</text>
          <text x={x(center)} y={y(topBaseline) - 2} fontSize={5.5} fill="#71717a" textAnchor="middle">Singles: 27 ft wide · Doubles: 36 ft wide · 78 ft long</text>

        </svg>
      </div>

      {/* Zone legend */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { color: 'bg-red-500/20', label: 'Defend Zone', sub: '6+ ft behind baseline' },
          { color: 'bg-sky-500/20', label: 'Neutral Zone', sub: 'Behind baseline, comfortable' },
          { color: 'bg-orange-500/20', label: 'Attack Zone', sub: 'Inside baseline' },
          { color: 'bg-emerald-500/20', label: 'Kill Zone', sub: 'Around the service line' },
        ].map(z => (
          <div key={z.label} className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${z.color} border border-current`} />
            <div>
              <p className="text-xs font-bold text-zinc-200">{z.label}</p>
              <p className="text-[10px] text-zinc-500">{z.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
