import type { ReactNode } from 'react';

export function Chip({ label, cls }: { label: string; cls: string }) {
  return <span className={`inline-flex h-6 items-center whitespace-nowrap border px-2 text-[11px] caps ${cls}`}>{label}</span>;
}

/** Panel with the "SECTION 0X · LABEL" eyebrow and big red title. */
export function Section({
  n, eyebrow, title, icon, right, children, className = '',
}: {
  n: string; eyebrow: string; title: string; icon?: ReactNode; right?: ReactNode; children: ReactNode; className?: string;
}) {
  const id = `sec-${n}-${title.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <section aria-labelledby={id} className={`min-w-0 border border-line bg-panel px-6 pb-6 pt-6 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5 sm:flex-nowrap">
        <div className="flex min-w-0 items-start gap-4">
          {icon && (
            <span className="flex size-10 flex-none items-center justify-center border border-[#5A1D19] bg-[#1F1012] text-red" aria-hidden="true">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <p className="eyebrow">Section {n} · {eyebrow}</p>
            <h2 id={id} className="title mt-1.5 text-[26px]">{title}</h2>
          </div>
        </div>
        {right && <div className="flex-none">{right}</div>}
      </div>
      {children}
    </section>
  );
}

export const btnGold = 'inline-flex items-center justify-center gap-2 bg-gold px-5 text-[12px] caps text-[#1A1206] hover:bg-[#F3C452] disabled:cursor-not-allowed disabled:opacity-40';
export const btnOutline = 'inline-flex items-center justify-center gap-2 border border-line2 px-4 text-[12px] caps text-ink hover:bg-panel2 disabled:opacity-40';
export const btnGoldOutline = 'inline-flex items-center justify-center border border-gold px-4 text-[11px] caps text-gold hover:bg-[#2A2008]';
export const btnRedOutline = 'inline-flex items-center justify-center border border-[#B3221B] px-3 text-[11px] caps text-[#FF6A5F] hover:bg-[#2A0E0C]';
export const input = 'h-12 w-full border border-line2 bg-[#0F0F12] px-4 text-[15px] text-ink placeholder:text-faint focus:border-gold focus:outline-none';
export const label = 'mb-2.5 block text-[11px] caps tracking-[0.16em] text-dim';

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
export const Icon = {
  server: <svg viewBox="0 0 24 24" className="size-5" {...s}><rect x="4" y="4" width="16" height="7" /><rect x="4" y="13" width="16" height="7" /><path d="M8 7.5h.01M8 16.5h.01" /></svg>,
  wifi: <svg viewBox="0 0 24 24" className="size-5" {...s}><path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01" /></svg>,
  shield: <svg viewBox="0 0 24 24" className="size-5" {...s}><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z" /></svg>,
  people: <svg viewBox="0 0 24 24" className="size-5" {...s}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></svg>,
  db: <svg viewBox="0 0 24 24" className="size-5" {...s}><ellipse cx="12" cy="5.5" rx="7" ry="2.5" /><path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" /></svg>,
  clock: <svg viewBox="0 0 24 24" className="size-5" {...s}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>,
  chat: <svg viewBox="0 0 24 24" className="size-5" {...s}><path d="M4 5h16v11H9l-5 4z" /></svg>,
  chart: <svg viewBox="0 0 24 24" className="size-5" {...s}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>,
  doc: <svg viewBox="0 0 24 24" className="size-5" {...s}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></svg>,
  lock: <svg viewBox="0 0 24 24" className="size-4" {...s}><rect x="5" y="11" width="14" height="9" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>,
  target: <svg viewBox="0 0 24 24" className="size-6" {...s} strokeWidth={2}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>,
  check: <svg viewBox="0 0 24 24" className="size-4" {...s} strokeWidth={3}><path d="M5 12l5 5L20 7" /></svg>,
  key: <svg viewBox="0 0 24 24" className="size-16" {...s} strokeWidth={1.5}><circle cx="8" cy="15" r="4" /><path d="M10.8 12.2 20 3M17 6l3 3M15 8l2 2" /></svg>,
  card: <svg viewBox="0 0 24 24" className="size-16" {...s} strokeWidth={1.5}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></svg>,
  upload: <svg viewBox="0 0 24 24" className="size-7" {...s}><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></svg>,
  scale: <svg viewBox="0 0 24 24" className="size-4" {...s}><path d="M12 3v18M5 21h14M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z" /></svg>,
};

/** Numbered "what to do now" strip used on every screen. */
export function StepsBar({ title, calm, steps }: { title: string; calm: string; steps: { text: string; state: 'done' | 'now' | 'todo' }[] }) {
  return (
    <div className="flex flex-col gap-3 border-b border-line bg-[#121214] px-5 py-4 sm:px-8">
      <div className="flex flex-wrap justify-between gap-2">
        <span className="text-[12px] caps tracking-[0.2em] text-gold">{title}</span>
        <span className="text-[13px] text-dim">{calm}</span>
      </div>
      <ol className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        {steps.map((s, i) => (
          <li
            key={i}
            aria-current={s.state === 'now' ? 'step' : undefined}
            className={`flex items-center gap-3 px-3.5 py-3 text-[14px] leading-tight ${
              s.state === 'now' ? 'border border-gold bg-[#1E1A0C] font-bold text-ink' : s.state === 'done' ? 'border border-line text-dim' : 'border border-line text-faint'
            }`}
          >
            {s.state === 'done' ? (
              <span className="flex size-[26px] flex-none items-center justify-center bg-green text-white">{Icon.check}<span className="sr-only">Done:</span></span>
            ) : (
              <span className={`flex size-[26px] flex-none items-center justify-center font-extrabold ${s.state === 'now' ? 'bg-gold text-[#1A1206]' : 'border border-line2'}`}>{i + 1}</span>
            )}
            {s.text}
          </li>
        ))}
      </ol>
    </div>
  );
}
