// Every table the app uses. One SpacetimeDB table each when you move off the mock.
export type Role = 'lead' | 'it' | 'teamlead' | 'legal' | 'comms' | 'staff';
export type Group = 'it' | 'leads' | 'legalcomms' | 'everyone';

export interface Employee {
  id: string; name: string; title: string; dept: string; empId: string;
  cardId: string;          // RFID UID typed by the Pico (Lead: her key fob)
  role: Role; group: Group; teamId: string | null; reportsTo: string; active: boolean;
}

export interface Incident {
  code: string; kind: string; severity: string;
  status: 'standby' | 'active' | 'resolved';
  declaredAt: number | null; resolvedAt: number | null;
  leadSession: string | null;      // the device unlocked by the Lead's fob
  pagedAt: number | null; pagedGroups: Group[];
  noticeStartAt: number | null; noticeHours: number;
}

export type JoinStatus = 'awaiting_card' | 'awaiting_lead' | 'approved' | 'denied' | 'revoked' | 'not_found' | 'lead_only';
export interface JoinRequest {
  id: string; sessionId: string; employeeId: string | null; typed: string; device: string;
  status: JoinStatus; code: string; createdAt: number; cardAt: number | null; decidedAt: number | null;
}

export interface AccessEvent { id: string; at: number; kind: 'unknown_card' | 'no_device' | 'denied' | 'expired'; text: string }
export interface Session { id: string; lastSeen: number }
export interface Notice { at: number; tone: 'ok' | 'warn' | 'bad'; text: string }

export type SysStatus = 'down' | 'encrypted' | 'suspected' | 'contained' | 'working' | 'unchecked';
export type ReportKind = 'down' | 'slow' | 'ransom' | 'suspicious' | 'working';
export type Source = 'self' | 'told' | 'error' | 'alert';
export interface Team { id: string; name: string; leadId: string }
export interface System {
  id: string; code: string; name: string; teamId: string; status: SysStatus; confirmed: boolean;
  reportedKind: ReportKind | null; reportedBy: string | null; location: string; howWeKnow: string;
  impact: string; at: number | null; confirmedAt: number | null; doNotTouch: boolean;
}

export type DeskStatus = 'infected' | 'suspected' | 'contained' | 'clean' | 'unchecked';
export interface Floor { n: number; name: string; checkedBy: string | null; checkedAt: number | null }
export interface Desk { id: string; floor: number; status: DeskStatus }
export interface InfectionPoint { at: number; count: number }

export interface Task {
  id: string; title: string; detail: string;
  assigneeId: string | null;               // null = open to anyone
  status: 'open' | 'acknowledged' | 'done';
  urgent: boolean; dueAt: number | null;
  createdAt: number; ackedAt: number | null; doneAt: number | null; pings: number;
}

export type DataStatus = 'unknown' | 'locked' | 'possible_exfil' | 'exfiltrated' | 'safe';
export interface DataItem { id: string; name: string; source: string; status: DataStatus }
export type Tone = 'red' | 'amber' | 'blue' | 'green' | 'gray';
export interface LogEntry { id: string; at: number; title: string; sub: string; tone: Tone }
export interface Message { id: string; at: number; authorId: string; text: string; pinned: boolean }
export interface FileItem { id: string; name: string; size: number; by: string; at: number; source: string }

export interface State {
  incident: Incident;
  employees: Employee[];
  teams: Team[];
  systems: System[];
  floors: Floor[];
  desks: Desk[];
  infection: InfectionPoint[];
  tasks: Task[];
  data: DataItem[];
  log: LogEntry[];
  messages: Message[];
  files: FileItem[];
  counsel: { sentAt: number | null; to: string };
  requests: JoinRequest[];
  access: AccessEvent[];
  sessions: Session[];
  notice: Notice | null;
}
