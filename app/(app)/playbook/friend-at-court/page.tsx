'use client';
import { Fragment, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, X } from 'lucide-react';

// ─── Friend at Court ──────────────────────────────────────────────────────────
// Searchable USTA Friend at Court (2026): ITF Rules of Tennis, The Code, USTA Regulations,
// Emergency Care, Umpire policy and Glossary, split into one entry per rule / case / comment.
// fac.json is generated from the USTA PDF by scripts/parse-friend-at-court.py.

type Part = 'rules' | 'code' | 'regs' | 'glossary' | 'other';
type Entry = { id: number; part: Part; ref: string; title: string; crumb: string; page: number; text: string };
type Indexed = Entry & { hay: string; titleHay: string; titleCore: string };

const PDF_URL = 'https://www.usta.com/content/dam/usta/coach-organize/content-fragments/resource-library/assets/pdfs/friend-at-court.pdf';

const PARTS: { v: Part | 'all'; label: string }[] = [
  { v: 'all', label: 'All' },
  { v: 'rules', label: 'Rules of Tennis' },
  { v: 'code', label: 'The Code' },
  { v: 'regs', label: 'USTA Regulations' },
  { v: 'glossary', label: 'Glossary' },
  { v: 'other', label: 'Other' },
];
const PART_LABEL: Record<Part, string> = {
  rules: 'ITF Rules of Tennis',
  code: 'The Code',
  regs: 'USTA Regulations',
  glossary: 'Glossary',
  other: 'Emergency Care & Umpires',
};
const PART_BADGE: Record<Part, string> = {
  rules: 'text-lime-300 border-lime-400/30',
  code: 'text-sky-300 border-sky-400/30',
  regs: 'text-amber-300 border-amber-400/30',
  glossary: 'text-zinc-300 border-zinc-600',
  other: 'text-rose-300 border-rose-400/30',
};
// Rules and The Code are what players look up most, so they win ties
const PART_BOOST: Record<Part, number> = { rules: 1.3, code: 1.3, glossary: 1.1, regs: 1, other: 0.8 };

const TOPICS = [
  'foot fault', 'let', 'coaching', 'line calls', 'hindrance', 'warm-up', 'tiebreak',
  'time violation', 'medical timeout', 'lateness', 'double hit', 'ball out of play', 'score dispute',
];

const STOP = new Set(
  'a an and are as at be by can could do does for from had happen happens has have how i if in into is it its may me my of on or our should so that the their them then there these they this to us was we what when where which who why will with you your'.split(' '),
);

const PAGE = 25;

