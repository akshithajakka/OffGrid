import { useState } from 'react';
import { Chip, Icon, Section, StepsBar, btnGold, btnGoldOutline, btnOutline, btnRedOutline } from '../../components/ui';
import { useNow, useStore } from '../../data/react';
import { store } from '../../data/store';
import type { Group, JoinRequest } from '../../data/types';
import { CHIP } from '../../lib/meta';
import { GROUP_LABEL, awaitingCard, clock, clockSec, empById, inRoomIds, initials, pendingApprovals } from '../../lib/select';

const TEMPLATES = {
  come: 'Cyber incident in progress. Come to Conference Room B now. Bring your keycard. Do not use company email or Teams.',
  stay: 'Cyber incident in progress. Stay where you are and stay offline. Do not use company email, Teams or VPN. Wait for the next message.',
  clear: 'All clear. The incident is under control. Wait for IT before using company systems again.',
};

/* A3: approve people who tapped their keycards, page the team, see who is here. */
export function AccessPage() {
  const s = useStore();
  const pending = pendingApprovals(s);
  return (
    <>
      <StepsBar title="When someone taps their keycard" calm="The board already checked their card against the employee database."
        steps={[
          { text: 'Look: does the photo match the person?', state: 'now' },
          { text: 'Ask: what code is on your screen?', state: 'now' },
          { text: 'Approve if both match. Deny if unsure.', state: 'now' },
          { text: 'Their dashboard opens by itself', state: 'todo' },
        ]} />
      <main className="mx-auto flex max-w-[1440px] flex-col gap-5 px-4 py-6 sm:px-8 xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div>
            <p className="eyebrow">Section 01 · Access control</p>
            <h2 className="title mt-1.5 text-[34px]">Approve people</h2>
          </div>
          {pending[0] ? <RequestCard r={pending[0]} position={`1 of ${pending.length} waiting`} /> : <EmptyCard />}
          <Queue rest={pending.slice(1)} />
        </div>
        <aside className="flex w-full flex-col gap-5 xl:w-[420px] xl:flex-none">
          <PageTeam />
          <WhoIsHere />
        </aside>
      </main>
    </>
  );
}

function RequestCard({ r, position }: { r: JoinRequest; position: string }) {
  const s = useStore();
  const e = empById(s, r.employeeId);
  if (!e) return null;
  const field = (k: string, v: string) => (
    <div><dt className="text-[11px] caps tracking-[0.16em] text-faint">{k}</dt><dd className="mt-1 text-[16px] font-semibold">{v}</dd></div>
  );
  const check = (t: string) => (
    <li className="flex items-center gap-2.5 text-[14px]"><span className="flex size-[22px] flex-none items-center justify-center bg-green text-white">{Icon.check}</span>{t}</li>
  );
  return (
    <section aria-labelledby="req-title" aria-live="polite" className="border-[3px] border-gold bg-[#16140D]">
      <div className="flex flex-wrap justify-between gap-2 bg-gold px-6 py-3.5 text-[#1A1206]">
        <h3 id="req-title" className="text-[13px] caps tracking-[0.2em]">Access request · {position}</h3>
        <span className="text-[13px] font-bold">Keycard tapped {clockSec(r.cardAt ?? r.createdAt)}</span>
      </div>
      <div className="flex flex-wrap gap-7 px-7 pb-2 pt-7">
        <div className="flex w-[200px] flex-none flex-col gap-2">
          <div role="img" aria-label={`Photo of ${e.name} from the employee database`} className="flex h-[230px] w-[200px] items-center justify-center bg-[#2A2A30] text-[64px] font-extrabold text-dim [font-stretch:115%]">
            {initials(e.name)}
          </div>
          <span className="text-[12px] text-faint">Photo from employee database</span>
        </div>
        <div className="flex min-w-[300px] flex-1 flex-col gap-4">
          <div>
            <p className="text-[40px] font-black uppercase leading-none [font-stretch:115%]">{e.name}</p>
            <p className="mt-2 text-[18px] text-dim">{e.title}</p>
          </div>
          <dl className="grid gap-x-6 gap-y-4 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
            {field('Department', e.dept)}{field('Employee ID', e.empId)}{field('Keycard', `••••${e.cardId.slice(-4)}`)}{field('Reports to', e.reportsTo)}{field('Device', r.device)}
          </dl>
          <ul className="flex flex-col gap-2">
            {check('Keycard found in the employee database')}{check('Active employee, not suspended')}{check(`Name typed on the ${r.device.toLowerCase()} matches the card`)}
          </ul>
        </div>
        <div className="flex w-[220px] flex-none flex-col items-center gap-2.5 self-start border-2 border-gold p-5 text-center">
          <span className="text-[12px] caps tracking-[0.18em] text-dim">Their screen code</span>
          <span className="text-[88px] font-black leading-none tracking-[0.06em] text-gold">{r.code}</span>
          <span className="text-[13px] text-dim">Ask them to show their screen. It must match.</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-7 pb-7 pt-5">
        <button onClick={() => store.approve(r.id)} className="h-[68px] flex-[1_1_300px] bg-green text-[18px] caps text-white hover:brightness-110">Approve access</button>
        <button onClick={() => store.deny(r.id)} className="h-[68px] flex-[0_1_200px] border-2 border-[#E5483D] text-[16px] caps text-[#FF6A5F] hover:bg-[#2A0E0C]">Deny</button>
        <span className="flex-[1_1_220px] text-[14px] leading-relaxed text-dim">Tapping your key fob again also approves. Not sure? Deny. They can tap their card again.</span>
      </div>
    </section>
  );
}

