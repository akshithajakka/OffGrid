import { useState, type ReactNode } from 'react';
import { Icon, btnGold, input } from '../../components/ui';
import { useNow, useStore } from '../../data/react';
import { store } from '../../data/store';
import type { JoinRequest } from '../../data/types';
import { JOIN_TTL, clock, empById, meEmployee, myRequest } from '../../lib/select';
import { EmployeeDashboard } from './EmployeeDashboard';

/*
 * Employee secure kit laptop (only network: OffGrid ESP32 AP). Three steps:
 * 1. type your name  →  2. tap your keycard at the box  →  3. the Lead approves  →  dashboard.
 */
export function EmployeeApp() {
  const s = useStore();
  const now = useNow(2000);
  const me = meEmployee(s, store.sid);
  if (me) return <EmployeeDashboard me={me} />;

  const r = myRequest(s, store.sid);
  const expired = r?.status === 'awaiting_card' && now - r.createdAt > JOIN_TTL;
  if (r && !expired && r.status === 'awaiting_card') return <Waiting r={r} stage={2} />;
  if (r && r.status === 'awaiting_lead') return <Waiting r={r} stage={3} />;

  const problem =
    expired ? 'That took too long, so we started over. Type your name again, then tap your card.'
    : r?.status === 'not_found' ? `We couldn’t find “${r.typed}” in the employee database. Check the spelling or use your employee ID (like E-10442).`
    : r?.status === 'lead_only' ? 'The Incident Lead signs in at the main computer with the key fob, not here.'
    : r?.status === 'denied' ? 'The Incident Lead didn’t approve this request. Talk to them at the box, then try again.'
    : r?.status === 'revoked' ? 'The Incident Lead removed your access. Talk to them if this is a mistake.'
    : null;
  return <JoinForm problem={problem} />;
}

