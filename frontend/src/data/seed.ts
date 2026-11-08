import type { DeskStatus, Employee, State, System, Team } from './types';

const MIN = 60_000;
export const LEAD_FOB = ((import.meta.env.VITE_LEAD_FOB as string | undefined) ?? '7A3F92C1').toUpperCase();

const emp = (
  id: string, name: string, title: string, dept: string, empId: string, cardId: string,
  role: Employee['role'], group: Employee['group'], teamId: string | null, reportsTo = 'Maria Lopez',
): Employee => ({ id, name, title, dept, empId, cardId, role, group, teamId, reportsTo, active: true });

// The employee database. cardId = the UID the Pico types when that card is tapped.
export const EMPLOYEES: Employee[] = [
  emp('maria', 'Maria Lopez', 'Incident Lead · IT Director', 'IT', 'E-10001', LEAD_FOB, 'lead', 'leads', null, 'Managing Partner'),
  emp('dev', 'Dev Patel', 'IT Operations', 'IT', 'E-10215', '11AA22BB', 'it', 'it', 'it'),
  emp('priya', 'Priya Nair', 'IT responder', 'IT', 'E-10442', '3C5D92C1', 'it', 'it', 'it', 'Dev Patel'),
  emp('samo', 'Sam Ortega', 'IT responder', 'IT', 'E-10518', '9F1E4B20', 'it', 'it', 'it', 'Dev Patel'),
  emp('ana', 'Ana Ruiz', 'Finance Director', 'Finance', 'E-10377', '77E0A1C4', 'teamlead', 'leads', 'finance'),
  emp('james', 'James Okafor', 'Practice Lead', 'Litigation', 'E-10109', '2B9C0D11', 'teamlead', 'leads', 'litigation'),
  emp('lenawu', 'Lena Wu', 'Records Manager', 'Records', 'E-10309', 'C013A5E2', 'teamlead', 'leads', 'records'),
  emp('samt', 'Sam Torres', 'HR Manager', 'HR', 'E-10650', '5A6B7C8D', 'teamlead', 'leads', 'hr'),
  emp('rita', 'Rita Gomez', 'Marketing Lead', 'Marketing', 'E-10702', 'D4E5F6A7', 'teamlead', 'leads', 'marketing'),
  emp('grace', 'Grace Kim', 'General Counsel', 'Legal', 'E-10055', '8899AABB', 'legal', 'legalcomms', null),
  emp('omar', 'Omar Haddad', 'Communications Lead', 'Comms', 'E-10871', '4B7E1290', 'comms', 'legalcomms', null),
  emp('tom', 'Tom Reyes', 'Paralegal', 'Litigation', 'E-11020', '0F0F1234', 'staff', 'everyone', 'litigation', 'James Okafor'),
];

const TEAMS: Team[] = [
  { id: 'litigation', name: 'Litigation', leadId: 'james' },
  { id: 'finance', name: 'Finance', leadId: 'ana' },
  { id: 'it', name: 'IT', leadId: 'dev' },
  { id: 'records', name: 'Records', leadId: 'lenawu' },
  { id: 'hr', name: 'HR', leadId: 'samt' },
  { id: 'marketing', name: 'Marketing', leadId: 'rita' },
];

const SYSTEMS: [string, string, string, string][] = [
  ['fs01', 'FS-01', 'Client file server', 'litigation'], ['dms', 'LIT-DMS', 'Document system', 'litigation'],
  ['prn', 'LIT-PRN', 'Print server', 'litigation'], ['bill02', 'BILL-02', 'Billing server', 'finance'],
  ['pay1', 'PAY-1', 'Payroll app', 'finance'], ['accfs', 'ACC-FS', 'Accounting file share', 'finance'],
  ['exp1', 'EXP-1', 'Expense portal', 'finance'], ['m365', 'M365', 'Email (Microsoft 365)', 'it'],
  ['vpn1', 'VPN-1', 'VPN gateway', 'it'], ['bkp1', 'BKP-1', 'Backup appliance', 'it'],
  ['dc01', 'DC-01', 'Domain controller', 'it'], ['nas02', 'NAS-02', 'Shared drive', 'it'],
  ['wifi', 'WIFI-G', 'Guest Wi-Fi', 'it'], ['prt01', 'PRT-01', 'Office printers', 'it'],
  ['intra', 'INTRA-1', 'Intranet', 'it'], ['voip', 'VOIP-1', 'Desk phones', 'it'],
  ['arch', 'REC-ARCH', 'Records archive', 'records'], ['scan', 'REC-SCAN', 'Scanning station', 'records'],
  ['hris', 'HRIS', 'HR system', 'hr'], ['benefits', 'HR-BEN', 'Benefits portal', 'hr'],
  ['cms', 'WEB-CMS', 'Website editor', 'marketing'], ['dam', 'MKT-DAM', 'Brand asset library', 'marketing'],
];