function EmptyCard() {
  const s = useStore();
  return (
    <section className="flex flex-col items-center gap-2.5 border-2 border-dashed border-line2 px-7 py-12 text-center">
      <span className="text-dim">{Icon.card}</span>
      <h3 className="text-[26px] font-extrabold uppercase [font-stretch:112%]">Nobody is waiting</h3>
      <p className="max-w-[540px] text-[15px] leading-relaxed text-dim">
        When someone types their name on a laptop and taps their keycard at the box, their card pops up here with a sound.
        {!s.incident.pagedAt && ' Start by paging your team on the right.'}
      </p>
    </section>
  );
}

function Queue({ rest }: { rest: JoinRequest[] }) {
  const s = useStore();
  const now = useNow(5000);
  const tapping = awaitingCard(s, now);
  const row = (key: string, badge: string, badgeCls: string, title: string, sub: string, chip: React.ReactNode, action?: React.ReactNode) => (
    <li key={key} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line py-3.5">
      <span className={`flex size-11 items-center justify-center font-extrabold ${badgeCls}`}>{badge}</span>
      <div className="min-w-[160px] flex-1"><p className="text-[15px] font-bold">{title}</p><p className="text-[13px] text-dim">{sub}</p></div>
      {chip}{action}
    </li>
  );
  return (
    <Section n="02" eyebrow="Queue" title="Waiting next" icon={Icon.people}>
      <ul>
        {rest.map((r) => {
          const e = empById(s, r.employeeId)!;
          return row(r.id, initials(e.name), 'bg-[#2A2A30]', e.name, `${e.title} · card tapped ${clock(r.cardAt ?? 0)} · code ${r.code}`, <Chip label="Card verified" cls={CHIP.GREEN} />);
        })}
        {tapping.map((r) => {
          const e = empById(s, r.employeeId)!;
          return row(r.id, initials(e.name), 'border border-dashed border-line2 text-dim', e.name, `Typed their name on a ${r.device.toLowerCase()} at ${clock(r.createdAt)} · walking to the box`,
            <Chip label="Needs card tap" cls={CHIP.AMBER} />, <button className={`${btnRedOutline} h-9`} onClick={() => store.deny(r.id)}>Cancel</button>);
        })}
        {s.access.slice(0, 5).map((a) =>
          row(a.id, '!', a.kind === 'no_device' ? 'bg-[#2A2008] text-gold' : 'bg-[#2A0E0C] text-[#FF6A5F]', a.kind === 'no_device' ? 'Tapped before typing their name' : a.kind === 'unknown_card' ? 'Unknown card' : 'Denied', `${a.text} · ${clock(a.at)}`,
            <Chip label={a.kind === 'no_device' ? 'Ask to type name' : 'Refused'} cls={a.kind === 'no_device' ? CHIP.AMBER : CHIP.RED} />),
        )}
        {rest.length + tapping.length + s.access.length === 0 && <li className="py-4 text-dim">Nobody else in line.</li>}
      </ul>
    </Section>
  );
}

