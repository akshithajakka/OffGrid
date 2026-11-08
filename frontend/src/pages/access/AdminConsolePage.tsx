import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { LeadApp, type LeadTab } from '../lead/LeadApp';
import { btnGold, btnOutline, input } from '../../components/ui';
import { USE_MOCK } from '../../stdb/config';
import { useLiveTables } from '../../stdb/LiveTables';
import { useLastTap } from '../../hooks/useBoxKeys';
import { clockSec } from '../../lib/select';
import { store } from '../../data/store';
import { pushToast } from '../../components/Toast';

const CONSOLE_KEY = 'offgrid-console-registered';

function useHashTab(): LeadTab {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const f = () => setHash(window.location.hash);
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  const tab = (hash.split('/')[2] as LeadTab) || 'overview';
  return ['overview', 'access', 'tasks'].includes(tab) ? tab : 'overview';
}

export function AdminConsolePage() {
  const live = useLiveTables();
  const tab = useHashTab();
  const [pin, setPin] = useState('');
  const [regName, setRegName] = useState('');
  const [regTeam, setRegTeam] = useState('IT');
  const [regRole, setRegRole] = useState('employee');
  const [manualUid, setManualUid] = useState('');

  const consoleOk = useMemo(() => {
    if (USE_MOCK) return localStorage.getItem(CONSOLE_KEY) === '1';
    if (!live?.identity || !live.consoleReg) return localStorage.getItem(CONSOLE_KEY) === '1';
    return live.consoleReg.identity.isEqual(live.identity) || localStorage.getItem(CONSOLE_KEY) === '1';
  }, [live?.consoleReg, live?.identity]);

  // The Pico listener runs app-wide (GlobalBoxKeys); this just shows the last tap.
  const lastTap = useLastTap();

  const pending = (live?.members ?? []).filter(
    (m) => m.status === 'awaiting_badge' || m.status === 'badge_verified'
  );
  const box = live?.boxStatus;
  const keycardPending = (live?.accessRequests ?? []).filter((r) => r.status === 'pending');
  const keycardDone = (live?.accessRequests ?? []).filter((r) => r.status !== 'pending');

  const registerConsole = async (e: FormEvent) => {
    e.preventDefault();
    if (USE_MOCK) {
      localStorage.setItem(CONSOLE_KEY, '1');
      pushToast('Console registered (mock)', 'ok');
      return;
    }
    const ok = await live?.reducers.registerConsole({ pin });
    if (ok) localStorage.setItem(CONSOLE_KEY, '1');
  };

  if (!consoleOk) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
        <h1 className="title text-[30px]">Register this laptop as the console</h1>
        <p className="text-[15px] text-dim">One-time setup PIN (default demo: 2468).</p>
        <form className="flex flex-col gap-3" onSubmit={registerConsole}>
          <input className={input} type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Setup PIN" />
          <button type="submit" className={btnGold}>
            Register console
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {box && (
        <h2
          role="status"
          className={`px-6 py-4 text-center text-[18px] font-bold ${box.ok ? 'bg-[#0d3d24] text-[#9dffc8]' : 'bg-[#4a1212] text-[#ffc9c9]'}`}
        >
          {box.text}
        </h2>
      )}
      <div className="border-b border-line2 bg-panel px-6 py-4">
        <BoxIndicator lastTap={lastTap} registerMode={live?.registerMode} />
        <section className="mt-4">
          <h3 className="text-[13px] font-bold uppercase tracking-wide text-gold">Keycard approval requests</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {keycardPending.length === 0 && (
              <li className="text-[14px] text-faint">No keycard requests. An employee taps their card at the box to request access.</li>
            )}
            {keycardPending.map((r) => (
              <li key={r.uid} className="flex flex-wrap items-center gap-3 border-2 border-gold bg-[#2A2008] px-4 py-3">
                <span className="min-w-0 flex-1 text-[16px] font-bold">
                  {r.name} <span className="font-normal text-dim">· {r.team} · keycard {r.uid}</span>
                  <span className="ml-2 text-[12px] font-normal text-faint">requested {new Date(Number(r.requestedAt.microsSinceUnixEpoch / 1000n)).toLocaleTimeString()}</span>
                </span>
                <button type="button" className={btnGold + ' h-10'} onClick={() => live?.reducers.approveRequest({ uid: r.uid })}>
                  Approve
                </button>
                <button type="button" className={btnOutline + ' h-10'} onClick={() => live?.reducers.denyRequest({ uid: r.uid })}>
                  Deny
                </button>
              </li>
            ))}
          </ul>
          {keycardDone.length > 0 && (
            <p className="mt-2 text-[12px] text-faint">
              Decided: {keycardDone.map((r) => `${r.name} (${r.status})`).join(', ')}
            </p>
          )}
        </section>
        <section className="mt-4">
          <h3 className="text-[13px] font-bold uppercase tracking-wide text-dim">Pending access</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {pending.length === 0 && <li className="text-[14px] text-faint">No pending requests.</li>}
            {pending.map((m) => (
              <li key={m.identity.toHexString()} className="flex flex-wrap items-center gap-2 border border-line2 bg-bg px-3 py-2">
                <span className="min-w-0 flex-1 text-[14px] font-semibold">
                  {m.name} · {m.role} · {m.team}{' '}
                  <span className="text-faint">({m.status.replace('_', ' ')})</span>
                </span>
                <button
                  type="button"
                  className={btnOutline}
                  disabled={m.status !== 'badge_verified'}
                  title={m.status !== 'badge_verified' ? 'Waiting for badge tap' : 'Approve access'}
                  onClick={() =>
                    USE_MOCK
                      ? store.approve(m.identity.toHexString())
                      : live?.reducers.approve({ who: m.identity })
                  }
                >
                  Approve
                </button>
                <button
                  type="button"
                  className={btnOutline}
                  onClick={() =>
                    USE_MOCK ? store.deny(m.identity.toHexString()) : live?.reducers.deny({ who: m.identity })
                  }
                >
                  Deny
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <form
            className="flex flex-col gap-2 border border-line2 p-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (USE_MOCK) {
                pushToast('Badge registration needs live Spacetime', 'ok');
                return;
              }
              await live?.reducers.startBadgeRegistration({ name: regName, team: regTeam, role: regRole });
              pushToast('Tap the new badge now (60 s)', 'ok');
            }}
          >
            <h3 className="text-[13px] font-bold uppercase text-dim">Register a badge</h3>
            <input className={input} placeholder="Name" value={regName} onChange={(e) => setRegName(e.target.value)} required />
            <input className={input} placeholder="Team" value={regTeam} onChange={(e) => setRegTeam(e.target.value)} required />
            <select className={input} value={regRole} onChange={(e) => setRegRole(e.target.value)}>
              <option value="employee">employee</option>
              <option value="team_lead">team_lead</option>
              <option value="admin">admin</option>
            </select>
            <button type="submit" className={btnGold}>
              Start registration
            </button>
          </form>
          <p className="text-[14px] text-dim">
            Or type a known UID:{' '}
            <form
              className="mt-2 flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                await live?.reducers.registerBadge({
                  uid: manualUid,
                  name: regName || 'Badge holder',
                  team: regTeam,
                  role: regRole,
                });
              }}
            >
              <input className={input} value={manualUid} onChange={(e) => setManualUid(e.target.value)} placeholder="UID" />
              <button type="submit" className={btnOutline}>
                Add
              </button>
            </form>
          </p>
        </section>
        <ul className="mt-4 flex flex-col gap-1 text-[13px]">
          {(live?.badges ?? []).map((b) => (
            <li key={b.uid} className="flex items-center gap-2 border border-line2 px-2 py-1">
              <span className="flex-1 font-mono">
                {b.uid} — {b.name} ({b.team}, {b.role})
              </span>
              {b.role !== 'admin' && (
                <button type="button" className="text-[12px] underline" onClick={() => live?.reducers.removeBadge({ uid: b.uid })}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
      <LeadApp tab={tab} skipFobListener />
    </div>
  );
}

function BoxIndicator({
  lastTap,
  registerMode,
}: {
  lastTap: { uid: string; at: number } | null;
  registerMode: { name: string; until: { microsSinceUnixEpoch: bigint } } | undefined;
}) {
  return (
    <p className="text-[13px] text-dim">
      Box connected
      {lastTap ? (
        <>
          {' '}
          · last tap <span className="font-mono text-ink">{lastTap.uid}</span> {clockSec(lastTap.at)}
        </>
      ) : (
        ' · waiting for !F / !P / !C from Pico'
      )}
      {registerMode && (
        <span className="ml-3 text-gold">
          Registering badge for {registerMode.name} until tap window closes
        </span>
      )}
    </p>
  );
}
