import { useEffect, useRef, useState } from 'react';
import { BlockRows, ChartTitle, Ring, StackBar } from '../../components/Charts';
import { Header } from '../../components/Header';
import { Chip, Icon, Section, StepsBar, btnGold, btnGoldOutline, input, label } from '../../components/ui';
import { useNow, useStore } from '../../data/react';
import { KIND_LABEL, SOURCE_LABEL, store } from '../../data/store';
import type { DeskStatus, Employee, ReportKind, Source, Task } from '../../data/types';
import { CHIP, DESK, LANE_CHIP } from '../../lib/meta';
import { ESCALATE_MS, bytes, clock, empById, lane, minSec, myRequest } from '../../lib/select';
import { beep, buzz } from '../../lib/sound';
import { USE_MOCK } from '../../stdb/config';

/* E2: what an approved employee sees. */
export function EmployeeDashboard({ me: meIn }: { me: Employee }) {
  // Live mode: tasks and messages are matched by name ("member:Priya Nair").
  const me = USE_MOCK ? meIn : { ...meIn, id: `member:${meIn.name}` };
  const s = useStore();
  const now = useNow(5000);
  const req = myRequest(s, store.sid);
  const mine = s.tasks.filter((t) => t.assigneeId === me.id);
  const newOnes = mine.filter((t) => t.status === 'open');
  const pinned = s.messages.filter((m) => m.pinned).pop();
  const [toast, setToast] = useState<string | null>(null);

  // Alert on new tasks; keep pinging until they press OK.
  const seen = useRef(new Set(mine.map((t) => t.id)));
  useEffect(() => {
    const unseen = mine.filter((t) => !seen.current.has(t.id));
    unseen.forEach((t) => seen.current.add(t.id));
    const fresh = unseen.filter((t) => t.status === 'open'); // tasks you claimed yourself don't alert
    if (fresh.length) {
      setToast(`New task: ${fresh[0].title}`);
      beep(2, 988);
      buzz([200, 100, 200]);
    }
  }, [mine]);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!newOnes.length) return;
    const t = window.setInterval(() => { beep(2, 988); buzz(200); }, 12_000);
    return () => window.clearInterval(t);
  }, [newOnes.length]);

  const reportedByMe = s.systems.some((x) => x.reportedBy === me.name);
  const steps = [
    { text: newOnes.length ? `Press OK on new tasks · ${newOnes.length} new` : 'Press OK on new tasks. Gold rows are yours.', state: newOnes.length ? 'now' : 'done' },
    { text: 'Tick the box when a task is done', state: !newOnes.length && mine.some((t) => t.status === 'acknowledged') ? 'now' : mine.length && mine.every((t) => t.status === 'done') ? 'done' : 'todo' },
    { text: 'Report any system that isn’t right', state: reportedByMe ? 'done' : !newOnes.length ? 'now' : 'todo' },
    { text: 'Read messages from the Lead', state: 'todo' },
  ] as const;

  return (
    <div className="min-h-screen bg-bg">
      <Header roleLabel={`Employee · ${me.title}`} name={me.name}
        right={<span className="text-[14px]"><strong>Approved</strong><span className="text-dim"> by Maria Lopez at the box · {clock(req?.decidedAt ?? now)}</span></span>} />
      {s.incident.status === 'resolved' && (
        <p className="border-b-2 border-green bg-[#0E2417] px-8 py-3 text-center text-[16px] font-semibold">The incident is resolved. Wait for IT before using company systems again.</p>
      )}
      <StepsBar title="Your next steps" calm="You can’t break anything here. Not sure? Ask the Incident Lead, they’re in the room." steps={steps.map((x) => ({ ...x }))} />
      {toast && (
        <div role="alert" className="fixed inset-x-3 top-3 z-50 flex items-start gap-3 border-2 border-gold bg-[#2A2008] p-4 shadow-2xl sm:left-auto sm:w-96">
          <p className="flex-1 font-semibold">{toast}</p>
          <button aria-label="Dismiss" className="-m-2 size-11 text-xl text-dim" onClick={() => setToast(null)}>×</button>
        </div>
      )}
      <main className="mx-auto flex max-w-[1440px] flex-col gap-5 px-4 py-6 sm:px-8">
        <Progress me={me} />
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <TaskBoard me={me} now={now} />
            <ReportForm me={me} />
          </div>
          <aside className="flex w-full flex-col gap-5 xl:w-[400px] xl:flex-none">
            <Messages me={me} pinned={pinned?.text} />
            <Help />
          </aside>
        </div>
      </main>
    </div>
  );
}