// ─── Search ───────────────────────────────────────────────────────────────────

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-');

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Light stemming so "serving" finds "serve"/"server" and "faults" finds "fault". */
function stem(w: string) {
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

/** Everyday words → the words the book uses (all stemmed). */
const SYNONYMS: Record<string, string[]> = {
  tiebreak: ['tiebreak', 'tie-break'],
  'tie-break': ['tiebreak', 'tie-break'],
  racquet: ['racket'],
  bathroom: ['toilet', 'bathroom'],
  restroom: ['toilet'],
  swear: ['profan', 'obscen', 'swear'],
  curs: ['profan', 'obscen'],
  cursing: ['profan', 'obscen'],
  phone: ['phone', 'cell'],
  cellphone: ['cell'],
  hat: ['hat', 'cap'],
  cap: ['hat', 'cap'],
  noad: ['no-ad'],
  ref: ['referee', 'umpire'],
  bathroombreak: ['toilet'],
};

/** Each term is a group of alternatives; a group matches if any alternative does. */
type Query = { terms: string[][]; phrases: string[]; raw: string };

function parseQuery(q: string): Query {
  const n = norm(q).trim();
  const phrases = [...n.matchAll(/"([^"]+)"/g)].map(m => m[1].trim()).filter(Boolean);
  const rest = n.replace(/"[^"]*"/g, ' ');
  const words = rest.split(/[^a-z0-9'-]+/).map(w => w.replace(/^'+|'+$/g, '')).filter(Boolean);
  const kept = words.filter(w => !STOP.has(w));
  const stems = [...new Set((kept.length ? kept : words).map(stem).filter(w => w.length > 1 || /\d/.test(w)))];
  return { terms: stems.map(t => SYNONYMS[t] ?? [t]), phrases, raw: n };
}

/** Matches at the start of a word, so "fault" also hits "faults" and "foot-fault". */
const groupRe = (g: string[]) => new RegExp(`(?:^|[^a-z0-9])(?:${g.map(escapeRe).join('|')})`, 'g');

/** Rare words count for more: "hat" in "what happens if my hat falls off" decides the result. */
function termWeights(data: Indexed[], q: Query) {
  return q.terms.map(g => {
    const re = groupRe(g);
    let df = 0;
    for (const e of data) {
      re.lastIndex = 0;
      if (re.test(e.hay)) df++;
    }
    return Math.log(1 + data.length / (1 + df));
  });
}

function scoreEntry(e: Indexed, q: Query, weights: number[], all: boolean): number {
  let score = 0;
  let hit = 0;
  for (let k = 0; k < q.terms.length; k++) {
    const re = groupRe(q.terms[k]);
    const inTitle = (e.titleHay.match(re) ?? []).length;
    const inBody = Math.min((e.hay.match(re) ?? []).length, 8);
    if (inTitle || inBody) hit++;
    else if (all) return 0;
    score += weights[k] * (inTitle * 6 + inBody);
  }
  for (const p of q.phrases) {
    const n = e.hay.split(p).length - 1;
    if (!n && all) return 0;
    if (n) hit++;
    score += n * 8 + (e.titleHay.includes(p) ? 12 : 0);
  }
  if (!hit) return 0;
  // whole query as a phrase (e.g. "foot fault") is a strong signal, and a title that IS the query wins
  const joined = q.terms.map(g => g[0]).join(' ');
  if (q.terms.length > 1 && joined.length > 4) {
    if (e.titleHay.includes(joined)) score += 25;
    else if (e.hay.includes(joined)) score += 10;
  }
  if (joined && e.titleCore === joined) score += 40;
  // short, focused entries beat long ones that mention the word in passing
  const lengthPenalty = 1 + Math.log10(1 + e.text.length / 600);
  return ((score * PART_BOOST[e.part]) / lengthPenalty) * (hit / (q.terms.length + q.phrases.length));
}

// ─── Highlighting ─────────────────────────────────────────────────────────────

function highlightRe(q: Query) {
  const parts = [...q.phrases, ...q.terms.flat()].filter(Boolean).sort((a, b) => b.length - a.length).map(escapeRe);
  if (!parts.length) return null;
  // match the term plus the rest of the word it starts
  return new RegExp(`(${parts.map(p => `(?<![A-Za-z0-9])${p}[A-Za-z]*`).join('|')})`, 'gi');
}

function Highlight({ text, re }: { text: string; re: RegExp | null }) {
  if (!re) return <>{text}</>;
  // re is built from normalized terms; matching on the original keeps the display text intact
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    out.push(<mark key={i} className="rounded bg-amber-300/25 px-0.5 text-amber-100">{m[0]}</mark>);
    last = i + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

/** ~240 characters around the densest cluster of matches. */
function snippet(text: string, re: RegExp | null) {
  const flat = text.replace(/\n/g, ' ');
  if (!re || flat.length <= 260) return flat;
  const hits = [...flat.matchAll(re)].map(m => m.index ?? 0);
  if (!hits.length) return flat.slice(0, 240) + '…';
  let best = hits[0];
  let bestCount = 0;
  for (const h of hits) {
    const c = hits.filter(x => x >= h && x < h + 200).length;
    if (c > bestCount) { bestCount = c; best = h; }
  }
  let start = Math.max(0, best - 70);
  const sp = flat.lastIndexOf(' ', start);
  if (start > 0 && sp > 0) start = sp + 1;
  const end = Math.min(flat.length, start + 250);
  return `${start > 0 ? '…' : ''}${flat.slice(start, end)}${end < flat.length ? '…' : ''}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FriendAtCourtPage() {
  const [data, setData] = useState<Indexed[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState('');
  const [part, setPart] = useState<Part | 'all'>('all');
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [shown, setShown] = useState(PAGE);
  const inputRef = useRef<HTMLInputElement>(null);
  const dq = useDeferredValue(q);

  // Load the book on demand, and pick up ?q= from a shared link
  useEffect(() => {
    let alive = true;
    import('./fac.json')
      .then(m => {
        if (!alive) return;
        const rows = (m.default as Entry[]).map(e => ({
          ...e,
          hay: norm(`${e.title} ${e.ref} ${e.text}`),
          titleHay: norm(`${e.title} ${e.ref}`),
          titleCore: norm(e.title).split(/[^a-z0-9'-]+/).filter(w => w && !STOP.has(w)).map(stem).join(' '),
        }));
        setData(rows);
      })
      .catch(() => alive && setFailed(true));
    const initial = new URLSearchParams(window.location.search).get('q');
    if (initial) setQ(initial);
    return () => { alive = false; };
  }, []);

  // Keep ?q= in the address so a search can be shared
  useEffect(() => {
    const t = setTimeout(() => {
      const url = dq.trim() ? `${window.location.pathname}?q=${encodeURIComponent(dq.trim())}` : window.location.pathname;
      window.history.replaceState(window.history.state, '', url);
    }, 400);
    return () => clearTimeout(t);
  }, [dq]);

  const query = useMemo(() => parseQuery(dq), [dq]);
  const hasQuery = query.terms.length + query.phrases.length > 0;
  const re = useMemo(() => highlightRe(query), [query]);

  const results = useMemo(() => {
    if (!data || !hasQuery) return null;
    const weights = termWeights(data, query);
    const run = (all: boolean) =>
      data
        .map(e => ({ e, s: scoreEntry(e, query, weights, all) }))
        .filter(x => x.s > 0)
        .sort((a, b) => b.s - a.s);
    const strict = run(true);
    return strict.length ? { list: strict, partial: false } : { list: run(false), partial: true };
  }, [data, query, hasQuery]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0 };
    for (const r of results?.list ?? []) {
      c.all++;
      c[r.e.part] = (c[r.e.part] ?? 0) + 1;
    }
    return c;
  }, [results]);

  const visible = (results?.list ?? []).filter(r => part === 'all' || r.e.part === part);

  const toggle = (id: number) =>
    setOpen(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const setSearch = (v: string) => {
    setQ(v);
    setShown(PAGE);
    setOpen(new Set());
  };

  return (
    <div className="space-y-5 pb-6">
      <Link href="/playbook" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100">
        <ArrowLeft className="h-4 w-4" /> Playbook
      </Link>

      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-zinc-100">Friend at Court</h1>
        <p className="text-sm text-zinc-400">USTA Handbook of Tennis Rules and Regulations · 2026 edition</p>
      </div>

      {/* ── Search box ── */}
      <div>
        <div className="flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-3 focus-within:border-zinc-400">
          <Search className="h-4 w-4 shrink-0 text-zinc-500" />
          <input
            ref={inputRef}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            value={q}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search the rules, e.g. foot fault"
            className="w-full bg-transparent py-3 text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            aria-label="Search Friend at Court"
          />
          {q && (
            <button
              onClick={() => { setSearch(''); inputRef.current?.focus(); }}
              aria-label="Clear search"
              className="rounded-full p-1 text-zinc-400 hover:text-zinc-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {hasQuery && results && (
          <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {PARTS.filter(p => p.v === 'all' || counts[p.v]).map(p => (
              <button
                key={p.v}
                onClick={() => { setPart(p.v); setShown(PAGE); }}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                  part === p.v ? 'border-zinc-100 bg-zinc-100 text-zinc-900' : 'border-zinc-800 text-zinc-400'
                }`}
              >
                {p.label} <span className="opacity-60">{counts[p.v] ?? 0}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {failed && <p className="text-sm text-red-400">Couldn’t load the rule book. Check your connection and reload.</p>}
      {!data && !failed && <p className="text-sm text-zinc-500">Loading the rule book…</p>}

      {/* ── Results ── */}
      {data && hasQuery && results && (
        <section className="space-y-3">
          <p className="text-xs text-zinc-500">
            {results.list.length === 0
              ? 'No rules match. Try fewer or different words.'
              : results.partial
                ? `No rule has every word, so these match some of them (${visible.length}).`
                : `${visible.length} ${visible.length === 1 ? 'match' : 'matches'}${part !== 'all' ? ` in ${PARTS.find(p => p.v === part)?.label}` : ''}.`}
            {' '}Tap a result to read it in full.
          </p>
          {visible.slice(0, shown).map(({ e }) => (
            <EntryCard key={e.id} e={e} re={re} open={open.has(e.id)} onToggle={() => toggle(e.id)} />
          ))}
          {visible.length > shown && (
            <button
              onClick={() => setShown(s => s + PAGE)}
              className="w-full rounded-xl border border-zinc-800 py-2.5 text-sm font-bold text-zinc-300 active:scale-[0.98]"
            >
              Show more ({visible.length - shown} left)
            </button>
          )}
        </section>
      )}

      {/* ── No search yet: quick topics + browse ── */}
      {data && !hasQuery && (
        <>
          <section className="space-y-2">
            <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Popular searches</p>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map(t => (
                <button
                  key={t}
                  onClick={() => setSearch(t)}
                  className="rounded-full border border-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-300 active:scale-95"
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-zinc-500">
              Tip: put words in quotes to search an exact phrase, e.g. <span className="text-zinc-300">&quot;benefit of the doubt&quot;</span>.
            </p>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-black tracking-widest uppercase text-zinc-400">Browse</p>
            {(['rules', 'code', 'regs', 'glossary', 'other'] as Part[]).map(p => (
              <BrowsePart key={p} part={p} entries={data.filter(e => e.part === p)} open={open} onToggle={toggle} />
            ))}
          </section>
        </>
      )}

      <p className="px-1 text-[11px] leading-relaxed text-zinc-500">
        Text from <span className="text-zinc-300">Friend at Court 2026</span>, © 2026 United States Tennis Association. All rights
        reserved. Converted from the{' '}
        <a href={PDF_URL} target="_blank" rel="noreferrer" className="underline decoration-zinc-600 hover:text-zinc-300">
          official PDF
        </a>{' '}
        for searching; tables and diagrams may read oddly here. Page numbers refer to the printed book. Check the PDF for anything
        that matters.
      </p>
    </div>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

function EntryCard({ e, re, open, onToggle }: { e: Entry; re: RegExp | null; open: boolean; onToggle: () => void }) {
  const showTitle = e.title !== e.ref;
  return (
    <article className={`rounded-2xl border bg-zinc-900/50 transition-colors ${open ? 'border-zinc-600' : 'border-zinc-800'}`}>
      <button onClick={onToggle} className="block w-full px-4 py-3 text-left" aria-expanded={open}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${PART_BADGE[e.part]}`}>
            {e.part === 'glossary' ? 'Glossary' : e.ref}
          </span>
          <span className="text-[11px] text-zinc-500">{e.crumb} · p. {e.page}</span>
        </div>
        {showTitle && (
          <p className="mt-1.5 text-sm font-bold text-zinc-100 leading-snug">
            <Highlight text={e.title} re={re} />
          </p>
        )}
        {!open && (
          <p className="mt-1 text-sm text-zinc-400 leading-snug">
            <Highlight text={snippet(e.text, re)} re={re} />
          </p>
        )}
      </button>
      {open && (
        <div className="space-y-2 px-4 pb-4 text-sm leading-relaxed text-zinc-300">
          {e.text.split('\n').map((para, i) => (
            <p
              key={i}
              className={
                /^(Case \d+:|Decision:)/.test(para)
                  ? 'rounded-lg bg-zinc-950/60 px-3 py-2'
                  : /^(USTA Comment|FAC Comment)/.test(para)
                    ? 'rounded-lg border-l-2 border-zinc-600 bg-zinc-950/40 px-3 py-2 text-zinc-300'
                    : /^([a-z]|[ivx]+)\. |^•/.test(para)
                      ? 'pl-3'
                      : undefined
              }
            >
              <Highlight text={para} re={re} />
            </p>
          ))}
          <button onClick={onToggle} className="text-xs font-bold text-zinc-500">Collapse</button>
        </div>
      )}
    </article>
  );
}

function BrowsePart({ part, entries, open, onToggle }: { part: Part; entries: Entry[]; open: Set<number>; onToggle: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  // group by breadcrumb so a rule's cases and comments sit under it
  const groups = useMemo(() => {
    const m = new Map<string, Entry[]>();
    for (const e of entries) {
      const k = part === 'glossary' ? e.title[0].toUpperCase().replace(/[0-9]/, '#') : e.crumb;
      m.set(k, [...(m.get(k) ?? []), e]);
    }
    return [...m.entries()];
  }, [entries, part]);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50">
      <button onClick={() => setExpanded(x => !x)} className="flex w-full items-center justify-between px-4 py-3 text-left" aria-expanded={expanded}>
        <span className="text-sm font-bold text-zinc-100">{PART_LABEL[part]}</span>
        <span className="text-[11px] text-zinc-500">{entries.length} entries {expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="space-y-3 px-3 pb-3">
          {groups.map(([crumb, list]) => (
            <Fragment key={crumb}>
              <p className="px-1 pt-1 text-[11px] font-bold uppercase tracking-wide text-zinc-500">{crumb}</p>
              {list.map(e => (
                <EntryCard key={e.id} e={e} re={null} open={open.has(e.id)} onToggle={() => onToggle(e.id)} />
              ))}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