const blankSystem = ([id, code, name, teamId]: [string, string, string, string]): System => ({
  id, code, name, teamId, status: 'unchecked', confirmed: false, reportedKind: null, reportedBy: null,
  location: '', howWeKnow: 'No report yet', impact: 'Unknown', at: null, confirmedAt: null, doNotTouch: false,
});

const desks = (pattern?: Record<number, string>) => {
  const map: Record<string, DeskStatus> = { I: 'infected', S: 'suspected', C: 'contained', O: 'clean', U: 'unchecked' };
  return [3, 2, 1].flatMap((floor) =>
    Array.from({ length: 10 }, (_, i) => ({
      id: `F${floor}-${String(i + 1).padStart(2, '0')}`, floor,
      status: pattern ? map[pattern[floor][i]] : ('unchecked' as DeskStatus),
    })),
  );
};

/** Clean start: nothing has happened yet. The Lead's fob tap declares the incident. */
export function freshState(): State {
  return {
    incident: {
      code: 'IR-2026-007', kind: 'Ransomware', severity: 'High', status: 'standby',
      declaredAt: null, resolvedAt: null, leadSession: null, pagedAt: null, pagedGroups: [],
      noticeStartAt: null, noticeHours: 72,
    },
    employees: EMPLOYEES.map((e) => ({ ...e })),
    teams: TEAMS,
    systems: SYSTEMS.map(blankSystem),
    floors: [
      { n: 3, name: 'Litigation', checkedBy: null, checkedAt: null },
      { n: 2, name: 'Finance', checkedBy: null, checkedAt: null },
      { n: 1, name: 'Operations', checkedBy: null, checkedAt: null },
    ],
    desks: desks(),
    infection: [],
    tasks: [],
    data: [
      { id: 'd1', name: 'Client case files', source: 'FS-01 · Litigation', status: 'unknown' },
      { id: 'd2', name: 'Payroll records', source: 'PAY-1 · Finance', status: 'unknown' },
      { id: 'd3', name: 'Employee HR records', source: 'HRIS · HR', status: 'unknown' },
      { id: 'd4', name: 'Backups', source: 'BKP-1 · offline', status: 'unknown' },
    ],
    log: [],
    messages: [],
    files: [],
    counsel: { sentAt: null, to: 'Lena Kim, outside counsel' },
    requests: [],
    access: [],
    sessions: [],
    notice: null,
  };
}