function Progress({ me }: { me: Employee }) {
  const s = useStore();
  const mine = s.tasks.filter((t) => t.assigneeId === me.id);
  const done = mine.filter((t) => t.status === 'done').length;
  const desks = (['infected', 'suspected', 'contained', 'clean', 'unchecked'] as DeskStatus[]).map((k) => ({ label: DESK[k].label, value: s.desks.filter((d) => d.status === k).length, color: DESK[k].hex }));
  const team = s.teams.find((t) => t.id === me.teamId);
  const teamSys = s.systems.filter((x) => x.teamId === me.teamId);
  const missing = teamSys.filter((x) => x.status === 'unchecked');
  return (
    <Section n="01" eyebrow="At a glance" title="Progress" icon={Icon.chart}>
      <div className="grid gap-7 pt-5 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
        <div className="flex items-center gap-5">
          <Ring done={done} total={mine.length} label="My tasks done" />
          <div>
            <p className="text-[15px] font-extrabold uppercase [font-stretch:110%]">My tasks</p>
            <p className="mt-1 text-[13px] text-dim">{mine.length ? `${done} of ${mine.length} done.${done < mine.length ? ' Keep going.' : ' Nice work.'}` : 'Nothing assigned yet. Claim an open task below.'}</p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <ChartTitle title={`Building: ${s.desks.length} desks`} />
          <StackBar label="Desks" parts={desks} />
        </div>
        <div className="flex flex-col gap-3">
          {team ? (
            <>
              <ChartTitle title={`${team.name} systems reported`} note={`${teamSys.length - missing.length} / ${teamSys.length}`} />
              <BlockRows label={`${team.name} systems reported`} rows={[{ label: team.name, filled: teamSys.length - missing.length, total: teamSys.length, late: false }]} />
              <p className="text-[12px] text-dim">{missing.length ? `Not yet: ${missing.map((x) => x.name).join(', ')}. Use the form below.` : 'All reported. Thank you.'}</p>
            </>
          ) : (
            <>
              <ChartTitle title="Systems reported" note={`${s.systems.filter((x) => x.status !== 'unchecked').length} / ${s.systems.length}`} />
              <BlockRows label="Systems reported" rows={[{ label: 'All teams', filled: s.systems.filter((x) => x.status !== 'unchecked').length, total: s.systems.length, late: false }]} />
            </>
          )}
        </div>
      </div>
    </Section>
  );
}

type Filter = 'all' | 'mine' | 'anyone' | 'done';

function TaskBoard({ me, now }: { me: Employee; now: number }) {
  const s = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  // Your own finished tasks stay in view, ticked, at the bottom.
  const order = (t: Task) => (t.assigneeId === me.id ? (t.status === 'open' ? 0 : t.status === 'done' ? 4 : 1) : !t.assigneeId ? 2 : 3);
  const sets: Record<Filter, Task[]> = {
    all: s.tasks.filter((t) => t.status !== 'done' || t.assigneeId === me.id),
    mine: s.tasks.filter((t) => t.assigneeId === me.id),
    anyone: s.tasks.filter((t) => !t.assigneeId && t.status !== 'done'),
    done: s.tasks.filter((t) => t.status === 'done'),
  };
  const rows = sets[filter].slice().sort((a, b) => order(a) - order(b) || b.createdAt - a.createdAt);
  const tabs: [Filter, string][] = [['all', 'All active'], ['mine', 'Mine'], ['anyone', 'Open to anyone'], ['done', 'Done']];

  return (
    <Section n="02" eyebrow="Response queue" title="All active tasks" icon={Icon.shield} right={<span className="text-[12px] caps text-gold">{sets.mine.filter((t) => t.status !== 'done').length} yours open</span>}>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 pt-4">
        <div role="tablist" aria-label="Filter tasks" className="flex flex-wrap gap-1.5">
          {tabs.map(([id, t]) => (
            <button key={id} role="tab" aria-selected={filter === id} onClick={() => setFilter(id)}
              className={`h-10 border px-3.5 text-[11px] caps ${filter === id ? 'border-ink bg-ink text-[#0D0D0F]' : 'border-line2 text-dim hover:text-ink'}`}>
              {t} ({sets[id].length})
            </button>
          ))}
        </div>
        <span className="flex items-center gap-2 text-[13px] text-dim"><span className="size-3.5 bg-gold" aria-hidden="true" />Gold = yours</span>
      </div>
      <ul className="border-t border-line">
        {rows.length === 0 && <li className="py-6 text-center text-dim">{filter === 'mine' ? 'Nothing assigned to you. Check “Open to anyone”.' : 'Nothing here right now.'}</li>}
        {rows.map((t) => <TaskRow key={t.id} t={t} me={me} now={now} />)}
      </ul>
      <p className="mt-3.5 text-[13px] text-dim">New tasks ping until you press OK. After 5 minutes they go back to the Lead.</p>
    </Section>
  );
}

