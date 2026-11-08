import { busyState, freshState } from './seed';
import type { DataStatus, DeskStatus, Employee, Group, ReportKind, Source, State, SysStatus, Tone } from './types';
import { GROUP_LABEL, JOIN_TTL, empById, inRoomIds, isLead, meEmployee, myRequest, pendingApprovals } from '../lib/select';

/*
 * Mock backend. All state lives in localStorage so every tab in this browser stays in
 * sync live, and each tab is its own "device" (its id lives in sessionStorage).
 * Each public method = one SpacetimeDB reducer later, with the same checks.
 */
const KEY = 'warroom-app-v1';
const MIN = 60_000;
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export const KIND_TO_STATUS: Record<ReportKind, SysStatus> = {
  down: 'down', ransom: 'encrypted', slow: 'suspected', suspicious: 'suspected', working: 'working',
};
export const KIND_LABEL: Record<ReportKind, string> = {
  down: 'Down: not working at all', slow: 'Slow or acting strange', ransom: 'Ransom note or locked files',
  suspicious: 'Something looks suspicious', working: 'Working normally',
};
export const SOURCE_LABEL: Record<Source, string> = {
  self: 'I saw it myself', told: 'Someone told me', error: 'Error message', alert: 'Security alert',
};
const KIND_TONE: Record<ReportKind, Tone> = { down: 'red', ransom: 'red', slow: 'amber', suspicious: 'amber', working: 'green' };

export interface ReportInput {
  systemId: string; location: string; kind: ReportKind; source: Source; impact: string;
  doNotTouch: boolean; attachments: { name: string; size: number }[];
}

function sessionId() {
  let sid = sessionStorage.getItem('warroom-sid');
  if (!sid) {
    sid = uid();
    sessionStorage.setItem('warroom-sid', sid);
  }
  return sid;
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    /* reseed */
  }
  const s = freshState();
  localStorage.setItem(KEY, JSON.stringify(s));
  return s;
}

const deviceLabel = () => (/Mobi|Android|iPhone|iPad/.test(navigator.userAgent) ? 'Phone' : 'Laptop');

class Store {
  readonly sid = sessionId();
  private state: State = load();
  private listeners = new Set<() => void>();

