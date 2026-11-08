import { useMemo, useRef, useState } from 'react';
import { Chip, Icon, Section, btnGold, btnGoldOutline, btnOutline, input, label } from '../../components/ui';
import { useNow, useStore } from '../../data/react';
import { store } from '../../data/store';
import type { DeskStatus, State, SysStatus, System } from '../../data/types';
import { DATA_CHIP, DESK, SYS_CHIP, TONE_BG } from '../../lib/meta';
import { bytes, clock, empById } from '../../lib/select';

/* ---------------- Servers and systems ---------------- */
const SEVERITY: SysStatus[] = ['encrypted', 'down', 'suspected', 'contained', 'working', 'unchecked'];

function confidence(x: System) {
  if (x.status === 'unchecked') return { label: 'Unknown', note: 'not reported yet', confirm: false };
  if (x.confirmed) return { label: x.status === 'working' ? 'Cleared' : 'Confirmed', note: `IT · ${clock(x.confirmedAt ?? x.at ?? 0)}`, confirm: false };
  return x.status === 'working'
    ? { label: 'Reported', note: 'not verified', confirm: true }
    : { label: 'Suspected', note: 'needs IT check', confirm: true };
}

export function SystemsTable({ n = '02', limit }: { n?: string; limit?: number }) {
  const s = useStore();
  const [filter, setFilter] = useState<'all' | 'down' | 'check'>('all');
  const [showAll, setShowAll] = useState(false);
  const rows = useMemo(() => {
    const sorted = s.systems.slice().sort((a, b) => SEVERITY.indexOf(a.status) - SEVERITY.indexOf(b.status) || (b.at ?? 0) - (a.at ?? 0));
    if (filter === 'down') return sorted.filter((x) => x.status === 'down' || x.status === 'encrypted');
    if (filter === 'check') return sorted.filter((x) => !x.confirmed && x.status !== 'unchecked');
    return sorted;
  }, [s.systems, filter]);
  const reported = rows.filter((x) => x.status !== 'unchecked');
  const visible = showAll ? rows : filter === 'all' ? reported.slice(0, limit ?? reported.length) : rows;
  const hidden = rows.length - visible.length;

  const fbtn = (id: typeof filter, text: string) => (
    <button aria-pressed={filter === id} onClick={() => setFilter(id)} className={`h-10 border px-3.5 text-[11px] caps ${filter === id ? 'border-ink bg-[#0F0F12]' : 'border-line2 text-dim hover:text-ink'}`}>
      {text}
    </button>
  );

  return (
    <Section n={n} eyebrow="Team reports" title="Servers and systems" icon={Icon.server}
      right={<div className="flex flex-wrap gap-1.5">{fbtn('all', 'All')}{fbtn('down', 'Down')}{fbtn('check', 'Needs IT check')}</div>}>
      <p className="mt-4 text-[13px] text-dim">Employees report systems from their dashboards. Reports stay Suspected until IT confirms them here.</p>
      {visible.length === 0 ? (
        <p className="mt-4 border border-dashed border-line2 p-6 text-center text-dim">Nothing here yet. Reports appear the moment someone sends one.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[10.5px] uppercase tracking-[0.18em] text-dim">
                {['System', 'Team · reported by', 'Status', 'Confidence', 'How we know', 'Impact', 'Time'].map((h) => <th key={h} className="px-2.5 py-3 font-bold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {visible.map((x) => {
                const c = confidence(x);
                return (
                  <tr key={x.id} className="border-b border-line align-top">
                    <td className="px-2.5 py-4">
                      <p className="font-bold">{x.name}</p>
                      <p className="text-dim">{x.code}</p>
                      {x.doNotTouch && <span className="mt-2 inline-block bg-white px-2 py-1 text-[10.5px] caps text-black">Do not touch</span>}
                    </td>
                    <td className="px-2.5 py-4"><p>{s.teams.find((t) => t.id === x.teamId)?.name}</p><p className="text-dim">{x.reportedBy ?? 'Not reported'}</p></td>
                    <td className="px-2.5 py-4"><Chip {...SYS_CHIP[x.status]} /></td>
                    <td className="px-2.5 py-4">
                      <p className="font-semibold">{c.label}</p>
                      <p className="text-dim">{c.note}</p>
                      {c.confirm && <button onClick={() => store.confirmSystem(x.id)} className={`${btnGoldOutline} mt-2 h-8`}>IT confirm</button>}
                    </td>
                    <td className="px-2.5 py-4">{x.howWeKnow}</td>
                    <td className="px-2.5 py-4">{x.impact}</td>
                    <td className="whitespace-nowrap px-2.5 py-4 font-bold text-gold">{x.at ? clock(x.at) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {(hidden > 0 || showAll) && (
        <button className="mt-4 text-[13px] text-dim underline hover:text-ink" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Show fewer' : `Show all ${rows.length} systems (${hidden} more)`}
        </button>
      )}
    </Section>
  );
}

/* ---------------- Building map ---------------- */
export function BuildingMap({ n = '03' }: { n?: string }) {
  const s = useStore();
  const [problems, setProblems] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const desk = s.desks.find((d) => d.id === picked);
  const active = s.incident.status === 'active';
  return (
    <Section n={n} eyebrow="Live topology" title={`Building map / ${s.desks.length} workstations`} icon={Icon.wifi}
      right={<button aria-pressed={problems} onClick={() => setProblems((v) => !v)} className={`${btnOutline} h-10 ${problems ? 'border-ink' : ''}`}>{problems ? 'Problems only' : 'All machines'}</button>}>
      {s.floors.map((f) => {
        const desks = s.desks.filter((d) => d.floor === f.n);
        const count = (k: DeskStatus) => desks.filter((d) => d.status === k).length;
        return (
          <div key={f.n} className="flex flex-col gap-4 border-b border-line py-6 lg:flex-row lg:items-center">
            <div className="lg:w-[170px] lg:flex-none">
              <h3 className="text-[17px] font-extrabold uppercase leading-tight [font-stretch:112%]">Floor {f.n} · {f.name}</h3>
              <p className="mt-1 text-[13px] text-dim">{count('infected')} infected · {count('suspected') ? `${count('suspected')} suspected` : `${count('unchecked')} unchecked`}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-faint">{f.checkedBy ? `Checked by ${f.checkedBy.split(' ')[0]} · ${clock(f.checkedAt ?? 0)}` : 'Not swept yet'}</p>
            </div>
            <div className="grid flex-1 grid-cols-5 gap-2 sm:grid-cols-10">
              {desks.map((d) => (
                <button key={d.id} disabled={!active} onClick={() => setPicked(d.id)} aria-label={`${d.id}: ${DESK[d.status].label}`} title={`${d.id}: ${DESK[d.status].label}`}
                  className={`flex aspect-[6/5] flex-col items-center justify-center gap-0.5 hover:brightness-110 ${DESK[d.status].cls} ${problems && d.status === 'clean' ? 'opacity-20' : ''}`}>
                  <span className="text-[12px] font-extrabold">{DESK[d.status].code}</span>
                  <span className="text-[9.5px] font-semibold opacity-80">{d.id}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.14em] text-dim">
        <div className="flex flex-wrap gap-4">
          {(Object.keys(DESK) as DeskStatus[]).map((k) => <span key={k} className="flex items-center gap-1.5"><span className={`size-2.5 ${DESK[k].cls}`} aria-hidden="true" />{DESK[k].code} {DESK[k].label}</span>)}
        </div>
        <span>Click a desk to change it</span>
      </div>
      {desk && <DeskPicker id={desk.id} current={desk.status} onClose={() => setPicked(null)} />}
    </Section>
  );
}

function DeskPicker({ id, current, onClose }: { id: string; current: DeskStatus; onClose: () => void }) {
  const s = useStore();
  const people = s.employees.filter((e) => e.role === 'it' || e.role === 'lead');
  const [by, setBy] = useState(people[1]?.name ?? 'IT');
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={`Change ${id}`} className="w-full max-w-sm border border-line2 bg-panel p-6" onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow">Workstation</p>
        <h2 className="title mt-1 text-[24px]">{id}</h2>
        <label htmlFor="by" className={`${label} mt-4`}>Checked by</label>
        <select id="by" value={by} onChange={(e) => setBy(e.target.value)} className={`${input} h-11`}>
          {people.map((p) => <option key={p.id}>{p.name}</option>)}
        </select>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {(Object.keys(DESK) as DeskStatus[]).map((k) => (
            <button key={k} autoFocus={k === current} onClick={() => { store.setDesk(id, k, by); onClose(); }}
              className={`h-12 text-[12px] caps ${DESK[k].cls} ${k === current ? 'ring-2 ring-gold ring-offset-2 ring-offset-panel' : ''}`}>
              {DESK[k].label}
            </button>
          ))}
        </div>
        <button className={`${btnOutline} mt-4 h-11 w-full`} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

/* ---------------- Data affected ---------------- */
export function DataAffected({ n = '05' }: { n?: string }) {
  const s = useStore();
  return (
    <Section n={n} eyebrow="Scope" title="Data affected" icon={Icon.db}>
      <ul>
        {s.data.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 border-b border-line py-4">
            <div><p className="text-[16px] font-bold">{d.name}</p><p className="text-[13px] text-dim">{d.source}</p></div>
            <button onClick={() => store.cycleData(d.id)} aria-label={`${d.name}: ${DATA_CHIP[d.status].label}. Click to change.`} title="Click to change"><Chip {...DATA_CHIP[d.status]} /></button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] text-faint">Click a status to change it. Exfiltrated starts the notice clock.</p>
    </Section>
  );
}

/* ---------------- Counsel report ---------------- */
export function Counsel({ n = '04' }: { n?: string }) {
  const s = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const add = (list: FileList | null) => list && store.addFiles(Array.from(list).map((f) => ({ name: f.name, size: f.size })));
  return (
    <Section n={n} eyebrow="For the lawyer" title="Counsel report" icon={Icon.doc}>
      <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-[14px] leading-snug text-dim">
        <li>Upload anything the lawyer should see: photos, notes, exports.</li>
        <li>The incident report (timeline, systems, data) is added for you.</li>
        <li>Press <strong className="text-ink">Send to lawyer</strong>. It never leaves this network.</li>
      </ol>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
        className={`mt-4 flex w-full flex-col items-center gap-2 border-2 border-dashed px-4 py-6 text-center text-dim ${drag ? 'border-gold bg-[#1E1A0C]' : 'border-line2 hover:border-faint'}`}
      >
        {Icon.upload}
        <span className="text-[15px] font-bold text-ink">Drop files here or browse</span>
        <span className="text-[12px]">PDF, photos, notes</span>
      </button>
      <input ref={fileRef} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      <ul className="mt-2">
        <li className="flex items-center gap-3 border-b border-line py-3">
          <span className="text-dim">{Icon.doc}</span>
          <div className="min-w-0 flex-1"><p className="text-[14px] font-bold">Incident report (auto)</p><p className="text-[12px] text-dim">Updated live · {s.log.length} timeline entries</p></div>
          <a href="#/report" className="text-[12px] text-gold underline">View</a>
        </li>
        {s.files.slice().reverse().map((f) => (
          <li key={f.id} className="flex items-center gap-3 border-b border-line py-3">
            <span className="text-dim">{Icon.doc}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-bold">{f.name}</p><p className="text-[12px] text-dim">{f.by} · {clock(f.at)} · {bytes(f.size)} · {f.source}</p></div>
          </li>
        ))}
      </ul>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <button className={`${btnGold} h-12`} onClick={() => window.confirm(`Send the report and ${s.files.length} files to ${s.counsel.to}?`) && store.sendToLawyer()}>
          {Icon.scale} Send to lawyer
        </button>
        <a href="#/report" className={`${btnOutline} h-12`}>Download PDF</a>
      </div>
      <p className="mt-3 text-[12px] text-faint">{s.counsel.sentAt ? `Last sent to ${s.counsel.to} at ${clock(s.counsel.sentAt)}.` : `Not sent yet. Goes to ${s.counsel.to}.`}</p>
    </Section>
  );
}

/* ---------------- Timeline ---------------- */
export function Timeline({ n = '06' }: { n?: string }) {
  const s = useStore();
  const [text, setText] = useState('');
  return (
    <Section n={n} eyebrow="Immutable log" title="Incident timeline" icon={Icon.clock} right={<span className="text-dim" title="Entries can't be edited or deleted">{Icon.lock}</span>}>
      <ol className="mt-4 flex max-h-[420px] flex-col gap-5 overflow-y-auto pr-1">
        {s.log.length === 0 && <li className="text-dim">Nothing logged yet.</li>}
        {s.log.slice().sort((a, b) => b.at - a.at).map((e) => (
          <li key={e.id} className="grid grid-cols-[64px_14px_1fr] items-start gap-2">
            <span className="text-[11.5px] font-bold text-gold">{clock(e.at)}</span>
            <span className={`mt-1 size-2.5 ${TONE_BG[e.tone]}`} aria-hidden="true" />
            <div><p className="text-[14px] font-bold leading-snug">{e.title}</p><p className="text-[12.5px] text-dim">{e.sub}</p></div>
          </li>
        ))}
      </ol>
      <form className="mt-6" onSubmit={(e) => { e.preventDefault(); store.addLog(text); setText(''); }}>
        <label htmlFor="log" className={label}>Add verified entry</label>
        <div className="flex gap-2">
          <input id="log" placeholder="What happened?" value={text} onChange={(e) => setText(e.target.value)} className={input} />
          <button className={`${btnGold} h-12`}>Add</button>
        </div>
      </form>
    </Section>
  );
}

/* ---------------- Chat ---------------- */
export function Chat({ n = '07', asLead }: { n?: string; asLead: boolean }) {
  const s = useStore();
  const [text, setText] = useState('');
  const [pin, setPin] = useState(false);
  return (
    <Section n={n} eyebrow="In-dashboard comms" title="Team chat" icon={Icon.chat}>
      <ul className="mt-4 flex max-h-[380px] flex-col gap-4 overflow-y-auto pr-1" aria-live="polite">
        {s.messages.length === 0 && <li className="text-dim">No messages yet. Everything here is saved.</li>}
        {s.messages.map((m) => {
          const a = empById(s, m.authorId);
          return (
            <li key={m.id} className={`border-l-2 pl-3 ${a?.role === 'lead' ? 'border-l-red' : 'border-l-line2'}`}>
              <p className="text-[13px]">
                <strong>{a?.name}</strong>{' '}
                <span className="text-[10.5px] uppercase tracking-[0.14em] text-faint">{a?.role === 'lead' ? 'Incident Lead' : a?.dept} · {clock(m.at)}</span>
                {m.pinned && <span className="ml-2 text-[10.5px] caps text-gold">Pinned</span>}
              </p>
              <p className="text-[14px] leading-snug">{m.text}</p>
            </li>
          );
        })}
      </ul>
      <form className="mt-5" onSubmit={(e) => { e.preventDefault(); store.sendMessage(text, pin); setText(''); setPin(false); }}>
        <div className="flex gap-2">
          <input aria-label="Message" placeholder="Message everyone in the room" value={text} onChange={(e) => setText(e.target.value)} className={input} />
          <button className={`${btnGold} h-12`}>Send</button>
        </div>
        {asLead && (
          <label className="mt-2.5 flex items-center gap-2 text-[13px] text-dim">
            <input type="checkbox" checked={pin} onChange={(e) => setPin(e.target.checked)} className="size-4 accent-[#E8B53B]" />
            Pin to the top of everyone’s screen
          </label>
        )}
      </form>
    </Section>
  );
}

export const kpiCounts = (s: State) => {
  const n = (k: SysStatus) => s.systems.filter((x) => x.status === k).length;
  return { down: n('down'), encrypted: n('encrypted'), suspected: n('suspected'), contained: n('contained'), working: n('working'), unchecked: n('unchecked') };
};

export function useNoticeClock() {
  const s = useStore();
  const now = useNow();
  if (!s.incident.noticeStartAt) return null;
  return s.incident.noticeStartAt + s.incident.noticeHours * 3_600_000 - now;
}
