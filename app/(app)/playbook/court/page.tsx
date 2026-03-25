'use client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CourtReferencePage() {
  return (
    <div className="space-y-6 pb-6">
      <Link href="/playbook" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100">
        <ArrowLeft className="h-4 w-4" /> Playbook
      </Link>

      <div className="space-y-7">

        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Court Diagram</p>
          <CourtDiagram />
        </section>

        {/* Dimensions */}
        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Key Dimensions</p>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800 overflow-hidden">
            {[
              { label: 'Court length', value: '78 ft (23.77 m)' },
              { label: 'Singles width', value: '27 ft (8.23 m)' },
              { label: 'Doubles width', value: '36 ft (10.97 m)' },
              { label: 'Service box depth', value: '21 ft (6.40 m)' },
              { label: 'Alley width', value: '4.5 ft (1.37 m)' },
              { label: 'Net height — center', value: '3 ft (0.914 m)' },
              { label: 'Net height — posts', value: '3.5 ft (1.07 m)' },
            ].map(d => (
              <div key={d.label} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-zinc-400">{d.label}</p>
                <span className="text-sm font-bold text-zinc-100">{d.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Court zones */}
        <section className="space-y-3">
          <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Court Zones</p>
          <div className="space-y-2">
            {[
              { color: 'border-emerald-400/30 bg-emerald-400/[0.06]', dot: 'bg-emerald-400', label: 'Kill Zone', sub: 'Around the service line', tip: 'Finish the point. All attacking-zone rules apply. Volley or put away.' },
              { color: 'border-orange-400/30 bg-orange-400/[0.06]', dot: 'bg-orange-400', label: 'Attack Zone', sub: 'Inside the baseline', tip: 'Court has shortened — keep the ball within 3 ft over the net.' },
              { color: 'border-sky-400/30 bg-sky-400/[0.06]', dot: 'bg-sky-400', label: 'Neutral Zone', sub: 'Behind baseline, comfortable', tip: 'Focus on depth. Hit 3–6 ft over the net with topspin to push opponent back.' },
              { color: 'border-red-400/30 bg-red-400/[0.06]', dot: 'bg-red-400', label: 'Defend Zone', sub: '6+ ft behind the baseline', tip: 'Hit at least 6 ft over the net. Prioritize consistency, depth, and recovery time.' },
            ].map(z => (
              <div key={z.label} className={`rounded-2xl border p-4 ${z.color}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${z.dot}`} />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-zinc-100">{z.label}</p>
                      <p className="text-xs text-zinc-500">{z.sub}</p>
                    </div>
                    <p className="text-sm text-zinc-400">{z.tip}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

// ─── Court Diagram ────────────────────────────────────────────────────────────
// Top-down SVG. Scale: 6.667px/ft (x), 5px/ft (y).
// Full court: 78ft × 36ft. Singles: 27ft wide. Service line: 21ft from net.

function CourtDiagram() {
  const W = 240, H = 390
  const scaleX = W / 36, scaleY = H / 78

  const dblLeft = 0, sglLeft = 4.5, center = 18, sglRight = 31.5, dblRight = 36
  const topBaseline = 0, topServiceLine = 21, net = 39, botServiceLine = 57, botBaseline = 78

  const x = (ft: number) => ft * scaleX
  const y = (ft: number) => ft * scaleY

  const lineStyle = { stroke: '#a1a1aa', strokeWidth: 1.5, fill: 'none' }
  const thinLine  = { stroke: '#71717a',  strokeWidth: 0.75, fill: 'none' }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3">
        <svg viewBox={`-40 -22 ${W + 80} ${H + 44}`} className="w-full" style={{ maxHeight: 500 }}>

          {/* ── Zone fills (singles width) ── */}
          {/* Kill zone */}
          <rect x={x(sglLeft)} y={y(net - 6)}  width={x(sglRight) - x(sglLeft)} height={y(12)}  fill="#16a34a20" />
          {/* Attack zone */}
          <rect x={x(sglLeft)} y={y(topServiceLine)} width={x(sglRight) - x(sglLeft)} height={y(net - 6 - topServiceLine)} fill="#ea580c20" />
          <rect x={x(sglLeft)} y={y(net + 6)}  width={x(sglRight) - x(sglLeft)} height={y(botServiceLine - net - 6)}    fill="#ea580c20" />
          {/* Neutral zone */}
          <rect x={x(sglLeft)} y={y(topBaseline + 10)} width={x(sglRight) - x(sglLeft)} height={y(topServiceLine - 10)} fill="#0284c720" />
          <rect x={x(sglLeft)} y={y(botServiceLine)}   width={x(sglRight) - x(sglLeft)} height={y(botBaseline - 10 - botServiceLine)} fill="#0284c720" />
          {/* Defend zone */}
          <rect x={x(sglLeft)} y={y(topBaseline)} width={x(sglRight) - x(sglLeft)} height={y(10)} fill="#dc262620" />
          <rect x={x(sglLeft)} y={y(botBaseline - 10)} width={x(sglRight) - x(sglLeft)} height={y(10)} fill="#dc262620" />

          {/* Alley fills */}
          <rect x={x(dblLeft)} y={y(topBaseline)} width={x(sglLeft)}            height={y(botBaseline)} fill="#3f3f4618" />
          <rect x={x(sglRight)} y={y(topBaseline)} width={x(dblRight - sglRight)} height={y(botBaseline)} fill="#3f3f4618" />

          {/* ── Court lines ── */}
          <rect x={x(dblLeft)} y={y(topBaseline)} width={x(dblRight)} height={y(botBaseline)} {...lineStyle} />
          <line x1={x(sglLeft)}  y1={y(topBaseline)} x2={x(sglLeft)}  y2={y(botBaseline)} {...thinLine} />
          <line x1={x(sglRight)} y1={y(topBaseline)} x2={x(sglRight)} y2={y(botBaseline)} {...thinLine} />
          <line x1={x(sglLeft)}  y1={y(topServiceLine)} x2={x(sglRight)} y2={y(topServiceLine)} {...lineStyle} />
          <line x1={x(sglLeft)}  y1={y(botServiceLine)} x2={x(sglRight)} y2={y(botServiceLine)} {...lineStyle} />
          <line x1={x(center)} y1={y(topServiceLine)} x2={x(center)} y2={y(botServiceLine)} {...thinLine} />
          {/* Center marks */}
          <line x1={x(center)} y1={y(topBaseline)}  x2={x(center)} y2={y(topBaseline) + 5}  {...thinLine} />
          <line x1={x(center)} y1={y(botBaseline)}  x2={x(center)} y2={y(botBaseline) - 5}  {...thinLine} />

          {/* ── Net ── */}
          <line x1={x(dblLeft) - 6} y1={y(net)} x2={x(dblRight) + 6} y2={y(net)} stroke="#e4e4e7" strokeWidth={2.5} />
          <circle cx={x(dblLeft) - 6}  cy={y(net)} r={2.5} fill="#e4e4e7" />
          <circle cx={x(dblRight) + 6} cy={y(net)} r={2.5} fill="#e4e4e7" />

          {/* ── Deuce / Ad labels — backcourt, just inside each baseline ── */}
          {/* Top backcourt */}
          <text x={x((sglLeft + center) / 2)}  y={y(topBaseline) + 11} fontSize={7.5} fill="#a1a1aa" textAnchor="middle" fontWeight="600">Deuce</text>
          <text x={x((center + sglRight) / 2)} y={y(topBaseline) + 11} fontSize={7.5} fill="#a1a1aa" textAnchor="middle" fontWeight="600">Ad</text>
          {/* Bottom backcourt — sides flip from the other end */}
          <text x={x((sglLeft + center) / 2)}  y={y(botBaseline) - 4}  fontSize={7.5} fill="#a1a1aa" textAnchor="middle" fontWeight="600">Ad</text>
          <text x={x((center + sglRight) / 2)} y={y(botBaseline) - 4}  fontSize={7.5} fill="#a1a1aa" textAnchor="middle" fontWeight="600">Deuce</text>

          {/* ── Service box labels ── */}
          <text x={x((sglLeft + center) / 2)}  y={y((topServiceLine + net) / 2)} fontSize={6.5} fill="#71717a" textAnchor="middle">Service box</text>
          <text x={x((center + sglRight) / 2)} y={y((topServiceLine + net) / 2)} fontSize={6.5} fill="#71717a" textAnchor="middle">Service box</text>
          <text x={x((sglLeft + center) / 2)}  y={y((net + botServiceLine) / 2)} fontSize={6.5} fill="#71717a" textAnchor="middle">Service box</text>
          <text x={x((center + sglRight) / 2)} y={y((net + botServiceLine) / 2)} fontSize={6.5} fill="#71717a" textAnchor="middle">Service box</text>

          {/* ── Zone labels (left margin) ── */}
          <text x={x(dblLeft) - 5} y={y(topBaseline + 5)}                              fontSize={5.5} fill="#f87171" textAnchor="middle">Defend</text>
          <text x={x(dblLeft) - 5} y={y((topBaseline + 10 + topServiceLine) / 2)}      fontSize={5.5} fill="#38bdf8" textAnchor="middle">Neutral</text>
          <text x={x(dblLeft) - 5} y={y((topServiceLine + net - 6) / 2)}               fontSize={5.5} fill="#fb923c" textAnchor="middle">Attack</text>
          <text x={x(dblLeft) - 5} y={y(net)}                                          fontSize={5.5} fill="#4ade80" textAnchor="middle">Kill</text>
          <text x={x(dblLeft) - 5} y={y((net + 6 + botServiceLine) / 2)}               fontSize={5.5} fill="#fb923c" textAnchor="middle">Attack</text>
          <text x={x(dblLeft) - 5} y={y((botServiceLine + botBaseline - 10) / 2)}      fontSize={5.5} fill="#38bdf8" textAnchor="middle">Neutral</text>
          <text x={x(dblLeft) - 5} y={y(botBaseline - 5)}                              fontSize={5.5} fill="#f87171" textAnchor="middle">Defend</text>

          {/* ── Alley labels ── */}
          <text x={x(sglLeft / 2)}             y={y(net)} fontSize={5.5} fill="#71717a" textAnchor="middle">Alley</text>
          <text x={x((sglRight + dblRight) / 2)} y={y(net)} fontSize={5.5} fill="#71717a" textAnchor="middle">Alley</text>

          {/* ── Right margin labels ── */}
          <text x={x(dblRight) + 5} y={y(topBaseline) + 4}    fontSize={5.5} fill="#71717a" textAnchor="start">Baseline</text>
          <text x={x(dblRight) + 5} y={y(botBaseline) + 4}    fontSize={5.5} fill="#71717a" textAnchor="start">Baseline</text>
          <text x={x(dblRight) + 5} y={y(topServiceLine) + 4} fontSize={5.5} fill="#71717a" textAnchor="start">Svc line</text>
          <text x={x(dblRight) + 5} y={y(botServiceLine) + 4} fontSize={5.5} fill="#71717a" textAnchor="start">Svc line</text>

          {/* ── Net height callouts ── */}
          <text x={x(center)}          y={y(net) - 5} fontSize={6.5} fill="#e4e4e7" textAnchor="middle" fontWeight="bold">3 ft</text>
          <text x={x(dblLeft) - 18}    y={y(net) - 5} fontSize={5.5} fill="#a1a1aa" textAnchor="middle">3.5 ft</text>
          <text x={x(dblRight) + 18}   y={y(net) - 5} fontSize={5.5} fill="#a1a1aa" textAnchor="middle">3.5 ft</text>

          {/* ── Title ── */}
          <text x={x(center)} y={y(topBaseline) - 12} fontSize={7.5} fill="#e4e4e7" textAnchor="middle" fontWeight="bold">Tennis Court — Top Down</text>
          <text x={x(center)} y={y(topBaseline) - 4}  fontSize={5.5} fill="#71717a" textAnchor="middle">Singles 27 ft · Doubles 36 ft · Length 78 ft</text>

        </svg>
      </div>

      {/* Zone legend */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { color: 'bg-red-500/20',     label: 'Defend Zone',  sub: '6+ ft behind baseline' },
          { color: 'bg-sky-500/20',     label: 'Neutral Zone', sub: 'Behind baseline, comfortable' },
          { color: 'bg-orange-500/20',  label: 'Attack Zone',  sub: 'Inside baseline' },
          { color: 'bg-emerald-500/20', label: 'Kill Zone',    sub: 'Around the service line' },
        ].map(z => (
          <div key={z.label} className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2">
            <div className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${z.color} ring-1 ring-inset ring-white/10`} />
            <div>
              <p className="text-xs font-bold text-zinc-200">{z.label}</p>
              <p className="text-[10px] text-zinc-500">{z.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
