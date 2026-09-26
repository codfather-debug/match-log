'use client';
import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { clamp } from './geometry';

// ─── Small UI pieces for the Shot Geometry page ───────────────────────────────

export function Segmented({
  value, onChange, options, className = '',
}: { value: string; onChange: (v: string) => void; options: { v: string; label: string }[]; className?: string }) {
  return (
    <div className={`flex rounded-xl border border-zinc-800 bg-zinc-900/60 p-1 ${className}`}>
      {options.map(o => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
            value === o.v ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Horizontally scrolling row of chips (one can be active). */
export function Chips({
  value, onChange, options,
}: { value: string | null; onChange: (v: string) => void; options: { v: string; label: string }[] }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {options.map(o => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors active:scale-95 ${
            value === o.v ? 'border-zinc-100 bg-zinc-100 text-zinc-900' : 'border-zinc-800 text-zinc-400'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({
  label, value, display, min, max, step, onChange,
}: { label: string; value: number; display: string; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="block space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-bold text-zinc-300">{label}</span>
        <span className="text-xs font-bold text-zinc-100 tabular-nums">{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={clamp(value, min, max)}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-zinc-100"
      />
    </label>
  );
}

export function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors active:scale-95 ${
        on ? 'border-zinc-100 bg-zinc-100 text-zinc-900' : 'border-zinc-800 text-zinc-400'
      }`}
    >
      {label}
    </button>
  );
}

/** Card with a tappable header that expands its body. */
export function Collapsible({
  title, hint, defaultOpen = false, children,
}: { title: string; hint?: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <span>
          <span className="text-sm font-bold text-zinc-100">{title}</span>
          {hint && <span className="ml-2 text-[11px] text-zinc-500">{hint}</span>}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="space-y-3 px-4 pb-4">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' }) {
  const color = tone === 'good' ? 'text-green-400' : tone === 'bad' ? 'text-red-400' : 'text-zinc-100';
  return (
    <div className="rounded-xl bg-zinc-950/60 p-3">
      <p className="text-[11px] font-bold text-zinc-500">{label}</p>
      <p className={`text-base font-black tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-zinc-400 leading-snug">{sub}</p>}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-black tracking-widest uppercase text-zinc-400">{children}</p>;
}
