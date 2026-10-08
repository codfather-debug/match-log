'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// ─── Data ────────────────────────────────────────────────────────────────────

const TERMS: { term: string; def: string }[] = [
  { term: 'Ad court', def: 'The left side of the court (as you face the net). You serve or return here when the score is odd, like 15–0 or 30–15.' },
  { term: 'Ad-In / Ad-Out', def: 'After Deuce: Ad-In means the server won the next point. Ad-Out means the receiver won it.' },
  { term: 'Alley', def: 'The 4.5-ft strips on each side of the court. In for doubles, out for singles.' },
  { term: 'Approach shot', def: 'A shot you hit from inside the court and then follow to the net.' },
  { term: 'Break / Break point', def: 'Winning a game when the other player is serving. A break point is a point that would win that game.' },
  { term: 'Changeover', def: 'When players switch ends — after odd games (1, 3, 5…). A short break to drink and reset.' },
  { term: 'Chip', def: 'A short, low slice shot, often on a return.' },
  { term: 'Consistency', def: 'Getting the ball in, over and over. The #1 skill at the 3.0–3.5 level.' },
  { term: 'Cross-court', def: 'Hitting diagonally across the court. Longest shot, lowest part of the net — the safest choice.' },
  { term: 'Deciding point', def: 'In No-Ad scoring, the one point played at 40–40 that decides the game. The receiver picks the side.' },
  { term: 'Deuce', def: 'When the score is 40–40 in ad scoring.' },
  { term: 'Deuce court', def: 'The right side of the court (as you face the net). Every game starts here.' },
  { term: 'Double fault', def: 'Missing both serves. You lose the point.' },
  { term: 'Down the line', def: 'Hitting straight ahead along the sideline. Shorter and over a higher net — riskier.' },
  { term: 'Drop shot', def: 'A soft shot that lands just over the net, to make your opponent run forward.' },
  { term: 'First strike', def: 'Winning the point in the first few shots, usually with the serve or return.' },
  { term: 'Flat serve', def: 'A hard serve with little spin. Fast, but harder to get in.' },
  { term: 'Foot fault', def: 'Touching the baseline (or the court) with your foot before you hit the serve.' },
  { term: 'Groundstroke', def: 'A forehand or backhand hit after the ball bounces.' },
  { term: 'Hold (serve)', def: 'Winning a game when you are serving.' },
  { term: 'Inside-out', def: 'Running around your backhand to hit a forehand toward the other player\'s backhand.' },
  { term: 'Kick serve', def: 'A spin serve that bounces high. Advanced — most 3.0 players use a slice or a safe spin serve instead.' },
  { term: 'Kill zone', def: 'The area near the service line or net where you should finish the point.' },
  { term: 'Let', def: 'A serve that clips the net and lands in — replay that serve. Also any point that is replayed.' },
  { term: 'Lob', def: 'A high shot over an opponent who is at the net.' },
  { term: 'Love', def: 'Zero. "15–Love" means the server has 15 and the receiver has 0.' },
  { term: 'Moonball', def: 'A very high, slow, loopy shot. Players who hit lots of these are sometimes called pushers.' },
  { term: 'Net clearance', def: 'How high the ball goes over the net. More net clearance = fewer net errors and deeper shots.' },
  { term: 'No-Ad', def: 'Scoring where 40–40 is decided by one point instead of win-by-2.' },
  { term: 'On the rise', def: 'Hitting the ball early, right after it bounces, before it reaches its highest point.' },
  { term: 'Overhead', def: 'A smash: hitting a high ball above your head, like a serve.' },
  { term: 'Passing shot', def: 'A shot that goes past an opponent who is at the net.' },
  { term: 'Poach', def: 'In doubles, when the net player moves across to cut off a ball meant for their partner.' },
  { term: 'Pro-set', def: 'One long set to 8 games instead of best-of-3 sets.' },
  { term: 'Pusher', def: 'A player who gets everything back with slow, safe shots and waits for you to miss.' },
  { term: 'Recovery', def: 'Moving back to a good spot (usually the middle) right after you hit.' },
  { term: 'Serve + 1', def: 'The serve and your very next shot, planned together as one pattern.' },
  { term: 'Slice', def: 'Backspin. The ball stays low and floats. Good for defense and low shots.' },
  { term: 'Split step', def: 'A small hop just as your opponent hits, so you can push off fast in any direction.' },
  { term: 'Super tiebreak', def: 'A first-to-10 (win by 2) tiebreak played instead of a full third set.' },
  { term: 'T', def: 'Where the center service line meets the service line. A serve "down the T" goes to the middle.' },
  { term: 'Tiebreak', def: 'At 6–6 (or 8–8 in a pro-set): first to 7 points, win by 2.' },
  { term: 'Tilt', def: 'When frustration or anger starts hurting how you play.' },
  { term: 'Topspin', def: 'Forward spin. Makes the ball dip down into the court — so you can hit higher over the net and still land in.' },
  { term: 'Unforced error', def: 'A miss on a ball you should have made. The most common way points end at 3.0–3.5.' },
  { term: 'Up & back', def: 'Doubles formation with one player at the net and one at the baseline. The normal starting setup.' },
  { term: 'Volley', def: 'Hitting the ball before it bounces, usually near the net.' },
  { term: 'Winner', def: 'A shot the opponent can\'t touch.' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GlossaryPage() {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const shown = query
    ? TERMS.filter(t => t.term.toLowerCase().includes(query) || t.def.toLowerCase().includes(query))
    : TERMS;

  return (
    <div className="space-y-6 pb-6">

      <Link href="/playbook" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 mb-2">
        <ArrowLeft className="h-4 w-4" /> Playbook
      </Link>

      <div className="space-y-2">
        <h1 className="text-xl font-black text-zinc-100">Glossary</h1>
        <p className="text-sm text-zinc-400">Tennis words in plain English.</p>
      </div>

      <input
        type="search"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search a word… (try “split step”)"
        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-600"
      />

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800 overflow-hidden">
        {shown.map(t => (
          <div key={t.term} className="px-4 py-3">
            <p className="text-sm font-black text-zinc-100">{t.term}</p>
            <p className="text-sm text-zinc-400 mt-0.5">{t.def}</p>
          </div>
        ))}
        {shown.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-zinc-500">No match. Try a shorter word.</p>
        )}
      </div>

    </div>
  );
}
