import { useState } from 'react';
import { BarList, ChartTitle } from '../../components/Charts';
import { Chip, Icon, Section, StepsBar, btnGold, btnOutline, input, label } from '../../components/ui';
import { useNow, useStore } from '../../data/react';
import { store } from '../../data/store';
import type { Task } from '../../data/types';
import { CHIP } from '../../lib/meta';
import { clock, empName, inRoomIds, initials, lane, minSec, type TaskLane } from '../../lib/select';

/* A4: create tasks (a person or open to anyone) and watch them move. */
export function TasksPage() {
  const s = useStore();
  const now = useNow(5000);
  const escalated = s.tasks.filter((t) => lane(t, now) === 'escalated');
  return (
    <>
      <StepsBar title="How to give out work" calm="Short tasks work best. One action per task."
        steps={[
          { text: 'Write what needs doing in plain words', state: 'now' },
          { text: 'Pick a person, or leave it open to anyone', state: 'now' },
          { text: 'They get pinged until they press OK', state: 'todo' },
          { text: 'No OK in 5 min: it escalates to you', state: 'todo' },
        ]} />
      <main className="mx-auto flex max-w-[1440px] flex-col gap-5 px-4 py-6 sm:px-8">
        {escalated.map((t) => <Escalation key={t.id} t={t} />)}
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
          <div className="min-w-0 flex-1"><CreateTask /></div>
          <div className="w-full xl:w-[400px] xl:flex-none"><Workload /></div>
        </div>
        <Board />
      </main>
    </>
  );
}

