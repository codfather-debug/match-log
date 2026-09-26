// ─── Side view: ball flight over the net ──────────────────────────────────────
// 2-D flight along the shot line with gravity, air drag and topspin (Magnus) lift.
// Given the shot length, speed and spin, we solve for the launch angle that lands the
// ball at the chosen spot, then read off how high it is when it crosses the net.

export type Spin = 'flat' | 'topspin' | 'heavy';

const FT = 0.3048;
const MPH = 0.44704;
const G = 9.81;
const RHO = 1.2;
const AREA = Math.PI * 0.0335 ** 2; // tennis ball, 6.7 cm diameter
const MASS = 0.057;
const CD = 0.55;
const CL: Record<Spin, number> = { flat: 0, topspin: 0.15, heavy: 0.28 };
const K = (0.5 * RHO * AREA) / MASS;
const DT = 0.004;

export const SPINS: { v: Spin; label: string }[] = [
  { v: 'flat', label: 'Flat' },
  { v: 'topspin', label: 'Topspin' },
  { v: 'heavy', label: 'Heavy' },
];

/** Integrates one flight (SI units). Returns where it lands and, optionally, the sampled path. */
function fly(v0: number, angle: number, h0: number, spin: Spin, keepPath: boolean) {
  let x = 0, y = h0;
  let vx = v0 * Math.cos(angle), vy = v0 * Math.sin(angle);
  const kd = K * CD, kl = K * CL[spin];
  const path: [number, number][] = keepPath ? [[0, h0]] : [];
  let apex = h0;
  for (let i = 0; i < 1500; i++) {
    const v = Math.hypot(vx, vy);
    // drag opposes velocity; topspin lift is perpendicular to velocity, pointing down
    const ax = -kd * v * vx + kl * v * vy;
    const ay = -G - kd * v * vy - kl * v * vx;
    const nx = x + vx * DT, ny = y + vy * DT;
    vx += ax * DT;
    vy += ay * DT;
    if (ny <= 0) {
      const f = y / (y - ny);
      const xl = x + (nx - x) * f;
      if (keepPath) path.push([xl, 0]);
      return { xLand: xl, path, apex, time: (i + f) * DT, vLand: Math.hypot(vx, vy) };
    }
    x = nx;
    y = ny;
    apex = Math.max(apex, y);
    if (keepPath && i % 4 === 0) path.push([x, y]);
  }
  return { xLand: x, path, apex, time: 1500 * DT, vLand: Math.hypot(vx, vy) };
}

export type Flight = {
  ok: 'ok' | 'tooShort' | 'tooFast';
  launchDeg: number;
  path: [number, number][]; // feet: [distance along the shot, height]
  apex: number;
  clearance: number; // ft above the net where it crosses (negative = into the net)
  heightAtNet: number;
  time: number;
  landMph: number;
};

/**
 * @param L       shot length along the ground, ft
 * @param netDist distance from contact to the net along the shot, ft
 * @param netH    net height where the shot crosses, ft
 */
export function solveFlight(L: number, mph: number, contactFt: number, spin: Spin, netDist: number, netH: number): Flight {
  const target = L * FT;
  const v0 = mph * MPH;
  const h0 = contactFt * FT;
  const land = (a: number) => fly(v0, a, h0, spin, false).xLand;

  const lo = (-20 * Math.PI) / 180;
  let best = lo, bestX = -Infinity;
  for (let d = -20; d <= 45; d += 1) {
    const a = (d * Math.PI) / 180;
    const xl = land(a);
    if (xl > bestX) { bestX = xl; best = a; }
  }

  let angle: number;
  let ok: Flight['ok'] = 'ok';
  if (bestX < target) {
    angle = best;
    ok = 'tooShort';
  } else if (land(lo) > target) {
    angle = lo;
    ok = 'tooFast';
  } else {
    let a0 = lo, a1 = best;
    for (let i = 0; i < 28; i++) {
      const m = (a0 + a1) / 2;
      if (land(m) < target) a0 = m;
      else a1 = m;
    }
    angle = (a0 + a1) / 2;
  }

  const f = fly(v0, angle, h0, spin, true);
  const path = f.path.map(([x, y]) => [x / FT, y / FT] as [number, number]);
  let heightAtNet = -1;
  for (let i = 1; i < path.length; i++) {
    if (path[i][0] >= netDist) {
      const [x0, y0] = path[i - 1];
      const [x1, y1] = path[i];
      heightAtNet = y0 + ((y1 - y0) * (netDist - x0)) / (x1 - x0 || 1);
      break;
    }
  }
  return {
    ok,
    launchDeg: (angle * 180) / Math.PI,
    path,
    apex: f.apex / FT,
    clearance: heightAtNet - netH,
    heightAtNet,
    time: f.time,
    landMph: f.vLand / MPH,
  };
}
