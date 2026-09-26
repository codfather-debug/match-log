'use client';
import type { Flight } from './flight';
import { f1 } from './geometry';

// Side-on view of the shot: distance along the shot → height. Vertical scale is exaggerated.

const W = 340;
const H = 130;
const PAD = { l: 8, r: 8, t: 14, b: 16 };

export function SideView({
  flight, L, netDist, netH, outAt, clearanceGoal, inColor,
}: {
  flight: Flight;
  L: number;
  netDist: number;
  netH: number;
  outAt: number | null; // distance where it crosses the far line
  clearanceGoal: number | null;
  inColor: string;
}) {
  const maxX = Math.max(L, outAt ?? 0, netDist) + 4;
  const maxY = Math.max(flight.apex, netH + (clearanceGoal ?? 0), 4) * 1.15;
  const px = (x: number) => PAD.l + (x / maxX) * (W - PAD.l - PAD.r);
  const py = (y: number) => H - PAD.b - (y / maxY) * (H - PAD.t - PAD.b);
  const pts = flight.path.map(([x, y]) => `${px(x).toFixed(1)},${py(Math.max(y, 0)).toFixed(1)}`).join(' ');
  const intoNet = flight.clearance < 0;
  const ground = py(0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Side view of the ball's flight over the net">
      <line x1={0} y1={ground} x2={W} y2={ground} stroke="#52525b" strokeWidth={1} />
      {outAt !== null && outAt > netDist && (
        <g>
          <line x1={px(outAt)} y1={ground - 5} x2={px(outAt)} y2={ground + 5} stroke="#a1a1aa" strokeWidth={1.5} />
          <text x={px(outAt)} y={ground + 13} fontSize={9} fill="#71717a" textAnchor="middle">line</text>
        </g>
      )}
      {clearanceGoal !== null && (
        <line
          x1={px(netDist) - 18} x2={px(netDist) + 18}
          y1={py(netH + clearanceGoal)} y2={py(netH + clearanceGoal)}
          stroke="#38bdf8" strokeWidth={1} strokeDasharray="3 2"
        />
      )}
      <line x1={px(netDist)} y1={ground} x2={px(netDist)} y2={py(netH)} stroke="#f4f4f5" strokeWidth={2.5} />
      <polyline points={pts} fill="none" stroke={intoNet ? '#f87171' : inColor} strokeWidth={2} strokeLinejoin="round" />
      <circle cx={px(0)} cy={py(flight.path[0]?.[1] ?? 0)} r={3.5} fill="#d9f99d" />
      <circle cx={px(L)} cy={ground} r={3} fill={inColor} />
      {flight.heightAtNet >= 0 && (
        <text x={px(netDist)} y={Math.max(py(flight.heightAtNet) - 6, 10)} fontSize={10} fontWeight="bold" fill={intoNet ? '#f87171' : '#fafafa'} textAnchor="middle">
          {intoNet ? 'into the net' : `+${f1(flight.clearance)} ft`}
        </text>
      )}
      <text x={px(netDist)} y={ground + 13} fontSize={9} fill="#71717a" textAnchor="middle">net</text>
    </svg>
  );
}