function Escalation({ t }: { t: Task }) {
  const s = useStore();
  const now = useNow(1000);
  const people = s.employees.filter((e) => inRoomIds(s).has(e.id) && e.id !== t.assigneeId);
  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-5 gap-y-3 border-2 border-[#B3221B] bg-[#1E0F0E] px-5 py-4">
      <Chip label="Escalated" cls={CHIP.RED} />
      <span className="min-w-[280px] flex-1 text-[15px] font-semibold">{empName(s, t.assigneeId)} hasn’t pressed OK on “{t.title}” for {minSec(now - t.createdAt)}.</span>
      <button className={`${btnOutline} h-11`} onClick={() => store.repage(t.id)}>Re-page {empName(s, t.assigneeId).split(' ')[0]}</button>
      <select aria-label="Give it to someone else" defaultValue="" onChange={(e) => e.target.value && store.reassign(t.id, e.target.value === 'anyone' ? null : e.target.value)} className={`${input} h-11 w-auto`}>
        <option value="">Give it to someone else…</option>
        <option value="anyone">Open to anyone</option>
        {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </div>
  );
}

function CreateTask() {
  const s = useStore();
  const inRoom = inRoomIds(s);
  const people = s.employees.filter((e) => inRoom.has(e.id));
  const openCount = (id: string) => s.tasks.filter((t) => t.assigneeId === id && t.status !== 'done').length;
  const sorted = people.slice().sort((a, b) => openCount(a.id) - openCount(b.id));
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [anyone, setAnyone] = useState(false);
  const [who, setWho] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [due, setDue] = useState('15');
  const [sent, setSent] = useState('');
  const ready = title.trim() && (anyone || who);

  return (
    <Section n="01" eyebrow="New task" title="Assign a task" icon={Icon.shield}>
      <form className="flex flex-col gap-5 pt-5" onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        store.createTask(title.trim(), detail.trim(), anyone ? null : who, urgent, due ? Number(due) : null);
        setSent(anyone ? 'Sent to everyone. First person to claim it owns it.' : `Sent to ${empName(s, who)}. They’ll be pinged until they press OK.`);
        setTitle(''); setDetail(''); setUrgent(false);
      }}>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          <div><label htmlFor="tt" className={label}>What needs doing?</label><input id="tt" placeholder="e.g. Check Floor 1 desks F1-01 to F1-09" value={title} onChange={(e) => setTitle(e.target.value)} className={input} /></div>
          <div><label htmlFor="td" className={label}>Details (optional)</label><input id="td" placeholder="e.g. Tap each desk on the map as you go" value={detail} onChange={(e) => setDetail(e.target.value)} className={input} /></div>
        </div>
        <fieldset>
          <legend className={label}>Who does it?</legend>
          <div className="flex">
            {([[false, 'A specific person'], [true, 'Open to anyone']] as const).map(([v, t]) => (
              <button type="button" key={t} aria-pressed={anyone === v} onClick={() => setAnyone(v)}
                className={`h-12 flex-1 border border-line2 text-[12px] caps ${anyone === v ? 'bg-ink text-[#0D0D0F]' : 'text-dim hover:text-ink'}`}>{t}</button>
            ))}
          </div>
          {anyone ? (
            <p className="mt-3.5 border border-line2 px-4 py-3.5 text-[14px] leading-relaxed text-dim">Shows on every employee’s board with a <strong className="text-ink">Claim</strong> button. The first person to claim it owns it.</p>
          ) : (
            <div className="mt-3.5 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
              <select aria-label="Person" value={who} onChange={(e) => setWho(e.target.value)} className={input}>
                <option value="">Choose a person…</option>
                {sorted.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.dept} · {openCount(p.id)} open</option>)}
              </select>
              <p className="self-center text-[13px] text-dim">{people.length ? 'Only people in the room. Fewest open tasks first.' : 'Nobody approved yet. Use “Open to anyone” or approve people first.'}</p>
            </div>
          )}
        </fieldset>
        <div className="flex flex-wrap items-end gap-5">
          <fieldset>
            <legend className={label}>Priority</legend>
            <div className="flex">
              {([[false, 'Normal'], [true, 'Urgent']] as const).map(([v, t]) => (
                <button type="button" key={t} aria-pressed={urgent === v} onClick={() => setUrgent(v)}
                  className={`h-11 border border-line2 px-4 text-[12px] caps ${urgent === v ? (v ? 'bg-gold text-[#1A1206]' : 'bg-ink text-[#0D0D0F]') : 'text-dim'}`}>{t}</button>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="due" className={label}>Needed by</label>
            <select id="due" value={due} onChange={(e) => setDue(e.target.value)} className={`${input} w-48`}>
              <option value="15">In 15 minutes</option><option value="30">In 30 minutes</option><option value="60">In 1 hour</option><option value="">No deadline</option>
            </select>
          </div>
          <button disabled={!ready} className={`${btnGold} ml-auto h-[52px]`}>Send task</button>
        </div>
        {sent && <p role="status" className="text-[14px] text-[#5BD08A]">{sent}</p>}
      </form>
    </Section>
  );
}

function Workload() {
  const s = useStore();
  const open = s.tasks.filter((t) => t.status !== 'done');
  const byPerson = new Map<string, number>();
  open.forEach((t) => byPerson.set(t.assigneeId ?? 'anyone', (byPerson.get(t.assigneeId ?? 'anyone') ?? 0) + 1));
  const rows = [...byPerson.entries()].sort((a, b) => b[1] - a[1]).map(([id, v]) => ({ label: id === 'anyone' ? 'Anyone' : empName(s, id), value: v, color: id === 'anyone' ? '#8F8F99' : '#E8B53B' }));
  const top = rows.find((r) => r.label !== 'Anyone');
  return (
    <Section n="02" eyebrow="Graph" title="Who has what" icon={Icon.chart}>
      <div className="flex flex-col gap-3.5 pt-5">
        <ChartTitle title="Open tasks per person" note={`${open.length} open`} />
        {rows.length ? <BarList label="Open tasks per person" rows={rows} /> : <p className="text-dim">No open tasks.</p>}
        {top && top.value >= 3 && <p className="text-[12px] text-faint">{top.label} has the most. Consider giving the next one to someone else.</p>}
      </div>
    </Section>
  );
}

const COLS: { id: TaskLane[]; title: string; note: string }[] = [
  { id: ['anyone'], title: 'Open to anyone', note: 'Anyone in the room can claim these.' },
  { id: ['escalated', 'waiting'], title: 'Waiting for OK', note: 'Pinged until they press OK.' },
  { id: ['progress'], title: 'In progress', note: 'Accepted and being worked on.' },
  { id: ['done'], title: 'Done', note: 'Logged on the timeline.' },
];

function Board() {
  const s = useStore();
  const now = useNow(5000);
  return (
    <Section n="03" eyebrow="Response queue" title="Task board" icon={Icon.shield}>
      <div className="grid gap-5 pt-5 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        {COLS.map((c) => {
          const items = s.tasks.filter((t) => c.id.includes(lane(t, now))).sort((a, b) => Number(lane(b, now) === 'escalated') - Number(lane(a, now) === 'escalated'));
          return (
            <div key={c.title} className="flex min-w-0 flex-col gap-2.5">
              <div className="flex items-baseline justify-between border-b-2 border-line2 pb-2"><h3 className="text-[13px] caps">{c.title}</h3><span className="text-[13px] text-dim">{items.length}</span></div>
              <p className="text-[12px] text-faint">{c.note}</p>
              <ul className="flex flex-col gap-2.5">
                {items.map((t) => <TaskCard key={t.id} t={t} now={now} />)}
                {items.length === 0 && <li className="border border-dashed border-line2 p-4 text-center text-[13px] text-faint">Empty</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function TaskCard({ t, now }: { t: Task; now: number }) {
  const s = useStore();
  const l = lane(t, now);
  const who = empName(s, t.assigneeId);
  const meta = {
    anyone: `Posted ${clock(t.createdAt)} · not claimed yet`,
    waiting: `Sent ${clock(t.createdAt)} · escalates in ${minSec(5 * 60_000 - (now - t.createdAt))}`,
    escalated: `No reply for ${minSec(now - t.createdAt)}${t.pings ? ` · re-paged ${t.pings}×` : ''}`,
    progress: `OK at ${clock(t.ackedAt ?? 0)}${t.dueAt ? ` · due ${clock(t.dueAt)}` : ''}`,
    done: `Done ${clock(t.doneAt ?? 0)}`,
  }[l];
  return (
    <li className={`flex flex-col gap-2.5 border p-3.5 ${l === 'escalated' ? 'border-[#B3221B] bg-[#1E0F0E]' : l === 'done' ? 'border-line bg-[#17171A]' : 'border-line2 bg-[#17171A]'}`}>
      {t.urgent && l !== 'done' && <span className="self-start bg-gold px-2 py-0.5 text-[10.5px] caps text-[#1A1206]">Urgent</span>}
      <p className={`text-[15px] font-bold leading-snug ${l === 'done' ? 'text-faint line-through' : ''}`}>{t.title}</p>
      {t.detail && l !== 'done' && <p className="text-[12.5px] text-dim">{t.detail}</p>}
      <div className="flex items-center gap-2">
        <span className="flex size-[26px] items-center justify-center bg-[#2A2A30] text-[11px] font-extrabold">{t.assigneeId ? initials(who) : '?'}</span>
        <span className="text-[13px]">{who}</span>
      </div>
      <p className={`text-[12px] ${l === 'escalated' ? 'text-[#FF6A5F]' : 'text-dim'}`}>{meta}</p>
      {l !== 'done' && <button className="self-start text-[12px] text-dim underline hover:text-ink" onClick={() => store.toggleDone(t.id)}>Mark done</button>}
    </li>
  );
}
