import type { ReactNode } from 'react';
import { useNow, useStore } from '../data/react';
import { dhms } from '../lib/select';
import { SevenSegClock } from './SevenSeg';
import { Icon } from './ui';

/** Red incident block + seven-segment clock. Shared by the Lead and employee dashboards. */
export function Header({ roleLabel, name, right }: { roleLabel: string; name: string; right: ReactNode }) {
  const s = useStore();
  const now = useNow();
  const inc = s.incident;
  const active = inc.status === 'active';
  const elapsed = dhms(inc.declaredAt ? (inc.resolvedAt ?? now) - inc.declaredAt : 0);

  return (
    <header className="flex flex-wrap">
      <div className={`flex min-h-[148px] flex-[1_1_560px] flex-wrap items-center gap-x-8 gap-y-4 px-5 py-6 sm:px-8 ${active ? 'bg-alarm' : 'bg-[#1F5E3D]'}`}>
        <div className="flex items-center gap-5">
          <span className="text-white">{Icon.target}</span>
          <div>
            <h1 className="text-[24px] font-extrabold uppercase leading-none tracking-[0.02em] [font-stretch:115%]">
              {active ? 'Incident active' : 'Incident resolved'}
            </h1>
            <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/85">
              {inc.code} · {inc.kind} · Severity {inc.severity}
            </p>
          </div>
        </div>
        <div className="border-l border-white/30 pl-6">
          <p className="text-[11px] caps tracking-[0.2em] text-white/80">{roleLabel}</p>
          <p className="mt-1 text-[16px] font-bold">{name}</p>
        </div>
      </div>
      <div className="flex flex-[1_1_560px] flex-col justify-center gap-4 bg-black px-5 py-4 sm:px-8">
        <SevenSegClock values={elapsed} labels={['Days', 'Hours', 'Minutes', 'Seconds']} />
        <div className="flex flex-wrap items-center gap-4">
          <span className="border border-line2 bg-[#1A1A1E] px-3 py-2 text-[11px] caps">Warroom · no internet</span>
          {right}
        </div>
      </div>
    </header>
  );
}