function TaskRow({ t, me, now }: { t: Task; me: Employee; now: number }) {
  const s = useStore();
  const mine = t.assigneeId === me.id;
  const done = t.status === 'done';
  const l = lane(t, now);
  const who = t.assigneeId ? (mine ? 'You' : empById(s, t.assigneeId)?.name) : 'Anyone can claim';
  const left = ESCALATE_MS - (now - t.createdAt);
  const waitingOnMe = t.status === 'open' && (mine || !t.assigneeId);
  const when = waitingOnMe && (t.urgent || mine)
    ? left > 0
      ? `${t.assigneeId ? 'start' : 'claim and start'} within ${minSec(left)}`
      : `OVERDUE by ${minSec(-left)}, the admin may reassign it`
    : done ? `done ${clock(t.doneAt ?? 0)}` : clock(t.createdAt);
  return (
    <li className={`grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3.5 border-b border-l-4 border-b-line py-4 pl-3 pr-4 ${mine ? `border-l-gold ${done ? 'bg-[#17150D]' : 'bg-[#1E1A0C]'}` : 'border-l-transparent'}`}>
      <div className="flex justify-center">
        {mine && t.status !== 'open' ? (
          <input type="checkbox" checked={done} onChange={() => store.toggleDone(t.id)} aria-label={`${done ? 'Mark not done' : 'Mark done'}: ${t.title}`} className="size-7 cursor-pointer accent-[#2E8B47]" />
        ) : (
          <span aria-hidden="true" className={`size-2.5 ${t.assigneeId ? 'bg-[#55555E]' : 'bg-gold'}`} />
        )}
      </div>
      <div className="min-w-0">
        {t.urgent && !done && <span className="mb-1.5 inline-block bg-gold px-2 py-0.5 text-[10.5px] caps text-[#1A1206]">Urgent</span>}
        <p className={`text-[16px] font-bold leading-snug ${done ? 'text-faint line-through' : mine || !t.assigneeId ? '' : 'text-dim'}`}>{t.title}</p>
        <p className="mt-0.5 text-[13px] text-dim">{[who, t.detail, when].filter(Boolean).join(' · ')}</p>
      </div>
      <div className="flex items-center justify-end gap-2.5">
        {mine && t.status === 'open' && <button className={`${btnGold} h-11`} onClick={() => store.ackTask(t.id)}>Claim and start</button>}
        {!t.assigneeId && !done && <button className={`${btnGoldOutline} h-11`} onClick={() => store.claimTask(t.id)}>Claim</button>}
        {t.assigneeId && !(mine && t.status === 'open') && (
          <Chip {...(mine && t.status === 'acknowledged' ? { label: 'On it', cls: CHIP.BLUE } : LANE_CHIP[l])} />
        )}
      </div>
    </li>
  );
}

const KINDS: ReportKind[] = ['down', 'slow', 'ransom', 'suspicious', 'working'];
const KIND_SQ: Record<ReportKind, string> = { down: 'bg-[#E5483D]', slow: 'bg-[#D99A2B]', ransom: 'bg-[#C8261D]', suspicious: 'bg-[#D99A2B]', working: 'bg-[#2E8B47]' };

