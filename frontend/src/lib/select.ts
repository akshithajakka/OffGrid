import type { Employee, Group, JoinRequest, State, Task } from '../data/types';

export const MIN = 60_000;
export const JOIN_TTL = 10 * MIN;       // name typed but no card tap → request expires
export const ESCALATE_MS = 5 * MIN;     // task not acknowledged → escalates to the Lead

export const GROUP_LABEL: Record<Group, string> = {
  it: 'IT responders', leads: 'Team leads', legalcomms: 'Legal and comms', everyone: 'Everyone else',
};

export const empById = (s: State, id: string | null | undefined) => s.employees.find((e) => e.id === id) ?? null;
export const empName = (s: State, id: string | null | undefined) => empById(s, id)?.name ?? 'Anyone';
export const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export function myRequest(s: State, sid: string): JoinRequest | null {
  const mine = s.requests.filter((r) => r.sessionId === sid);
  return mine.length ? mine.reduce((a, b) => (b.createdAt >= a.createdAt ? b : a)) : null;
}

export const isLead = (s: State, sid: string) => s.incident.leadSession === sid && s.incident.status !== 'standby';

/** The approved employee using this device, if any. */
export function meEmployee(s: State, sid: string): Employee | null {
  const r = myRequest(s, sid);
  if (!r || r.status !== 'approved') return null;
  const e = empById(s, r.employeeId);
  return e && e.active ? e : null;
}

export const inRoomIds = (s: State) =>
  new Set(s.requests.filter((r) => r.status === 'approved' && r.employeeId).map((r) => r.employeeId as string));

export const pendingApprovals = (s: State) =>
  s.requests.filter((r) => r.status === 'awaiting_lead').sort((a, b) => (a.cardAt ?? 0) - (b.cardAt ?? 0));

export const awaitingCard = (s: State, now: number) =>
  s.requests.filter((r) => r.status === 'awaiting_card' && now - r.createdAt < JOIN_TTL);

export type TaskLane = 'anyone' | 'waiting' | 'escalated' | 'progress' | 'done';
export function lane(t: Task, now: number): TaskLane {
  if (t.status === 'done') return 'done';
  // Urgent open-to-anyone tasks also have to be claimed within 5 minutes.
  if (!t.assigneeId) return t.urgent && t.status === 'open' && now - t.createdAt > ESCALATE_MS ? 'escalated' : 'anyone';
  if (t.status === 'acknowledged') return 'progress';
  return now - t.createdAt > ESCALATE_MS ? 'escalated' : 'waiting';
}

export const clock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
export const clockSec = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
export const minSec = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
export const hhmm = (ms: number) => {
  const m = Math.max(0, Math.floor(ms / MIN));
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
};
export const dhms = (ms: number): number[] => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
};
export const bytes = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);
