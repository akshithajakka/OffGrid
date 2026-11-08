import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { btnGold, input } from '../../components/ui';
import { useStore } from '../../data/react';
import type { Employee } from '../../data/types';
import { EmployeeDashboard } from '../employee/EmployeeDashboard';
import { USE_MOCK } from '../../stdb/config';
import { useLiveTables } from '../../stdb/LiveTables';
import { store } from '../../data/store';

function useGateUnlocked(): boolean {
  const live = useLiveTables();
  const s = useStore();
  if (USE_MOCK) return !!s.incident.leadSession;
  return !!live?.systemState?.adminUnlocked;
}

function memberToEmployee(name: string, role: string, id: string): Employee {
  return {
    id,
    name,
    title: role,
    dept: 'IT',
    empId: id.slice(0, 8),
    cardId: '',
    role: 'it',
    group: 'it',
    teamId: null,
    reportsTo: 'Incident Lead',
    active: true,
  };
}

export function EmployeePathPage() {
  const unlocked = useGateUnlocked();
  const live = useLiveTables();
  const [name, setName] = useState('');
  const [role, setRole] = useState('IT');
  const [team, setTeam] = useState('Response');
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();
  const openedAt = useRef(Date.now() - 2000);
  const isConsole =
    !!live?.identity && !!live?.consoleReg && live.consoleReg.identity.isEqual(live.identity);

  // When a keycard is tapped at the box after this screen opened, jump to that keycard's page.
  // Goes through SpacetimeDB, so it works on any device on the OffGrid network.
  useEffect(() => {
    if (USE_MOCK || isConsole || !live) return;
    const fresh = live.accessRequests.find((r) => {
      if (r.status !== 'pending' || r.claimedBy) return false;
      const ms = Number(r.requestedAt.microsSinceUnixEpoch / 1000n);
      return ms >= openedAt.current;
    });
    if (fresh) navigate(`/employee/badge/${fresh.uid}`);
  }, [live?.accessRequests, isConsole, navigate]);

  if (!unlocked) return <Navigate to="/" replace />;

  const member =
    !USE_MOCK && live?.identity
      ? live.members.find((m) => m.identity.isEqual(live.identity!))
      : null;

  useEffect(() => {
    if (member) setSubmitted(true);
  }, [member]);

  if (member?.status === 'approved') {
    const me = memberToEmployee(member.name, member.role, member.identity.toHexString());
    return <EmployeeDashboard me={me} />;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (USE_MOCK) {
      store.requestJoin(name);
      setSubmitted(true);
      return;
    }
    await live?.reducers.requestAccess({ name, role, team });
    setSubmitted(true);
  };

  if (member?.status === 'denied' || member?.status === 'revoked') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#A31D17] px-6 text-center text-white">
        <div className="max-w-md">
          <h1 className="text-[28px] font-black uppercase">Access {member.status}</h1>
          <p className="mt-4 text-[17px]">Talk to the admin at the OffGrid box, then try again.</p>
        </div>
      </div>
    );
  }

  if (submitted || member) {
    const st = member?.status;
    const msg =
      st === 'badge_verified'
        ? 'Badge verified. Waiting for approval.'
        : 'Tap your badge at the OffGrid box.';
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-6 text-center">
        <p className="eyebrow">OffGrid · Employee</p>
        <h1 className="title text-[32px]">{member?.name ?? name}</h1>
        <p className="max-w-md text-[18px] text-dim">{msg}</p>
        {member?.joinCode && (
          <p className="text-[14px] text-faint">
            Join code <span className="font-mono text-ink">{member.joinCode}</span> (if admin uses keypad)
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-12">
      <p className="eyebrow">OffGrid · Employee</p>
      <h1 className="title text-[34px]">Request access</h1>
      <section className="border border-gold bg-[#2A2008] p-4">
        <p className="text-[15px] font-semibold">Tap your keycard at the OffGrid box, then pick your name here.</p>
        <ul className="mt-3 flex flex-col gap-2">
          {(live?.accessRequests ?? []).filter((r) => r.status !== 'denied').length === 0 && (
            <li className="text-[13px] text-faint">No keycard taps yet.</li>
          )}
          {(live?.accessRequests ?? [])
            .filter((r) => r.status !== 'denied')
            .map((r) => (
              <li key={r.uid}>
                <Link
                  to={`/employee/badge/${r.uid}`}
                  className="flex items-center justify-between border border-line2 bg-bg px-3 py-2 text-[15px] hover:border-gold"
                >
                  <span>
                    That's me: <b>{r.name}</b> · {r.team}
                  </span>
                  <span className="text-[12px] text-faint">{r.status}</span>
                </Link>
              </li>
            ))}
        </ul>
      </section>
      <p className="text-[13px] text-faint">No keycard? Request access by name instead:</p>
      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-dim">
          Name
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-dim">
          Role
          <input className={input} value={role} onChange={(e) => setRole(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-dim">
          Team
          <input className={input} value={team} onChange={(e) => setTeam(e.target.value)} required />
        </label>
        <button type="submit" className={btnGold}>
          Submit request
        </button>
      </form>
    </div>
  );
}
