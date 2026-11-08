import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Employee } from '../../data/types';
import { EmployeeDashboard } from '../employee/EmployeeDashboard';
import { useLiveTables } from '../../stdb/LiveTables';

function toEmployee(name: string, team: string, uid: string): Employee {
  return {
    id: uid,
    name,
    title: team,
    dept: team,
    empId: uid,
    cardId: uid,
    role: 'it',
    group: 'it',
    teamId: null,
    reportsTo: 'Incident Lead',
    active: true,
  };
}

/** Employee authentication page opened by a keycard tap: /employee/badge/:uid */
export function EmployeeBadgePage() {
  const { uid = '' } = useParams();
  const id = uid.toUpperCase();
  const live = useLiveTables();
  const req = live?.accessRequests.find((r) => r.uid === id);
  const badge = live?.badges.find((b) => b.uid === id);
  const isConsole =
    !!live?.identity && !!live?.consoleReg && live.consoleReg.identity.isEqual(live.identity);

  // On an employee's own computer, link this device to the request so it gets its own access.
  const claimed = useRef(false);
  useEffect(() => {
    if (!live || !req || isConsole || claimed.current) return;
    const mine = req.claimedBy && live.identity && req.claimedBy.isEqual(live.identity);
    if (!mine && req.status !== 'denied') {
      claimed.current = true;
      void live.reducers.claimRequest({ uid: id });
    }
  }, [live, req, isConsole, id]);

  if (req?.status === 'approved') {
    return <EmployeeDashboard me={toEmployee(req.name, req.team, id)} />;
  }

  const name = req?.name ?? badge?.name ?? 'Unknown keycard';
  const team = req?.team ?? badge?.team ?? '';
  const denied = req?.status === 'denied';

  return (
    <div className={`flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center ${denied ? 'bg-[#A31D17] text-white' : 'bg-bg'}`}>
      <p className="eyebrow">OffGrid · Employee authentication</p>
      <h1 className="title text-[36px]">{name}</h1>
      {team && <p className="text-[16px] text-dim">{team} · keycard <span className="font-mono">{id}</span></p>}
      {!req && !badge && (
        <p className="max-w-md text-[18px]">This keycard is not registered. Ask the admin to register it.</p>
      )}
      {!req && badge && <p className="max-w-md text-[18px] text-dim">Tap this keycard at the OffGrid box to send an approval request.</p>}
      {req?.status === 'pending' && (
        <>
          <div className="flex items-center gap-3 text-[20px] font-bold text-gold">
            <span className="inline-block size-3 animate-pulse rounded-full bg-gold" /> Keycard verified
          </div>
          <p className="max-w-md text-[18px] text-dim">Approval request sent to the admin. This page opens your dashboard automatically when you are approved.</p>
        </>
      )}
      {denied && <p className="max-w-md text-[18px]">Access denied by the admin. Talk to the admin at the OffGrid box.</p>}
      <Link to="/" className="text-[13px] underline text-faint">Back to gate</Link>
    </div>
  );
}
