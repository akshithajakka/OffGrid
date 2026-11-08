import type { Infer } from 'spacetimedb';
import type AssetRow from '../module_bindings/asset_table';
import type IncidentRow from '../module_bindings/incident_table';
import type LogEntryRow from '../module_bindings/log_entry_table';
import type MachineRow from '../module_bindings/machine_table';
import type MemberRow from '../module_bindings/member_table';
import type MessageRow from '../module_bindings/message_table';
import type TaskRow from '../module_bindings/task_table';
import { freshState } from '../data/seed';
import type { DataItem, JoinRequest, State, SysStatus, Tone } from '../data/types';

type Member = Infer<typeof MemberRow>;
type Machine = Infer<typeof MachineRow>;
type Asset = Infer<typeof AssetRow>;
type Incident = Infer<typeof IncidentRow>;
type LogRow = Infer<typeof LogEntryRow>;
type Msg = Infer<typeof MessageRow>;
type Task = Infer<typeof TaskRow>;

function tsMs(t: { microsSinceUnixEpoch: bigint } | undefined): number {
  if (!t) return Date.now();
  return Number(t.microsSinceUnixEpoch / 1000n);
}

const MACHINE_TO_SYS: Record<string, SysStatus> = {
  Unchecked: 'unchecked',
  Suspected: 'suspected',
  Infected: 'encrypted',
  Contained: 'contained',
  Clean: 'working',
};

const ASSET_TO_DATA: Record<string, DataItem['status']> = {
  'Under review': 'unknown',
  Suspected: 'possible_exfil',
  Locked: 'locked',
  Exfiltrated: 'exfiltrated',
  Exfil: 'exfiltrated',
  Clean: 'safe',
  Restored: 'safe',
};

export function mapMembersToRequests(members: readonly Member[], device: string): JoinRequest[] {
  return members
    .filter((m) => m.status === 'pending' || m.status === 'approved')
    .map((m) => ({
      id: m.identity.toHexString(),
      sessionId: m.identity.toHexString(),
      employeeId: null,
      typed: m.name,
      device,
      status: m.status === 'approved' ? 'approved' : m.status === 'revoked' ? 'revoked' : 'awaiting_lead',
      code: m.joinCode,
      createdAt: tsMs(m.requestedAt),
      cardAt: null,
      decidedAt: m.status === 'approved' ? tsMs(m.requestedAt) : null,
    }));
}

export function mapTablesToState(input: {
  members: readonly Member[];
  machines: readonly Machine[];
  assets: readonly Asset[];
  incident: Incident | undefined;
  log: readonly LogRow[];
  messages: readonly Msg[];
  tasks: readonly Task[];
  sid: string;
}): State {
  const base = freshState();
  const { members, machines, assets, incident, log, messages, tasks, sid } = input;

  if (incident) {
    base.incident = {
      ...base.incident,
      code: incident.title || 'INC-001',
      kind: incident.summary || 'Cyber incident',
      severity: incident.severity,
      status: incident.active ? 'active' : incident.declaredAt ? 'resolved' : 'standby',
      declaredAt: incident.declaredAt ? tsMs(incident.declaredAt) : null,
      leadSession: incident.active ? sid : null,
    };
  }

  for (const m of machines) {
    const label = m.label;
    const sys = base.systems.find((s) => s.code === label || s.id === `sys-${label}`);
    if (sys) {
      sys.status = MACHINE_TO_SYS[m.status] ?? 'unchecked';
      sys.confirmed = m.status !== 'Unchecked';
      sys.at = tsMs(m.updatedAt);
    }
    const desk = base.desks.find((d) => d.id === `d-${label}` || d.id === label);
    if (desk) {
      const ds =
        m.status === 'Infected'
          ? 'infected'
          : m.status === 'Suspected'
            ? 'suspected'
            : m.status === 'Contained'
              ? 'contained'
              : m.status === 'Clean'
                ? 'clean'
                : 'unchecked';
      desk.status = ds;
    }
  }

  base.requests = mapMembersToRequests(members, 'Laptop');

  base.data = assets.map((a) => ({
    id: String(a.id),
    name: a.name,
    source: a.kind,
    status: ASSET_TO_DATA[a.status] ?? 'unknown',
  }));

  base.log = log.map((e) => ({
    id: String(e.id),
    at: tsMs(e.at),
    title: e.actor,
    sub: e.text,
    tone: (e.phase === 'Contain' ? 'amber' : 'blue') as Tone,
  }));

  base.messages = messages.map((m) => ({
    id: String(m.id),
    at: tsMs(m.sent),
    authorId: m.senderName,
    text: m.text,
    pinned: false,
  }));

  base.tasks = tasks.map((t) => ({
    id: String(t.id),
    title: t.text,
    detail: '',
    assigneeId: t.assigneeName,
    status:
      t.status === 'acknowledged' ? 'acknowledged' : t.status === 'done' ? 'done' : 'open',
    urgent: t.escalated,
    dueAt: null,
    createdAt: tsMs(t.createdAt),
    ackedAt: t.ackedAt ? tsMs(t.ackedAt) : null,
    doneAt: null,
    pings: t.escalated ? 1 : 0,
  }));

  return base;
}