/** A busy incident, 40 minutes in. Demo tools → "Load busy example". */
export function busyState(): State {
  const s = freshState();
  const now = Date.now();
  const t0 = now - 40 * MIN;
  const at = (m: number) => t0 + m * MIN;
  s.incident = { ...s.incident, status: 'active', declaredAt: t0, pagedAt: at(2), pagedGroups: ['it', 'leads', 'legalcomms'], noticeStartAt: at(2) };

  const set = (id: string, p: Partial<System>) => Object.assign(s.systems.find((x) => x.id === id)!, p);
  set('fs01', { status: 'encrypted', confirmed: true, confirmedAt: at(19), reportedKind: 'ransom', reportedBy: 'James Okafor', howWeKnow: 'Ransom note on console; files end in .lock', impact: 'Attorneys cannot open case files', at: at(19), doNotTouch: true });
  set('dms', { status: 'encrypted', confirmed: true, confirmedAt: at(21), reportedKind: 'ransom', reportedBy: 'James Okafor', howWeKnow: 'Same ransom note as FS-01', impact: 'No access to briefs or filings', at: at(21), doNotTouch: true });
  set('prn', { status: 'down', confirmed: true, confirmedAt: at(22), reportedKind: 'down', reportedBy: 'James Okafor', howWeKnow: 'Queue frozen, will not respond', impact: 'Court filings must print elsewhere', at: at(22) });
  set('bill02', { status: 'down', confirmed: true, confirmedAt: at(14), reportedKind: 'down', reportedBy: 'Ana Ruiz', howWeKnow: 'Will not boot after restart', impact: 'Invoicing and payroll paused', at: at(12), location: 'Server room, rack B' });
  set('pay1', { status: 'suspected', reportedKind: 'slow', reportedBy: 'Ana Ruiz', howWeKnow: 'Team saw odd error messages', impact: 'Friday payroll at risk', at: at(17) });
  set('accfs', { status: 'working', reportedKind: 'working', reportedBy: 'Ana Ruiz', howWeKnow: 'Team opened files normally', impact: 'None', at: at(18) });
  set('m365', { status: 'suspected', reportedKind: 'suspicious', reportedBy: 'Dev Patel', howWeKnow: 'Admin sign-ins from unknown location', impact: 'Do not trust email; use chat', at: at(16) });
  set('vpn1', { status: 'contained', confirmed: true, confirmedAt: at(8), reportedKind: 'suspicious', reportedBy: 'Dev Patel', howWeKnow: 'Unplugged on purpose to block attacker', impact: 'Remote staff offline', at: at(8), doNotTouch: true });
  set('bkp1', { status: 'working', confirmed: true, confirmedAt: at(28), reportedKind: 'working', reportedBy: 'Dev Patel', howWeKnow: 'Last good backup 2:00 AM verified', impact: 'Restore source', at: at(28) });
  set('dc01', { status: 'down', confirmed: true, confirmedAt: at(10), reportedKind: 'down', reportedBy: 'Dev Patel', howWeKnow: 'Shut down to stop spread', impact: 'No new sign-ins on the network', at: at(10) });
  set('nas02', { status: 'down', confirmed: true, confirmedAt: at(14), reportedKind: 'down', reportedBy: 'Dev Patel', howWeKnow: 'Disks offline', impact: 'Team folders unavailable', at: at(14) });
  set('wifi', { status: 'contained', confirmed: true, confirmedAt: at(9), reportedKind: 'suspicious', reportedBy: 'Dev Patel', howWeKnow: 'Switched off to reduce exposure', impact: 'Visitors offline', at: at(9) });
  set('prt01', { status: 'working', confirmed: true, confirmedAt: at(26), reportedKind: 'working', reportedBy: 'Dev Patel', howWeKnow: 'Test page printed', impact: 'None', at: at(26) });
  set('arch', { status: 'suspected', reportedKind: 'suspicious', reportedBy: 'Lena Wu', howWeKnow: 'Folders renamed overnight', impact: 'Cannot pull client records', at: at(23) });

  s.floors = [
    { n: 3, name: 'Litigation', checkedBy: 'Priya Nair', checkedAt: at(32) },
    { n: 2, name: 'Finance', checkedBy: 'Sam Ortega', checkedAt: at(26) },
    { n: 1, name: 'Operations', checkedBy: null, checkedAt: null },
  ];
  s.desks = desks({ 3: 'IISSSOOCCO', 2: 'OOCIOSOOUO', 1: 'UOUOOOOUUO' });
  s.infection = [0, 1, 2, 4, 6, 6, 5, 3].map((count, i) => ({ at: at(i * 5), count }));

  const task = (id: string, title: string, detail: string, assigneeId: string | null, status: 'open' | 'acknowledged' | 'done', created: number, urgent = false) => ({
    id, title, detail, assigneeId, status, urgent, dueAt: null, createdAt: created, pings: 0,
    ackedAt: status !== 'open' ? created + 2 * MIN : null, doneAt: status === 'done' ? created + 8 * MIN : null,
  });
  s.tasks = [
    task('t1', 'Check Floor 1 desks F1-01 to F1-09', 'Tap each desk on the map as you go', 'samo', 'acknowledged', at(30)),
    task('t2', 'Photograph ransom note on FS-01', 'Evidence for counsel. Do not touch the server.', 'priya', 'acknowledged', at(20), true),
    task('t3', 'Confirm Payroll app status', 'Reported by Finance, needs IT check', 'dev', 'open', now - 6 * MIN, true),
    task('t4', 'HR: report your systems', 'Your team has not checked in yet', 'samt', 'open', now - 1 * MIN),
    task('t5', 'Verify offline backups', 'BKP-1 copy from 2:00 AM', 'dev', 'done', at(14)),
    task('t6', 'Photograph every ransom note you find', 'Add the photos to an error report', null, 'open', now - 4 * MIN),
    task('t7', 'Collect the visitor sign-in sheet', 'Front desk, Floor 1', null, 'open', now - 2 * MIN),
    task('t8', 'Check the Expense portal and report it', '', 'ana', 'open', now - 1 * MIN),
    task('t9', 'List clients billed this week for counsel', '', 'ana', 'done', at(20)),
  ];
  s.data = [
    { id: 'd1', name: 'Client case files', source: 'FS-01 · Litigation', status: 'locked' },
    { id: 'd2', name: 'Payroll records', source: 'PAY-1 · Finance', status: 'possible_exfil' },
    { id: 'd3', name: 'Employee HR records', source: 'HRIS · HR', status: 'unknown' },
    { id: 'd4', name: 'Backups', source: 'BKP-1 · offline', status: 'safe' },
  ];
  s.log = [
    { id: 'l1', at: at(0), title: 'Incident declared', sub: 'Maria Lopez · key fob at the box', tone: 'red' },
    { id: 'l2', at: at(2), title: 'Team paged', sub: 'IT, team leads, legal and comms', tone: 'gray' },
    { id: 'l3', at: at(8), title: 'VPN isolated', sub: 'Dev Patel', tone: 'blue' },
    { id: 'l4', at: at(12), title: 'Billing server reported down', sub: 'Ana Ruiz · Finance', tone: 'red' },
    { id: 'l5', at: at(19), title: 'FS-01 confirmed encrypted', sub: 'IT · marked do not touch', tone: 'red' },
    { id: 'l6', at: at(28), title: 'Backups cleared', sub: 'Dev Patel · BKP-1 verified', tone: 'green' },
    { id: 'l7', at: at(36), title: 'Unknown card refused at the box', sub: 'Not in the employee database', tone: 'amber' },
  ];
  s.messages = [
    { id: 'm1', at: at(8), authorId: 'maria', text: 'VPN is off on purpose. Remote staff stay offline.', pinned: false },
    { id: 'm2', at: at(18), authorId: 'ana', text: 'Payroll is due Friday. Need an ETA on BILL-02.', pinned: false },
    { id: 'm3', at: at(21), authorId: 'maria', text: 'Nobody restarts servers. Report only, IT confirms.', pinned: true },
  ];
  s.files = [
    { id: 'f1', name: 'FS-01 ransom note.jpg', size: 2_100_000, by: 'Priya Nair', at: at(32), source: 'Error report' },
    { id: 'f2', name: 'Payroll exposure notes.pdf', size: 180_000, by: 'Ana Ruiz', at: at(27), source: 'Upload' },
  ];
  s.counsel = { sentAt: at(29), to: 'Lena Kim, outside counsel' };
  const approved = (empId: string, m: number) => ({
    id: `r-${empId}`, sessionId: `demo-${empId}`, employeeId: empId, typed: empId, device: 'Kit laptop',
    status: 'approved' as const, code: '00', createdAt: at(m - 1), cardAt: at(m - 1), decidedAt: at(m),
  });
  s.requests = [
    approved('dev', 5), approved('samo', 6), approved('ana', 7), approved('james', 9), approved('priya', 11),
    { id: 'r-omar', sessionId: 'demo-omar', employeeId: 'omar', typed: 'Omar Haddad', device: 'Kit laptop 05', status: 'awaiting_lead', code: '82', createdAt: now - 3 * MIN, cardAt: now - 2 * MIN, decidedAt: null },
    { id: 'r-grace', sessionId: 'demo-grace', employeeId: 'grace', typed: 'Grace Kim', device: 'Kit laptop', status: 'awaiting_lead', code: '19', createdAt: now - 2 * MIN, cardAt: now - 1 * MIN, decidedAt: null },
  ];
  s.access = [{ id: 'a1', at: at(36), kind: 'unknown_card', text: 'Unknown card ••••A1F0 · not in the employee database · refused automatically' }];
  return s;
}