function ReportForm({ me }: { me: Employee }) {
  const s = useStore();
  const mineFirst = s.systems.slice().sort((a, b) => Number(b.teamId === me.teamId) - Number(a.teamId === me.teamId) || Number(b.status === 'unchecked') - Number(a.status === 'unchecked'));
  const [systemId, setSystemId] = useState(mineFirst[0]?.id ?? '');
  const [location, setLocation] = useState('');
  const [kind, setKind] = useState<ReportKind | null>(null);
  const [source, setSource] = useState<Source>('self');
  const [impact, setImpact] = useState('');
  const [dnt, setDnt] = useState(false);
  const [files, setFiles] = useState<{ name: string; size: number }[]>([]);
  const [sent, setSent] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const active = s.incident.status === 'active';
  const teamName = (id: string) => s.teams.find((t) => t.id === id)?.name ?? '';

  return (
    <Section n="03" eyebrow="System error" title="Report a system" icon={Icon.server}
      right={<p className="max-w-[240px] text-[12.5px] text-dim sm:text-right">Fill it top to bottom. Only steps 1 and 3 are required.</p>}>
      <form className="flex flex-col gap-6 pt-5" onSubmit={(e) => {
        e.preventDefault();
        if (!kind) return;
        store.submitReport({ systemId, location, kind, source, impact, doNotTouch: dnt, attachments: files });
        setSent(`${s.systems.find((x) => x.id === systemId)?.name} sent. It shows as ${kind === 'working' ? 'Working' : 'Suspected'} on the Lead’s board until IT confirms.`);
        setKind(null); setImpact(''); setDnt(false); setFiles([]); setLocation('');
      }}>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          <div>
            <label htmlFor="sys" className={label}>1. Which system?</label>
            <select id="sys" value={systemId} onChange={(e) => { setSystemId(e.target.value); setSent(null); }} className={input}>
              {mineFirst.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.code}) · {teamName(x.teamId)}{x.status === 'unchecked' ? '' : ' · already reported'}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="loc" className={label}>2. Where is it? (optional)</label>
            <input id="loc" placeholder="e.g. Server room, rack B" value={location} onChange={(e) => setLocation(e.target.value)} className={input} />
          </div>
        </div>
        <fieldset>
          <legend className={label}>3. What is happening?</legend>
          <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
            {KINDS.map((k) => (
              <button type="button" key={k} aria-pressed={kind === k} onClick={() => setKind(k)}
                className={`flex min-h-16 items-center gap-3 border px-4 text-left text-[14.5px] font-semibold leading-tight ${kind === k ? 'border-red bg-[#2A1416]' : 'border-line2 hover:border-faint'}`}>
                <span className={`size-2.5 flex-none ${KIND_SQ[k]}`} aria-hidden="true" />{KIND_LABEL[k]}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className={label}>4. How do you know?</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SOURCE_LABEL) as Source[]).map((k) => (
              <button type="button" key={k} aria-pressed={source === k} onClick={() => setSource(k)}
                className={`h-11 border px-4 text-[12px] caps ${source === k ? 'border-gold bg-[#2A2008] text-gold' : 'border-line2 hover:border-faint'}`}>{SOURCE_LABEL[k]}</button>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="imp" className={label}>5. What can people not do right now?</label>
          <textarea id="imp" rows={3} placeholder="e.g. Intranet pages load blank. Staff can’t reach the HR forms." value={impact} onChange={(e) => setImpact(e.target.value)}
            className="w-full border border-line2 bg-[#0F0F12] px-3.5 py-3 text-[15px] leading-relaxed placeholder:text-faint focus:border-gold focus:outline-none" />
        </div>
        <div>
          <span className={label}>6. Add a photo or file (optional)</span>
          <div className="flex flex-wrap items-stretch gap-3">
            <button type="button" onClick={() => fileRef.current?.click()} className="flex flex-[1_1_280px] items-center gap-3.5 border-2 border-dashed border-line2 p-5 text-left text-dim hover:border-faint">
              {Icon.upload}
              <span><span className="block text-[15px] font-bold text-ink">Take a photo or choose a file</span><span className="block text-[12.5px]">A photo of the error screen helps IT most.</span></span>
            </button>
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.txt,.log" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true"
              onChange={(e) => { const l = e.target.files; if (l) setFiles((f) => [...f, ...Array.from(l).map((x) => ({ name: x.name, size: x.size }))]); e.target.value = ''; }} />
            {files.map((f, i) => (
              <div key={i} className="flex flex-[0_1_260px] items-center gap-2.5 border border-line2 px-3.5 py-3">
                <span className="text-dim">{Icon.doc}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-bold">{f.name}</p><p className="text-[12px] text-dim">{bytes(f.size)} · ready</p></div>
                <button type="button" aria-label={`Remove ${f.name}`} className="size-9 text-[20px] text-dim" onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-3.5 border border-line2 p-4">
          <input type="checkbox" checked={dnt} onChange={(e) => setDnt(e.target.checked)} className="size-6 flex-none accent-[#E8B53B]" />
          <span><span className="block text-[14px] font-extrabold uppercase">Leave it as is · do not touch</span><span className="block text-[13.5px] text-dim">Don’t restart or unplug it. IT may need it as evidence.</span></span>
        </label>
        <div className="flex flex-wrap items-center gap-4 border-t border-line pt-5">
          <button disabled={!kind || !active} className={`${btnGold} h-[54px] px-7 text-[13px]`}>Send report to the Lead</button>
          <p className="text-[13.5px] text-dim" aria-live="polite">
            {sent ?? (!kind ? 'Pick what is happening in step 3 to send.' : <>Shows as <strong className="text-gold">SUSPECTED</strong> on the Lead’s board until IT confirms it.</>)}
          </p>
        </div>
      </form>
    </Section>
  );
}

function Messages({ me, pinned }: { me: Employee; pinned?: string }) {
  const s = useStore();
  const [text, setText] = useState('');
  const msgs = s.messages.filter((m) => empById(s, m.authorId)?.role === 'lead' || m.authorId === me.id || empById(s, m.authorId)?.name === me.name).slice().reverse();
  return (
    <Section n="04" eyebrow="From the lead" title="Messages" icon={Icon.chat}>
      {pinned && <p className="mt-4 border border-[#B3221B] bg-[#2A0E0C] px-4 py-3.5 text-[14px] leading-relaxed"><strong>Pinned:</strong> {pinned}</p>}
      <ul className="mt-4 flex max-h-[360px] flex-col gap-3.5 overflow-y-auto pr-1" aria-live="polite">
        {msgs.length === 0 && <li className="text-dim">No messages yet.</li>}
        {msgs.map((m) => {
          const a = empById(s, m.authorId);
          return (
            <li key={m.id} className={`border-l-2 pl-3 ${a?.role === 'lead' ? 'border-l-red' : 'border-l-line2'}`}>
              <p className="text-[13px]"><strong>{a?.id === me.id || a?.name === me.name ? 'You' : (a?.name ?? m.authorId)}</strong> <span className="text-[10.5px] uppercase tracking-[0.14em] text-faint">{a?.role === 'lead' ? 'Incident Lead · Admin' : [a?.dept, a?.title && a.title !== a.dept ? a.title : ''].filter(Boolean).join(' · ')} · {clock(m.at)}</span></p>
              <p className="text-[14px] leading-snug">{m.text}</p>
            </li>
          );
        })}
      </ul>
      <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); store.sendMessage(text); setText(''); }}>
        <input aria-label="Message the Lead" placeholder="Message the Lead" value={text} onChange={(e) => setText(e.target.value)} className={input} />
        <button className={`${btnGold} h-12`}>Send</button>
      </form>
    </Section>
  );
}

function Help() {
  return (
    <Section n="05" eyebrow="Stay calm" title="Need help?">
      <ul className="mt-4 flex flex-col gap-3.5 text-[14px] leading-relaxed">
        <li><strong>Not sure what to do?</strong><br /><span className="text-dim">Ask the Incident Lead. They’re at the box in this room.</span></li>
        <li><strong>Found something scary?</strong><br /><span className="text-dim">Don’t fix it. Report it with the form and add a photo.</span></li>
        <li><strong>Task doesn’t make sense?</strong><br /><span className="text-dim">Leave it unticked and message the Lead.</span></li>
      </ul>
    </Section>
  );
}
