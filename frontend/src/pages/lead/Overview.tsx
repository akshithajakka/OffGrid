import { BarList, BlockRows, ChartTitle, InfectionLine } from '../../components/Charts';
import { Chip, Icon, Section, StepsBar, btnGold } from '../../components/ui';
import { useNow, useStore } from '../../data/react';
import { CHIP, SYS_HEX } from '../../lib/meta';
import { awaitingCard, empById, hhmm, lane, pendingApprovals } from '../../lib/select';
import { BuildingMap, Chat, Counsel, DataAffected, SystemsTable, Timeline, kpiCounts, useNoticeClock } from './panels';

/* A2: Lead overview with graphs. */
export function Overview() {
  const s = useStore();
  const now = useNow(5000);
  const pending = pendingApprovals(s);
  const tapping = awaitingCard(s, now);
  const k = kpiCounts(s);
  const notice = useNoticeClock();
  const teamsIn = s.teams.map((t) => {
    const sys = s.systems.filter((x) => x.teamId === t.id);
    return { label: t.name, filled: sys.filter((x) => x.status !== 'unchecked').length, total: sys.length };
  });
  const late = s.incident.declaredAt ? now - s.incident.declaredAt > 30 * 60_000 : false;
  const overdue = teamsIn.filter((t) => t.filled === 0).length;
  const escalated = s.tasks.filter((t) => lane(t, now) === 'escalated').length;

  const steps = [
    { text: s.incident.pagedAt ? 'Page your team · sent' : 'Page your team (Access control)', state: s.incident.pagedAt ? 'done' : 'now' },
    { text: pending.length ? `Approve people at the box · ${pending.length} waiting` : 'Approve people as they tap in', state: s.incident.pagedAt ? (pending.length ? 'now' : 'done') : 'todo' },
    { text: 'Assign tasks to a person or open to anyone', state: s.tasks.length ? 'done' : s.incident.pagedAt && !pending.length ? 'now' : 'todo' },
    { text: 'Watch the board. Resolve when clean.', state: s.tasks.length && !pending.length ? 'now' : 'todo' },
  ] as const;

  const kpi = (title: string, value: string | number, sub: string, bar: string, sq: string, gold = false) => (
    <div key={title} className={`border border-line border-l-[3px] bg-panel px-5 py-5 ${bar}`}>
      <p className={`flex items-center gap-2 text-[12px] caps ${gold ? 'text-gold' : ''}`}>{!gold && <span className={`size-2.5 ${sq}`} aria-hidden="true" />}{title}</p>
      <p className={`mt-2 text-[34px] font-extrabold leading-none tabular-nums [font-stretch:110%] ${gold ? 'text-gold' : ''}`}>{value}</p>
      <p className="mt-3 text-[12px] uppercase tracking-[0.04em] text-dim">{sub}</p>
    </div>
  );

  return (
    <>
      <StepsBar title="What to do now" calm="Take it one step at a time. Nothing on this screen can break a computer." steps={steps.map((x) => ({ ...x }))} />
      <main className="mx-auto flex max-w-[1440px] flex-col gap-5 px-4 py-6 sm:px-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {kpi('Down', k.down, `of ${s.systems.length} systems`, 'border-l-[#C8261D]', 'bg-[#C8261D]')}
          {kpi('Encrypted', k.encrypted, `of ${s.systems.length} systems`, 'border-l-[#C8261D]', 'bg-[#C8261D]')}
          {kpi('Suspected', k.suspected, 'waiting on IT check', 'border-l-[#D99A2B]', 'bg-[#D99A2B]')}
          {kpi('Contained', k.contained, 'isolated on purpose', 'border-l-[#2F6FE0]', 'bg-[#2F6FE0]')}
          {kpi('Unchecked', k.unchecked, overdue ? `${overdue} teams not in` : 'all teams reporting', 'border-l-[#55555E]', 'border border-[#8F8F99]')}
          {kpi('Notice clock', notice == null ? '—' : hhmm(notice), notice == null ? 'starts if data is stolen' : `hrs left · GDPR ${s.incident.noticeHours}h example`, 'border-l-gold', '', true)}
        </div>

        <Section n="01" eyebrow="At a glance" title="Incident graphs" icon={Icon.chart}>
          <div className="grid gap-7 pt-5 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
            <div className="flex flex-col gap-3.5">
              <ChartTitle title="Systems by status" note={`${s.systems.length} systems`} />
              <BarList label="Systems by status" max={Math.max(4, k.unchecked)} rows={[
                { label: 'Encrypted', value: k.encrypted, color: SYS_HEX.encrypted }, { label: 'Down', value: k.down, color: SYS_HEX.down },
                { label: 'Suspected', value: k.suspected, color: SYS_HEX.suspected }, { label: 'Contained', value: k.contained, color: SYS_HEX.contained },
                { label: 'Working', value: k.working, color: SYS_HEX.working }, { label: 'Unchecked', value: k.unchecked, color: SYS_HEX.unchecked },
              ]} />
            </div>
            <div className="flex flex-col gap-3.5">
              <ChartTitle title="Infected desks over time" note={s.infection.length ? `${s.desks.filter((d) => d.status === 'infected').length} now` : undefined} />
              <InfectionLine points={s.infection} start={s.incident.declaredAt} />
            </div>
            <div className="flex flex-col gap-3.5">
              <ChartTitle title="Systems reported by team" note={overdue ? `${overdue} teams not in` : 'All teams in'} noteClass={overdue ? 'text-[#FF6A5F]' : 'text-[#5BD08A]'} />
              <BlockRows label="Systems reported per team" rows={teamsIn.map((t) => ({ ...t, late: late && t.filled === 0 }))} />
              <p className="text-[12px] text-faint">Green = reported. Dark red = no report 30 minutes in.</p>
            </div>
          </div>
        </Section>

        <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            {pending.length > 0 ? (
              <div className="flex flex-wrap items-center gap-x-7 gap-y-4 border-[3px] border-gold bg-[#1E1A0C] px-6 py-5">
                <div className="min-w-[280px] flex-1">
                  <p className="text-[12px] caps tracking-[0.2em] text-gold">Access control · action needed</p>
                  <p className="mt-1.5 text-[26px] font-extrabold uppercase [font-stretch:112%]">{pending.length} {pending.length === 1 ? 'person is' : 'people are'} waiting at the box</p>
                  <p className="mt-1.5 text-[14px] text-dim">{pending.map((r) => empById(s, r.employeeId)?.name).join(', ')} tapped their cards and were found in the employee database.</p>
                </div>
                <a href="#/lead/access" className={`${btnGold} h-14 text-[13px]`}>Review and approve</a>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4 border border-line bg-panel px-6 py-4">
                <p className="text-[14px] text-dim">
                  {tapping.length ? `${tapping.length} ${tapping.length === 1 ? 'person has' : 'people have'} typed their name and should tap their card next.` : 'Nobody is waiting at the box.'}
                  {!s.incident.pagedAt && ' You haven’t paged your team yet.'}
                </p>
                <a href="#/lead/access" className="text-[13px] text-gold underline">{s.incident.pagedAt ? 'Open access control' : 'Page your team'}</a>
              </div>
            )}
            {escalated > 0 && (
              <a href="#/lead/tasks" className="flex flex-wrap items-center gap-4 border-2 border-[#B3221B] bg-[#1E0F0E] px-5 py-4">
                <Chip label="Escalated" cls={CHIP.RED} />
                <span className="text-[15px] font-semibold">{escalated} {escalated === 1 ? 'task has' : 'tasks have'} no reply after 5 minutes.</span>
                <span className="ml-auto text-[13px] text-gold underline">Open tasks</span>
              </a>
            )}
            <SystemsTable n="02" limit={6} />
            <BuildingMap n="03" />
          </div>
          <aside className="flex w-full flex-col gap-5 xl:w-[400px] xl:flex-none">
            <Counsel n="04" />
            <DataAffected n="05" />
            <Timeline n="06" />
            <Chat n="07" asLead />
          </aside>
        </div>
      </main>
    </>
  );
}