function Shell({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  const s = useStore();
  const standby = s.incident.status !== 'active';
  return (
    <div className="flex min-h-screen flex-col">
      <div className={`flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 sm:px-10 ${standby ? 'bg-[#3A3A42]' : 'bg-alarm'}`}>
        <span className="flex items-center gap-3 text-[16px] font-extrabold uppercase [font-stretch:112%]">{Icon.target} {standby ? 'Waiting for the Incident Lead' : 'Incident active'}</span>
        <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/85">{s.incident.code} · {s.incident.kind}</span>
        <span className="text-[14px] sm:ml-auto">You’re on the private WARROOM network. No internet here, on purpose.</span>
      </div>
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-5 py-8 sm:px-10">
        <div><p className="eyebrow">Getting into the dashboard</p><h1 className="title mt-1.5 text-[34px]">{title}</h1></div>
        {standby && (
          <p className="border border-line2 bg-panel px-5 py-4 text-[15px]">The Incident Lead hasn’t started the protocol yet. You can type your name now; card taps work once the Lead taps their fob.</p>
        )}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
          <div className="flex min-w-0 flex-1 flex-col gap-5">{children}</div>
          <aside className="flex w-full flex-col gap-5 lg:w-[400px] lg:flex-none">{aside ?? <WhileYouWait />}</aside>
        </div>
      </main>
    </div>
  );
}

function Stepper({ stage, r }: { stage: 1 | 2 | 3; r?: JoinRequest }) {
  const s = useStore();
  const e = empById(s, r?.employeeId);
  const steps = [
    { title: 'Tell us who you are', done: e ? `${e.name} · ${e.dept} · ${e.empId}` : '', now: 'Type your name or employee ID below.' },
    { title: 'Tap your keycard at the box', done: r?.cardAt ? `Card tapped at ${clock(r.cardAt)}. Found in the employee database.` : '', now: 'Hold your keycard flat on the reader for 2 seconds.' },
    { title: 'Wait for the Incident Lead', done: '', now: 'The Lead checks your face and code, then approves you.' },
  ];
  return (
    <ol className="flex flex-wrap gap-3.5">
      {steps.map((st, i) => {
        const n = i + 1;
        const state = n < stage ? 'done' : n === stage ? 'now' : 'todo';
        return (
          <li key={n} aria-current={state === 'now' ? 'step' : undefined}
            className={`flex flex-[1_1_280px] gap-4 p-5 ${state === 'now' ? 'border-[3px] border-gold bg-[#1E1A0C]' : state === 'done' ? 'border border-line2 bg-panel' : 'border border-dashed border-line2'}`}>
            {state === 'done'
              ? <span className="flex size-11 flex-none items-center justify-center bg-green text-white">{Icon.check}</span>
              : <span className={`flex size-11 flex-none items-center justify-center text-[20px] font-black ${state === 'now' ? 'bg-gold text-[#1A1206]' : 'border border-line2 text-faint'}`}>{n}</span>}
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] caps tracking-[0.18em] text-dim">Step {n} · {state === 'done' ? 'done' : state === 'now' ? 'now' : 'next'}</span>
              <span className={`text-[19px] font-extrabold leading-tight ${state === 'todo' ? 'text-faint' : ''}`}>{st.title}</span>
              <span className="text-[14px] leading-relaxed text-dim">{state === 'done' ? st.done : st.now}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function JoinForm({ problem }: { problem: string | null }) {
  const [text, setText] = useState('');
  return (
    <Shell title="Get into the war room">
      <Stepper stage={1} />
      <section aria-labelledby="who" className="flex flex-col gap-5 border border-line bg-panel p-7">
        <h2 id="who" className="text-[26px] font-black uppercase [font-stretch:115%]">Who are you?</h2>
        {problem && <p role="alert" className="border-2 border-[#E5483D] bg-[#3A1A1A] px-5 py-4 text-[15px] font-semibold">{problem}</p>}
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (text.trim()) store.requestJoin(text); }}>
          <label htmlFor="who-input" className="text-[15px] text-dim">Type your full name or your employee ID. It’s on the back of your keycard.</label>
          <input id="who-input" autoFocus autoComplete="off" placeholder="e.g. Priya Nair or E-10442" value={text} onChange={(e) => setText(e.target.value)} className={`${input} h-16 text-[22px]`} />
          <button disabled={!text.trim()} className={`${btnGold} h-14 self-start px-8 text-[14px]`}>Continue</button>
        </form>
        <p className="text-[13px] text-faint">Next you’ll tap your keycard at the box. The Incident Lead then lets you in.</p>
      </section>
    </Shell>
  );
}

function Waiting({ r, stage }: { r: JoinRequest; stage: 2 | 3 }) {
  const s = useStore();
  const e = empById(s, r.employeeId);
  return (
    <Shell title={`Almost in, ${e?.name.split(' ')[0] ?? ''}`}>
      <Stepper stage={stage} r={r} />
      <section aria-live="polite" className="flex flex-1 flex-col items-center justify-center gap-5 border border-line bg-panel px-7 py-10 text-center">
        {stage === 2 ? (
          <>
            <span className="text-gold">{Icon.card}</span>
            <h2 className="text-[32px] font-black uppercase [font-stretch:115%]">Now tap your keycard at the box</h2>
            <p className="max-w-xl text-[18px] leading-relaxed text-dim">Walk to the box by the main computer. Hold your keycard flat on the reader for 2 seconds. This screen changes when it’s read.</p>
          </>
        ) : (
          <>
            <div aria-hidden="true" className="size-[120px] animate-spin rounded-full border-8 border-[#2A2A30] border-r-gold border-t-gold [animation-duration:2.5s]" />
            <h2 className="text-[32px] font-black uppercase [font-stretch:115%]">Waiting for approval</h2>
            <p className="max-w-xl text-[18px] leading-relaxed text-dim">Your card checks out. Show the Incident Lead this code at the box.</p>
          </>
        )}
        <div className="border-[3px] border-gold px-12 py-3.5">
          <span className="sr-only">Your code: </span>
          <span className="text-[110px] font-black leading-none tracking-[0.08em] text-gold">{r.code}</span>
        </div>
        <p className="text-[15px]">Your dashboard opens by itself. Don’t refresh or close this screen.</p>
        <button className="text-[13px] text-dim underline" onClick={() => store.startOver()}>Not you? Start over</button>
      </section>
    </Shell>
  );
}

function WhileYouWait() {
  return (
    <>
      <section aria-labelledby="ww" className="border border-line bg-panel p-6">
        <h2 id="ww" className="title text-[22px]">While you wait</h2>
        <ul className="mt-4 flex flex-col gap-3.5">
          {[
            'Keep this kit laptop on the OffGrid network only—do not reconnect to corporate Wi‑Fi or VPN.',
            'Don’t open company email, Teams or shared drives.',
            'Don’t restart or unplug anything, even if it looks broken.',
            'Write down anything odd you noticed today. You’ll report it inside.',
          ].map((t) => (
            <li key={t}>
              <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-relaxed">
                <input type="checkbox" className="mt-0.5 size-[22px] flex-none accent-[#E8B53B]" />{t}
              </label>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="hw" className="border border-line2 p-6">
        <h2 id="hw" className="text-[13px] caps tracking-[0.18em] text-dim">If something goes wrong</h2>
        <ul className="mt-3.5 flex flex-col gap-3 text-[14px] leading-relaxed">
          <li><strong>Card not found?</strong><br /><span className="text-dim">Tell the Incident Lead. They can check the employee database.</span></li>
          <li><strong>Tapped your card first?</strong><br /><span className="text-dim">No problem. Type your name here, then tap again.</span></li>
          <li><strong>Closed this screen?</strong><br /><span className="text-dim">Open the War Room shortcut again and type your name.</span></li>
        </ul>
      </section>
    </>
  );
}
