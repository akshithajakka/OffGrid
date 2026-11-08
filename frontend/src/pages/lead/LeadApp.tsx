import { useEffect, useRef, useState } from 'react';
import { Header } from '../../components/Header';
import { Icon } from '../../components/ui';
import { useNow, useStore } from '../../data/react';
import { store } from '../../data/store';
import { useFobListener } from '../../lib/fob';
import { inRoomIds, isLead, pendingApprovals } from '../../lib/select';
import { beep } from '../../lib/sound';
import { AccessPage } from './AccessPage';
import { Gate } from './Gate';
import { Overview } from './Overview';
import { TasksPage } from './TasksPage';

export type LeadTab = 'overview' | 'access' | 'tasks';

/*
 * The main computer the board is plugged into. Every card or fob tapped on the reader
 * arrives here as a typed line and goes to store.cardTap(), which decides what it means.
 */
export function LeadApp({ tab }: { tab: LeadTab }) {
  const s = useStore();
  const now = useNow(1000);
  const lead = isLead(s, store.sid);
  useFobListener((id) => store.cardTap(id));

  // Sound for every box event, and a chime when someone new is waiting.
  const lastNotice = useRef(s.notice?.at ?? 0);
  useEffect(() => {
    if (s.notice && s.notice.at > lastNotice.current) {
      lastNotice.current = s.notice.at;
      if (s.notice.tone === 'bad') beep(2, 300);
      else if (s.notice.tone === 'ok') beep(1, 880);
      else beep(1, 600);
    }
  }, [s.notice]);
  const pending = pendingApprovals(s).length;
  const lastPending = useRef(pending);
  useEffect(() => {
    if (pending > lastPending.current) beep(2, 660);
    lastPending.current = pending;
  }, [pending]);

  const notice = s.notice && now - s.notice.at < 7000 ? s.notice : null;
  if (!lead) return <Gate notice={notice} />;

  return (
    <div className="min-h-screen bg-bg">
      <Header roleLabel="Lead · admin" name="Maria Lopez" right={<LeadHeaderRight />} />
      <nav aria-label="Lead dashboard" className="flex flex-wrap items-center gap-1 border-b border-line bg-[#111114] px-5 sm:px-8">
        {([['overview', 'Overview', '#/lead'], ['access', 'Access control', '#/lead/access'], ['tasks', 'Tasks', '#/lead/tasks']] as const).map(([id, text, href]) => (
          <a key={id} href={href} aria-current={tab === id ? 'page' : undefined}
            className={`flex h-12 items-center gap-2 px-5 text-[12px] caps ${tab === id ? 'bg-ink text-[#0D0D0F]' : 'text-dim hover:text-ink'}`}>
            {text}
            {id === 'access' && pending > 0 && <span className="flex h-[22px] min-w-[22px] items-center justify-center bg-gold px-1.5 text-[12px] font-extrabold text-[#1A1206]">{pending}</span>}
          </a>
        ))}
        <span className="ml-auto hidden items-center gap-2 py-3 text-[13px] text-dim md:flex">{Icon.lock} Every action is logged and can’t be undone</span>
      </nav>
      {notice && (
        <p role="status" className={`border-b-2 px-5 py-3 text-center text-[16px] font-semibold sm:px-8 ${
          notice.tone === 'bad' ? 'border-[#E5483D] bg-[#3A1A1A]' : notice.tone === 'warn' ? 'border-gold bg-[#2A2008]' : 'border-green bg-[#0E2417]'
        }`}>
          {notice.text}
        </p>
      )}
      {tab === 'overview' && <Overview />}
      {tab === 'access' && <AccessPage />}
      {tab === 'tasks' && <TasksPage />}
    </div>
  );
}

function LeadHeaderRight() {
  const s = useStore();
  const [confirm, setConfirm] = useState(false);
  const active = s.incident.status === 'active';
  return (
    <>
      <span className="flex items-center gap-2 text-[14px] font-semibold">{Icon.people} {inRoomIds(s).size + 1} in the room</span>
      {active && !confirm && <button className="h-10 bg-white px-4 text-[12px] caps text-[#B3221B]" onClick={() => setConfirm(true)}>Resolve incident</button>}
      {active && confirm && (
        <span className="flex items-center gap-2 text-sm">
          Resolve for everyone?
          <button className="h-10 bg-white px-4 text-[12px] caps text-[#B3221B]" onClick={() => { store.resolve(); setConfirm(false); }}>Yes, resolve</button>
          <button className="h-10 px-2 underline" onClick={() => setConfirm(false)}>Cancel</button>
        </span>
      )}
      {!active && <a href="#/report" className="flex h-10 items-center bg-white px-4 text-[12px] caps text-[#1F5E3D]">Final report</a>}
    </>
  );
}
