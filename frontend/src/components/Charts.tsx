import { useNow } from '../data/react';
import type { InfectionPoint } from '../data/types';
import { clock } from '../lib/select';

export function ChartTitle({ title, note, noteClass = 'text-dim' }: { title: string; note?: string; noteClass?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-[15px] font-extrabold uppercase [font-stretch:110%]">{title}</h3>
      {note && <span className={`text-[12px] ${noteClass}`}>{note}</span>}
    </div>
  );
}

/** Horizontal bars, one per row. */
export function BarList({ rows, max, label }: { rows: { label: string; value: number; color: string }[]; max?: number; label: string }) {
  const top = Math.max(1, max ?? Math.max(...rows.map((r) => r.value)));
  return (
    <div role="img" aria-label={`${label}: ${rows.map((r) => `${r.label} ${r.value}`).join(', ')}`} className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[96px_1fr_28px] items-center gap-2.5 text-[13px]">
          <span className="truncate text-dim">{r.label}</span>
          <span className="h-3 bg-[#222227]">
            <span className="block h-full" style={{ width: `${(r.value / top) * 100}%`, background: r.color }} />
          </span>
          <span className="text-right font-bold tabular-nums">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/** One bar split into colored parts. */
export function StackBar({ parts, label }: { parts: { label: string; value: number; color: string }[]; label: string }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  return (
    <div className="flex flex-col gap-2.5">
      <div role="img" aria-label={`${label}: ${parts.map((p) => `${p.value} ${p.label.toLowerCase()}`).join(', ')}`} className="flex h-[22px] gap-0.5 bg-[#222227]">
        {total > 0 && parts.filter((p) => p.value).map((p) => <span key={p.label} title={`${p.label}: ${p.value}`} style={{ flex: p.value, background: p.color }} />)}
      </div>
      <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[12px] text-dim">
        {parts.map((p) => (
          <span key={p.label} className="flex items-center gap-1.5">
            <span className="size-2.5" style={{ background: p.color }} aria-hidden="true" />
            {p.value} {p.label.toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Infected desks over time. */
export function InfectionLine({ points, start }: { points: InfectionPoint[]; start: number | null }) {
  const now = useNow(15_000);
  const W = 370, H = 176, L = 36, R = 358, T = 20, B = 150;
  if (!start || points.length === 0) {
    return <p className="flex h-[176px] items-center justify-center border border-dashed border-line2 px-6 text-center text-[13px] text-dim">No desks marked yet. The line starts when IT marks the first desk on the map.</p>;
  }
  const pts = [{ at: start, count: 0 }, ...points, { at: now, count: points[points.length - 1].count }];
  const span = Math.max(1, now - start);
  const top = Math.max(4, ...pts.map((p) => p.count));
  const x = (t: number) => L + ((t - start) / span) * (R - L);
  const y = (v: number) => B - (v / top) * (B - T);
  const line = pts.map((p) => `${x(p.at).toFixed(1)},${y(p.count).toFixed(1)}`).join(' ');
  const last = points[points.length - 1].count;
  const peak = Math.max(...points.map((p) => p.count));
  const ticks = [0, Math.round(top / 2), top];
  return (
    <svg role="img" aria-label={`Infected desks over time. Now ${last}, peak ${peak}.`} viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={R} y1={y(v)} y2={y(v)} stroke="#26262C" />
          <text x={L - 8} y={y(v) + 4} fill="#8F8F99" fontSize="10" textAnchor="end">{v}</text>
        </g>
      ))}
      <polygon points={`${L},${B} ${line} ${R},${B}`} fill="rgba(229,72,61,0.15)" />
      <polyline points={line} fill="none" stroke="#E5483D" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => <circle key={i} cx={x(p.at)} cy={y(p.count)} r="3.5" fill="#E5483D" />)}
      <text x={L} y={168} fill="#8F8F99" fontSize="10">{clock(start)}</text>
      <text x={R} y={168} fill="#8F8F99" fontSize="10" textAnchor="end">now</text>
    </svg>
  );
}

/** Progress ring (e.g. my tasks done). */
export function Ring({ done, total, label }: { done: number; total: number; label: string }) {
  const c = 2 * Math.PI * 40;
  const frac = total ? done / total : 0;
  return (
    <svg role="img" aria-label={`${label}: ${done} of ${total}`} viewBox="0 0 100 100" className="size-24 flex-none">
      <circle cx="50" cy="50" r="40" fill="none" stroke="#2A2A30" strokeWidth="12" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="#E8B53B" strokeWidth="12" strokeDasharray={`${c * frac} ${c}`} transform="rotate(-90 50 50)" />
      <text x="50" y="57" textAnchor="middle" fill="#F2F2F0" fontSize="22" fontWeight="800">{done}/{total}</text>
    </svg>
  );
}

/** Row of blocks, one per item (e.g. systems reported per team). */
export function BlockRows({ rows, label }: { rows: { label: string; filled: number; total: number; late: boolean }[]; label: string }) {
  return (
    <div role="img" aria-label={`${label}: ${rows.map((r) => `${r.label} ${r.filled} of ${r.total}`).join(', ')}`} className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[86px_1fr_44px] items-center gap-2.5 text-[13px]">
          <span className="truncate text-dim">{r.label}</span>
          <span className="flex h-3.5 gap-0.5">
            {Array.from({ length: r.total }, (_, i) => (
              <span key={i} className="flex-1" style={{ background: i < r.filled ? '#2E8B47' : r.late ? '#5A1D19' : '#2A2A30' }} />
            ))}
          </span>
          <span className={`text-right font-bold tabular-nums ${r.late ? 'text-[#FF6A5F]' : ''}`}>{r.filled}/{r.total}</span>
        </div>
      ))}
    </div>
  );
}
