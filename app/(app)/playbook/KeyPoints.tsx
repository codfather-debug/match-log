import Link from 'next/link';

// Short "read this first" box shown at the top of each Playbook page.
// Optional level lines tell 3.0 and 3.5 players what to focus on.
export function KeyPoints({
  points,
  level30,
  level35,
}: {
  points: string[];
  level30?: string;
  level35?: string;
}) {
  return (
    <section className="rounded-2xl border border-lime-400/25 bg-lime-400/[0.04] p-4 space-y-3">
      <p className="text-[10px] font-black tracking-widest uppercase text-lime-400">Key Points — read this first</p>
      <ol className="space-y-2">
        {points.map((p, i) => (
          <li key={i} className="flex items-start gap-3 text-sm font-semibold text-zinc-100">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-lime-400 text-[11px] font-black text-black">
              {i + 1}
            </span>
            {p}
          </li>
        ))}
      </ol>
      {(level30 || level35) && (
        <div className="space-y-1.5 border-t border-zinc-800 pt-3">
          {level30 && <LevelLine level="3.0" text={level30} />}
          {level35 && <LevelLine level="3.5" text={level35} />}
        </div>
      )}
      <Link href="/playbook/glossary" className="inline-block text-xs font-bold text-zinc-400 hover:text-zinc-100">
        New word? Look it up in the Glossary →
      </Link>
    </section>
  );
}

function LevelLine({ level, text }: { level: '3.0' | '3.5'; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <LevelBadge level={level} />
      <p className="text-xs text-zinc-300">{text}</p>
    </div>
  );
}

export function LevelBadge({ level }: { level: '3.0' | '3.5' }) {
  const cls = level === '3.0'
    ? 'border-sky-400/40 text-sky-300'
    : 'border-amber-400/40 text-amber-300';
  return (
    <span className={`flex-shrink-0 rounded-full border px-1.5 py-px text-[10px] font-black ${cls}`}>
      {level}+
    </span>
  );
}
