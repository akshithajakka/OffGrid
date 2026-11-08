import type { Infer } from 'spacetimedb';
import type AssetRow from '../module_bindings/asset_table';
import type IncidentRow from '../module_bindings/incident_table';
import type LogEntryRow from '../module_bindings/log_entry_table';
import type MachineRow from '../module_bindings/machine_table';
import type MemberRow from '../module_bindings/member_table';
import type MessageRow from '../module_bindings/message_table';
import type TaskRow from '../module_bindings/task_table';
import type SystemReportRow from '../module_bindings/system_report_table';
import type SystemStateRow from '../module_bindings/system_state_table';
import { freshState } from '../data/seed';
import type { DataItem, JoinRequest, State, SysStatus, Tone } from '../data/types';

type Member = Infer<typeof MemberRow>;
type Machine = Infer<typeof MachineRow>;
type Asset = Infer<typeof AssetRow>;
type Incident = Infer<typeof IncidentRow>;
type LogRow = Infer<typeof LogEntryRow>;
type Msg = Infer<typeof MessageRow>;
type Task = Infer<typeof TaskRow>;
type SystemReport = Infer<typeof SystemReportRow>;
type SystemState = Infer<typeof SystemStateRow>;

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

function mapMemberStatus(status: string): JoinRequest['status'] {
  if (status === 'approved') return 'approved';
  if (status === 'denied') return 'denied';
  if (status === 'revoked') return 'revoked';
  if (status === 'badge_verified') return 'awaiting_lead';
  if (status === 'awaiting_badge') return 'awaiting_card';
  if (status === 'pending') return 'awaiting_lead';
  return 'awaiting_card';
}

export function mapMembersToRequests(members: readonly Member[], device: string): JoinRequest[] {
  return members.map((m) => ({
      id: m.identity.toHexString(),
      sessionId: m.identity.toHexString(),
      employeeId: `member:${m.name}`, // matches the employee rows built from members
      typed: m.name,
      device,
      status: mapMemberStatus(m.status),
      code: m.joinCode,
      createdAt: tsMs(m.requestedAt),
      cardAt: m.badgeUid ? tsMs(m.requestedAt) : null,
      decidedAt: m.status === 'approved' ? tsMs(m.requestedAt) : null,
    }));
}

export function mapTablesToState(input: {
  members: readonly Member[];
  machines: readonly Machine[];
  assets: readonly Asset[];
  incident: Incident | undefined;
  systemState?: SystemState;
  log: readonly LogRow[];
  messages: readonly Msg[];
  tasks: readonly Task[];
  reports?: readonly SystemReport[];
  sid: string;
}): State {
  const base = freshState();
  const { members, machines, assets, incident, systemState, log, messages, tasks, sid } = input;
  const reports = input.reports ?? [];
  const gateOpen = systemState?.adminUnlocked === true;
  // The incident clock starts when the admin fob unlocks OffGrid.
  const unlockedMs = gateOpen && systemState?.unlockedAt ? tsMs(systemState.unlockedAt) : null;

  if (incident) {
    base.incident = {
      ...base.incident,
      code: incident.title || 'INC-001',
      kind: incident.summary || 'Cyber incident',
      severity: incident.severity,
      status: incident.resolvedAt ? 'resolved' : incident.active || gateOpen ? 'active' : 'standby',
      declaredAt: incident.declaredAt ? tsMs(incident.declaredAt) : unlockedMs,
      resolvedAt: incident.resolvedAt ? tsMs(incident.resolvedAt) : null,
      leadSession: incident.active || gateOpen || incident.resolvedAt ? sid : null,
    };
  } else if (gateOpen) {
    base.incident = { ...base.incident, status: 'active', leadSession: sid, declaredAt: unlockedMs };
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

  // Employee system reports -> the admin's Systems list and Incident graphs
  const KIND_STATUS: Record<string, SysStatus> = {
    down: 'down', slow: 'suspected', ransom: 'encrypted', suspicious: 'suspected', working: 'working',
  };
  const KIND_TEXT: Record<string, string> = {
    down: 'not working', slow: 'slow or acting strange', ransom: 'ransom note or locked files',
    suspicious: 'suspicious activity', working: 'working normally',
  };
  const SOURCE_TEXT: Record<string, string> = {
    self: 'Saw it myself', told: 'Someone told me', error: 'Error message', alert: 'Security alert',
  };
  for (const r of reports) {
    const sys = base.systems.find((x) => x.id === r.systemId);
    if (!sys) continue;
    sys.status = KIND_STATUS[r.kind] ?? 'suspected';
    sys.reportedKind = r.kind as never;
    sys.reportedBy = `${r.reportedBy} (${r.reportedTeam})`;
    sys.location = r.location;
    sys.impact = r.impact;
    sys.doNotTouch = r.doNotTouch;
    sys.howWeKnow = `${SOURCE_TEXT[r.source] ?? r.source}: ${KIND_TEXT[r.kind] ?? r.kind}`;
    sys.at = tsMs(r.reportedAt);
    sys.confirmed = r.confirmed;
    sys.confirmedAt = r.confirmedAt ? tsMs(r.confirmedAt) : null;
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

  // People who joined through OffGrid become employees, so names and roles show up everywhere.
  const leadEmp = base.employees.find((e) => e.role === 'lead');
  for (const mem of members) {
    const id = `member:${mem.name}`;
    if (base.employees.some((e) => e.id === id)) continue;
    base.employees.push({
      id,
      name: mem.name,
      title: mem.role,
      dept: mem.team,
      empId: mem.badgeUid || id,
      cardId: mem.badgeUid || '',
      role: 'it',
      group: 'it',
      teamId: null,
      reportsTo: 'Incident Lead',
      active: true,
    });
  }
  const authorIdFor = (sender: string) => {
    if (sender === 'Lead' && leadEmp) return leadEmp.id;
    const e = base.employees.find((x) => x.name === sender);
    return e ? e.id : sender;
  };

  base.messages = messages.map((m) => ({
    id: String(m.id),
    at: tsMs(m.sent),
    authorId: authorIdFor(m.senderName),
    text: m.text,
    pinned: false,
  }));

  const URGENT_MS = 5 * 60_000; // urgent tasks must be started within 5 minutes
  base.tasks = tasks
    .map((t) => {
      const createdAt = tsMs(t.createdAt);
      const assignee = t.assigneeName && t.assigneeName !== 'Anyone' ? t.assigneeName : null;
      return {
        id: String(t.id),
        title: t.text,
        detail: t.detail,
        assigneeId: assignee ? (base.employees.find((e) => e.name === assignee)?.id ?? `member:${assignee}`) : null,
        status: (t.status === 'acknowledged' ? 'acknowledged' : t.status === 'done' ? 'done' : 'open') as
          'open' | 'acknowledged' | 'done',
        urgent: t.urgent || t.escalated,
        dueAt: t.urgent ? createdAt + URGENT_MS : null,
        createdAt,
        ackedAt: t.ackedAt ? tsMs(t.ackedAt) : null,
        doneAt: t.doneAt ? tsMs(t.doneAt) : null,
        pings: t.pings,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  return base;
}