function PageTeam() {
  const s = useStore();
  const [tpl, setTpl] = useState<keyof typeof TEMPLATES>('come');
  const [text, setText] = useState(TEMPLATES.come);
  const [groups, setGroups] = useState<Group[]>(['it', 'leads', 'legalcomms']);
  const [copied, setCopied] = useState(false);
  const count = (g: Group) => s.employees.filter((e) => e.group === g && e.role !== 'lead' && e.active).length;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this message:', text);
    }
  };
  return (
    <Section n="03" eyebrow="Messaging" title="Page your team" icon={Icon.chat}>
      <p className="mb-2.5 mt-4 text-[14px] leading-relaxed text-dim">Send from your <strong className="text-ink">personal phone</strong>, not company email. Pick a message, copy it, send it, then mark it sent.</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Message templates">
        {([['come', 'Come to the room'], ['stay', 'Stay home, offline'], ['clear', 'All clear']] as const).map(([id, t]) => (
          <button key={id} aria-pressed={tpl === id} onClick={() => { setTpl(id); setText(TEMPLATES[id]); }}
            className={`h-[38px] px-3 text-[11px] caps ${tpl === id ? 'bg-ink text-[#0D0D0F]' : 'border border-line2 text-dim hover:text-ink'}`}>{t}</button>
        ))}
      </div>
      <textarea aria-label="Message" rows={4} value={text} onChange={(e) => setText(e.target.value)} className="mt-3 w-full border border-line2 bg-[#0F0F12] px-3.5 py-3 text-[15px] leading-relaxed focus:border-gold focus:outline-none" />
      <fieldset className="mt-3">
        <legend className="text-[11px] caps tracking-[0.16em] text-dim">Send to</legend>
        {(Object.keys(GROUP_LABEL) as Group[]).map((g) => (
          <label key={g} className="flex items-center gap-2.5 border-b border-line py-2.5 text-[14px]">
            <input type="checkbox" checked={groups.includes(g)} onChange={(e) => setGroups((gs) => (e.target.checked ? [...gs, g] : gs.filter((x) => x !== g)))} className="size-5 accent-[#E8B53B]" />
            <span className="flex-1">{GROUP_LABEL[g]}</span>
            <span className="text-dim">{count(g)} people</span>
          </label>
        ))}
      </fieldset>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <button className={`${btnOutline} h-12`} onClick={copy}>{copied ? 'Copied' : 'Copy message'}</button>
        <button className={`${btnGold} h-12`} disabled={!groups.length} onClick={() => store.markPaged(groups)}>Mark as sent</button>
      </div>
      <p className="mt-2.5 text-[12px] text-faint">{s.incident.pagedAt ? `Last sent ${clock(s.incident.pagedAt)} to ${s.incident.pagedGroups.map((g) => GROUP_LABEL[g].toLowerCase()).join(', ')}. Logged on the timeline.` : 'Not sent yet.'}</p>
    </Section>
  );
}

function WhoIsHere() {
  const s = useStore();
  const inRoom = inRoomIds(s);
  const here = s.employees.filter((e) => e.role === 'lead' || inRoom.has(e.id));
  const paged = s.employees.filter((e) => e.role !== 'lead' && e.active && !inRoom.has(e.id) && s.incident.pagedGroups.includes(e.group));
  const approvedAt = (id: string) => s.requests.filter((r) => r.employeeId === id && r.status === 'approved').map((r) => r.decidedAt ?? 0).sort().pop();
  return (
    <Section n="04" eyebrow="In the room" title="Who’s here" icon={Icon.people} right={<span className="text-[11px] caps text-[#5BD08A]">{here.length} in</span>}>
      <ul>
        {here.map((e) => (
          <li key={e.id} className="flex items-center gap-3 border-b border-line py-3">
            <span className="size-2.5 rounded-full bg-[#5BD08A]" aria-hidden="true" />
            <div className="flex-1"><p className="text-[15px] font-bold">{e.name}</p><p className="text-[12.5px] text-dim">{e.role === 'lead' ? 'Incident Lead · key fob' : `${e.dept} · approved ${clock(approvedAt(e.id) ?? 0)}`}</p></div>
            {e.role !== 'lead' && <button className={`${btnRedOutline} h-[34px]`} onClick={() => window.confirm(`Remove ${e.name}'s access now?`) && store.revoke(e.id)}>Revoke</button>}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] caps tracking-[0.16em] text-dim">Paged, not here yet</p>
      <ul>
        {paged.length === 0 && <li className="py-3 text-[13px] text-dim">{s.incident.pagedAt ? 'Everyone you paged is here.' : 'Page your team first.'}</li>}
        {paged.map((e) => (
          <li key={e.id} className="flex items-center gap-3 border-b border-line py-3">
            <div className="flex-1"><p className="text-[15px] font-bold">{e.name}</p><p className="text-[12.5px] text-dim">{e.dept} · paged {clock(s.incident.pagedAt ?? 0)}</p></div>
            <button className={`${btnGoldOutline} h-[34px]`} onClick={() => store.nudge(e.id)}>Nudge</button>
          </li>
        ))}
      </ul>
    </Section>
  );
}