  constructor() {
    window.addEventListener('storage', (e) => {
      if (e.key === KEY) {
        this.state = load();
        this.emit();
      }
    });
    this.heartbeat();
    window.setInterval(() => this.heartbeat(), 5000);
  }

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  };
  get = () => this.state;

  private emit() {
    this.listeners.forEach((l) => l());
  }
  private commit(fn: (d: State) => void) {
    const d = load();
    fn(d);
    localStorage.setItem(KEY, JSON.stringify(d));
    this.state = d;
    this.emit();
  }
  private log(d: State, title: string, sub: string, tone: Tone) {
    d.log.push({ id: uid(), at: Date.now(), title, sub, tone });
  }
  private notice(d: State, tone: 'ok' | 'warn' | 'bad', text: string) {
    d.notice = { at: Date.now(), tone, text };
  }
  /** Runs fn only if this device was unlocked by the Lead's fob. */
  private asLead(fn: (d: State, lead: Employee) => void) {
    this.commit((d) => {
      if (!isLead(d, this.sid)) return console.warn('Rejected: Lead only');
      fn(d, d.employees.find((e) => e.role === 'lead')!);
    });
  }
  /** Runs fn only for an approved employee (or the Lead). */
  private asMember(fn: (d: State, me: Employee) => void) {
    this.commit((d) => {
      const me = isLead(d, this.sid) ? d.employees.find((e) => e.role === 'lead')! : meEmployee(d, this.sid);
      if (!me) return console.warn('Rejected: not approved');
      fn(d, me);
    });
  }

  heartbeat() {
    this.commit((d) => {
      const s = d.sessions.find((x) => x.id === this.sid);
      if (s) s.lastSeen = Date.now();
      else d.sessions.push({ id: this.sid, lastSeen: Date.now() });
    });
  }

  // ===================== The box (only the Lead computer hears the board) =====================
  cardTap(rawId: string) {
    this.commit((d) => {
      const card = rawId.trim().toUpperCase();
      const masked = `••••${card.slice(-4)}`;
      const now = Date.now();
      const e = d.employees.find((x) => x.cardId === card && x.active);

      if (e?.role === 'lead') {
        if (!isLead(d, this.sid)) {
          d.incident.leadSession = this.sid;
          if (d.incident.status !== 'active') {
            Object.assign(d.incident, { status: 'active', declaredAt: now, resolvedAt: null, pagedAt: null, pagedGroups: [], noticeStartAt: null });
            this.log(d, 'Incident declared', `${e.name} · key fob at the box`, 'red');
            this.notice(d, 'ok', 'Protocol started. Follow the steps at the top of the screen.');
          } else {
            this.log(d, 'Lead console unlocked', `${e.name} · key fob`, 'gray');
            this.notice(d, 'ok', `Welcome back, ${e.name.split(' ')[0]}.`);
          }
          return;
        }
        const next = pendingApprovals(d)[0];
        if (next) this.approveReq(d, next.id, e);
        else this.notice(d, 'warn', 'Your fob works. Nobody is waiting for approval right now.');
        return;
      }

      if (!isLead(d, this.sid)) {
        this.notice(d, 'bad', "That card can't start the protocol. Only the Incident Lead's key fob can.");
        return;
      }
      if (!e) {
        d.access.unshift({ id: uid(), at: now, kind: 'unknown_card', text: `Unknown card ${masked} · not in the employee database · refused automatically` });
        this.log(d, 'Unknown card refused at the box', `${masked} · not in the employee database`, 'amber');
        this.notice(d, 'bad', `Card ${masked} is not in the employee database. Access refused.`);
        return;
      }
      const req = d.requests
        .filter((r) => r.employeeId === e.id && r.status === 'awaiting_card' && now - r.createdAt < JOIN_TTL)
        .sort((a, b) => b.createdAt - a.createdAt)[0];
      if (req) {
        req.status = 'awaiting_lead';
        req.cardAt = now;
        this.notice(d, 'ok', `${e.name}'s card checks out. Compare their face and screen code, then approve.`);
        return;
      }
      if (inRoomIds(d).has(e.id)) {
        this.notice(d, 'warn', `${e.name} is already approved. No action needed.`);
        return;
      }
      d.access.unshift({ id: uid(), at: now, kind: 'no_device', text: `${e.name} tapped their card before typing their name on a laptop` });
      this.notice(d, 'warn', `${e.name} tapped first. Ask them to open the War Room page, type their name, then tap again.`);
    });
  }

  private approveReq(d: State, reqId: string, lead: Employee) {
    const r = d.requests.find((x) => x.id === reqId && x.status === 'awaiting_lead');
    const e = empById(d, r?.employeeId);
    if (!r || !e) return;
    r.status = 'approved';
    r.decidedAt = Date.now();
    this.log(d, `${e.name} approved at the box`, `Keycard ••••${e.cardId.slice(-4)} · ${lead.name}`, 'green');
    this.notice(d, 'ok', `${e.name} approved. Their dashboard is opening now.`);
  }

  approve(reqId: string) {
    this.asLead((d, lead) => this.approveReq(d, reqId, lead));
  }

  deny(reqId: string) {
    this.asLead((d, lead) => {
      const r = d.requests.find((x) => x.id === reqId && (x.status === 'awaiting_lead' || x.status === 'awaiting_card'));
      if (!r) return;
      const e = empById(d, r.employeeId);
      r.status = 'denied';
      r.decidedAt = Date.now();
      d.access.unshift({ id: uid(), at: Date.now(), kind: 'denied', text: `${e?.name ?? r.typed} denied by ${lead.name}. They can tap again.` });
      this.log(d, `${e?.name ?? r.typed} denied at the box`, lead.name, 'amber');
    });
  }

  revoke(employeeId: string) {
    this.asLead((d, lead) => {
      const e = empById(d, employeeId);
      if (!e || e.role === 'lead') return;
      d.requests.forEach((r) => {
        if (r.employeeId === employeeId && r.status === 'approved') r.status = 'revoked';
      });
      this.log(d, `${e.name}'s access revoked`, lead.name, 'red');
    });
  }

  // ===================== Employee device =====================
  requestJoin(text: string) {
    this.commit((d) => {
      const q = text.trim().toLowerCase();
      const active = d.employees.filter((x) => x.active);
      let e = active.find((x) => x.name.toLowerCase() === q || x.empId.toLowerCase() === q);
      if (!e) {
        const firsts = active.filter((x) => x.name.toLowerCase().split(' ')[0] === q);
        if (firsts.length === 1) e = firsts[0];
      }
      const taken = new Set(d.requests.filter((r) => r.status.startsWith('awaiting')).map((r) => r.code));
      let code = '';
      do code = String(10 + Math.floor(Math.random() * 90));
      while (taken.has(code));
      d.requests.push({
        id: uid(), sessionId: this.sid, employeeId: e?.id ?? null, typed: text.trim(), device: deviceLabel(),
        status: !e ? 'not_found' : e.role === 'lead' ? 'lead_only' : 'awaiting_card',
        code, createdAt: Date.now(), cardAt: null, decidedAt: null,
      });
    });
  }

  startOver() {
    this.commit((d) => {
      d.requests = d.requests.filter((r) => !(r.sessionId === this.sid && r.status !== 'approved'));
    });
  }

  // ===================== Lead: paging =====================
  markPaged(groups: Group[]) {
    this.asLead((d, lead) => {
      d.incident.pagedAt = Date.now();
      d.incident.pagedGroups = groups;
      this.log(d, 'Team paged', `${groups.map((g) => GROUP_LABEL[g]).join(', ')} · ${lead.name}`, 'gray');
    });
  }
  nudge(employeeId: string) {
    this.asLead((d, lead) => {
      const e = empById(d, employeeId);
      if (e) this.log(d, `${e.name} nudged to come in`, lead.name, 'amber');
    });
  }

  // ===================== Tasks =====================
  createTask(title: string, detail: string, assigneeId: string | null, urgent: boolean, dueMins: number | null) {
    this.asLead((d) => {
      const now = Date.now();
      d.tasks.unshift({
        id: uid(), title, detail, assigneeId, status: 'open', urgent, dueAt: dueMins ? now + dueMins * MIN : null,
        createdAt: now, ackedAt: null, doneAt: null, pings: 0,
      });
    });
  }
  repage(taskId: string) {
    this.asLead((d) => {
      const t = d.tasks.find((x) => x.id === taskId);
      if (!t) return;
      t.createdAt = Date.now();
      t.pings += 1;
      this.log(d, `Re-paged: ${t.title}`, empById(d, t.assigneeId)?.name ?? 'Anyone', 'amber');
    });
  }
  reassign(taskId: string, assigneeId: string | null) {
    this.asLead((d) => {
      const t = d.tasks.find((x) => x.id === taskId);
      if (!t) return;
      Object.assign(t, { assigneeId, status: 'open', createdAt: Date.now(), ackedAt: null, pings: 0 });
    });
  }
  claimTask(taskId: string) {
    this.asMember((d, me) => {
      const t = d.tasks.find((x) => x.id === taskId);
      if (!t || t.assigneeId || t.status !== 'open') return;
      Object.assign(t, { assigneeId: me.id, status: 'acknowledged', ackedAt: Date.now() });
      this.log(d, `${me.name} claimed: ${t.title}`, 'Open task', 'gray');
    });
  }
  ackTask(taskId: string) {
    this.asMember((d, me) => {
      const t = d.tasks.find((x) => x.id === taskId);
      if (t && t.assigneeId === me.id && t.status === 'open') Object.assign(t, { status: 'acknowledged', ackedAt: Date.now() });
    });
  }
  toggleDone(taskId: string) {
    this.asMember((d, me) => {
      const t = d.tasks.find((x) => x.id === taskId);
      if (!t || (t.assigneeId !== me.id && me.role !== 'lead')) return;
      if (t.status === 'done') {
        Object.assign(t, { status: 'acknowledged', doneAt: null });
      } else {
        Object.assign(t, { status: 'done', doneAt: Date.now(), ackedAt: t.ackedAt ?? Date.now() });
        this.log(d, `Done: ${t.title}`, me.name, 'green');
      }
    });
  }

  // ===================== Systems, desks, data =====================
  submitReport(r: ReportInput) {
    this.asMember((d, me) => {
      const s = d.systems.find((x) => x.id === r.systemId);
      if (!s) return;
      const now = Date.now();
      Object.assign(s, {
        reportedKind: r.kind, status: r.kind === 'working' ? 'working' : 'suspected', confirmed: false, confirmedAt: null,
        reportedBy: me.name, location: r.location, at: now, doNotTouch: r.doNotTouch,
        howWeKnow: `${SOURCE_LABEL[r.source]}: ${KIND_LABEL[r.kind].toLowerCase()}`, impact: r.impact.trim() || 'None given',
      });
      r.attachments.forEach((f) => d.files.push({ id: uid(), name: f.name, size: f.size, by: me.name, at: now, source: `Error report · ${s.code}` }));
      this.log(d, `${s.name} reported: ${KIND_LABEL[r.kind].split(':')[0].toLowerCase()}`, `${me.name} · ${me.dept}`, KIND_TONE[r.kind]);
    });
  }
  confirmSystem(systemId: string) {
    this.asLead((d) => {
      const s = d.systems.find((x) => x.id === systemId);
      if (!s?.reportedKind) return;
      Object.assign(s, { status: KIND_TO_STATUS[s.reportedKind], confirmed: true, confirmedAt: Date.now() });
      this.log(d, `${s.code} confirmed ${s.status}`, 'IT check', KIND_TONE[s.reportedKind]);
    });
  }
  setDesk(deskId: string, status: DeskStatus, by: string) {
    this.asLead((d) => {
      const desk = d.desks.find((x) => x.id === deskId);
      if (!desk) return;
      desk.status = status;
      const f = d.floors.find((x) => x.n === desk.floor);
      if (f) Object.assign(f, { checkedBy: by, checkedAt: Date.now() });
      d.infection.push({ at: Date.now(), count: d.desks.filter((x) => x.status === 'infected').length });
      if (status === 'infected') this.log(d, `${deskId} marked infected`, by, 'red');
    });
  }
  cycleData(id: string) {
    const order: DataStatus[] = ['unknown', 'locked', 'possible_exfil', 'exfiltrated', 'safe'];
    this.asLead((d) => {
      const item = d.data.find((x) => x.id === id);
      if (!item) return;
      item.status = order[(order.indexOf(item.status) + 1) % order.length];
      if (item.status === 'possible_exfil' || item.status === 'exfiltrated') {
        d.incident.noticeStartAt ??= Date.now();
        this.log(d, `${item.name}: ${item.status === 'exfiltrated' ? 'exfiltrated' : 'possibly exfiltrated'}`, 'Notice clock running', 'red');
      }
    });
  }

  // ===================== Timeline, chat, counsel =====================
  addLog(text: string) {
    if (text.trim()) this.asLead((d, lead) => this.log(d, text.trim(), `${lead.name} · verified`, 'gray'));
  }
  sendMessage(text: string, pinned = false) {
    if (!text.trim()) return;
    this.asMember((d, me) => {
      if (pinned) d.messages.forEach((m) => (m.pinned = false));
      d.messages.push({ id: uid(), at: Date.now(), authorId: me.id, text: text.trim(), pinned: pinned && me.role === 'lead' });
    });
  }
  addFiles(files: { name: string; size: number }[]) {
    this.asLead((d, lead) => {
      files.forEach((f) => d.files.push({ id: uid(), name: f.name, size: f.size, by: lead.name, at: Date.now(), source: 'Upload' }));
    });
  }
  sendToLawyer() {
    this.asLead((d, lead) => {
      d.counsel.sentAt = Date.now();
      this.log(d, `Report packet sent to ${d.counsel.to}`, `${d.files.length + 1} files · ${lead.name}`, 'blue');
    });
  }
  resolve() {
    this.asLead((d, lead) => {
      d.incident.status = 'resolved';
      d.incident.resolvedAt = Date.now();
      this.log(d, 'Incident resolved', lead.name, 'green');
    });
  }

  // ===================== Demo only =====================
  demoReset() {
    localStorage.removeItem(KEY);
    this.state = load();
    this.emit();
  }
  demoBusy() {
    const s = busyState();
    localStorage.setItem(KEY, JSON.stringify(s));
    this.state = s;
    this.emit();
  }
  demoSpread(floor: number) {
    this.commit((d) => {
      const pool = d.desks.filter((x) => x.floor === floor && x.status !== 'infected');
      for (let i = 0; i < 3 && pool.length; i++) pool.splice(Math.floor(Math.random() * pool.length), 1)[0].status = 'infected';
      d.infection.push({ at: Date.now(), count: d.desks.filter((x) => x.status === 'infected').length });
      this.log(d, `${3} desks turned infected on Floor ${floor}`, 'Simulated', 'red');
    });
  }

  myRequest() {
    return myRequest(this.state, this.sid);
  }
}

export const mockStore = new Store();
