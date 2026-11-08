// OffGrid: SpacetimeDB module (server side)

import { schema, t, table, SenderError } from 'spacetimedb/server';
import { Timestamp } from 'spacetimedb';

const SETUP_PIN = '2468';
const LEAD_FOB_UID = 'CAB3BCDC'; // admin fob (blue) ID, uppercase hex
// Demo employee keycard (white card), pre-registered on init
const DEMO_EMPLOYEE_UID = 'D2967938';
const DEMO_EMPLOYEE_NAME = 'Priya Nair';
const DEMO_EMPLOYEE_TEAM = 'IT';
const ADMIN_NAME = 'Incident Lead';
const APPROVAL_WINDOW_MICROS = 30_000_000n; // 30 seconds after a fob tap
const TASK_ESCALATE_MICROS = 120_000_000n; // 2 minutes
const HOUR_MICROS = 3_600_000_000n;
const LEGAL_72H = 72n * HOUR_MICROS;
const LEGAL_SEC_4BD = 96n * HOUR_MICROS; // demo: 4×24h; real SEC uses business days

// ---------- TABLES ----------

// The one laptop the Pico box is plugged into
const console_reg = table(
  { name: 'console_reg', public: true },
  { id: t.u32().primaryKey(), identity: t.identity() }
);

// Badges allowed to approve people
const lead_badge = table(
  { name: 'lead_badge', public: true },
  { uid: t.string().primaryKey(), owner: t.string() }
);

// Everyone who asked to join.
// status: awaiting_badge | badge_verified | approved | denied | revoked
const member = table(
  { name: 'member', public: true },
  {
    identity: t.identity().primaryKey(),
    name: t.string(),
    role: t.string(),
    team: t.string(),
    badge_uid: t.string(),
    status: t.string(),
    join_code: t.string(),
    online: t.bool(),
    requested_at: t.timestamp(),
  }
);

const system_state = table(
  { name: 'system_state', public: true },
  {
    id: t.u32().primaryKey(),
    admin_unlocked: t.bool(),
    unlocked_at: t.timestamp().optional(),
    unlocked_by: t.string(),
  }
);

const badge = table(
  { name: 'badge', public: true },
  {
    uid: t.string().primaryKey(),
    name: t.string(),
    team: t.string(),
    role: t.string(),
    registered_at: t.timestamp(),
  }
);

const register_mode = table(
  { name: 'register_mode', public: true },
  {
    id: t.u32().primaryKey(),
    name: t.string(),
    team: t.string(),
    role: t.string(),
    until: t.timestamp(),
  }
);

// Open for 30 seconds after the Lead taps a valid fob
const approval_window = table(
  { name: 'approval_window', public: true },
  { id: t.u32().primaryKey(), open_until: t.timestamp(), badge_uid: t.string() }
);

// Last thing the box did, so the console can show green/red feedback
const box_status = table(
  { name: 'box_status', public: true },
  { id: t.u32().primaryKey(), ok: t.bool(), text: t.string(), at: t.timestamp() }
);

// The incident itself (one row, id 0)
const incident = table(
  { name: 'incident', public: true },
  {
    id: t.u32().primaryKey(),
    active: t.bool(),
    title: t.string(),
    severity: t.string(), // Low | Medium | High | Critical
    summary: t.string(),
    declared_at: t.timestamp().optional(),
    resolved_at: t.timestamp().optional(),
  }
);

// Scope: systems or data sets and their state
// status: Under review | Encrypted (ransomware) | Exfiltrated | Locked | Clean
const asset = table(
  { name: 'asset', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    name: t.string(),
    kind: t.string(),
    status: t.string(),
    updated_by: t.string(),
    updated_at: t.timestamp(),
  }
);

// Chat inside the dashboard
const message = table(
  { name: 'message', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    sender_name: t.string(),
    text: t.string(),
    sent: t.timestamp(),
  }
);

// Tamper-evident log: every entry stores the hash of the one before it
const log_entry = table(
  { name: 'log_entry', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    at: t.timestamp(),
    actor: t.string(),
    text: t.string(),
    phase: t.string(), // Detect | Contain | Eradicate | Recover | Lessons | System
    prev_hash: t.string(),
    hash: t.string(),
  }
);

// Building map — one row per machine
const machine = table(
  { name: 'machine', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    floor: t.u32(),
    label: t.string(),
    status: t.string(), // Unchecked | Suspected | Infected | Contained | Clean
    updated_by: t.string(),
    updated_at: t.timestamp(),
  }
);

const zone_assignment = table(
  { name: 'zone_assignment', public: true },
  {
    identity: t.identity().primaryKey(),
    floor: t.u32(),
    assigned_at: t.timestamp(),
  }
);

const task = table(
  { name: 'task', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    text: t.string(),
    assignee_name: t.string(),
    status: t.string(), // open | acknowledged | done
    escalated: t.bool(),
    created_by: t.string(),
    created_at: t.timestamp(),
    acked_at: t.timestamp().optional(),
    detail: t.string(),
    urgent: t.bool(),
    done_at: t.timestamp().optional(),
    pings: t.u32(),
  }
);

// Employee system reports (one row per company system; latest report wins)
const system_report = table(
  { name: 'system_report', public: true },
  {
    system_id: t.string().primaryKey(),
    kind: t.string(), // down | slow | ransom | suspicious | working
    source: t.string(),
    location: t.string(),
    impact: t.string(),
    do_not_touch: t.bool(),
    reported_by: t.string(),
    reported_team: t.string(),
    reported_at: t.timestamp(),
    confirmed: t.bool(),
    confirmed_at: t.timestamp().optional(),
  }
);

// Lawyer-facing countdowns (examples — not legal advice)
const legal_deadline = table(
  { name: 'legal_deadline', public: true },
  {
    id: t.u32().primaryKey(),
    label: t.string(),
    disclaimer: t.string(),
    started_at: t.timestamp(),
    deadline_at: t.timestamp(),
    active: t.bool(),
  }
);

// One row per employee keycard tap that needs admin approval.
// status: pending | approved | denied
const access_request = table(
  { name: 'access_request', public: true },
  {
    uid: t.string().primaryKey(),
    name: t.string(),
    team: t.string(),
    role: t.string(),
    status: t.string(),
    requested_at: t.timestamp(),
    decided_by: t.string(),
    claimed_by: t.identity().optional(),
  }
);

const spacetimedb = schema({
  access_request,
  console_reg,
  lead_badge,
  system_state,
  badge,
  register_mode,
  member,
  approval_window,
  box_status,
  incident,
  asset,
  message,
  log_entry,
  machine,
  zone_assignment,
  task,
  system_report,
  legal_deadline,
});
export default spacetimedb;

// ---------- HELPERS ----------

// FNV-1a 32-bit hash. Good enough to show tampering in a demo.
// A production version would use SHA-256.
function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function writeLog(
  ctx: any,
  actor: string,
  text: string,
  phase: string = 'Detect'
) {
  let prev = '00000000';
  let lastId = -1n;
  for (const e of ctx.db.log_entry.iter()) {
    if (e.id > lastId) {
      lastId = e.id;
      prev = e.hash;
    }
  }
  const at: Timestamp = ctx.timestamp;
  const hash = fnv(prev + at.microsSinceUnixEpoch.toString() + actor + text);
  ctx.db.log_entry.insert({
    id: 0n,
    at,
    actor,
    text,
    phase,
    prev_hash: prev,
    hash,
  });
}

function setBox(ctx: any, ok: boolean, text: string) {
  const row = { id: 0, ok, text, at: ctx.timestamp };
  if (ctx.db.box_status.id.find(0)) ctx.db.box_status.id.update(row);
  else ctx.db.box_status.insert(row);
}

function isConsole(ctx: any): boolean {
  const c = ctx.db.console_reg.id.find(0);
  return !!c && c.identity.isEqual(ctx.sender);
}

function requireConsole(ctx: any) {
  if (!isConsole(ctx)) throw new SenderError('Only the Lead console can do this');
}

// Returns the caller's display name, or throws if they are not approved
function requireApproved(ctx: any): string {
  if (isConsole(ctx)) return 'Lead';
  const m = ctx.db.member.identity.find(ctx.sender);
  if (!m || m.status !== 'approved') throw new SenderError('Not approved yet');
  return m.name;
}

function requireLead(ctx: any): string {
  if (isConsole(ctx)) return 'Lead';
  const m = ctx.db.member.identity.find(ctx.sender);
  if (!m || m.status !== 'approved') throw new SenderError('Not approved yet');
  if (m.role !== 'Lead' && m.role !== 'IT Lead' && m.role !== 'Team Lead')
    throw new SenderError('Only the admin or a team lead can do this');
  return m.name;
}

function isUnlocked(ctx: any): boolean {
  const s = ctx.db.system_state.id.find(0);
  return !!s && s.admin_unlocked;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function requireApprover(ctx: any, team: string): string {
  if (isConsole(ctx)) return 'Admin';
  const m = ctx.db.member.identity.find(ctx.sender);
  if (!m || m.status !== 'approved') throw new SenderError('Not approved yet');
  if (m.role === 'Team Lead' && norm(m.team) === norm(team)) return m.name;
  throw new SenderError('Only the admin or this team\'s lead can approve');
}

const MACHINE_NEXT: Record<string, string[]> = {
  Unchecked: ['Suspected', 'Infected', 'Clean'],
  Suspected: ['Infected', 'Clean'],
  Infected: ['Contained'],
  Contained: ['Clean'],
  Clean: ['Infected'],
};

function startLegalClocks(ctx: any) {
  const now = ctx.timestamp;
  const rows = [
    {
      id: 0,
      label: 'GDPR-style regulator notice (example 72h)',
      disclaimer: 'Illustration only — counsel confirms real deadlines.',
      started_at: now,
      deadline_at: new Timestamp(now.microsSinceUnixEpoch + LEGAL_72H),
      active: true,
    },
    {
      id: 1,
      label: 'SEC-style material incident disclosure (example)',
      disclaimer: 'Illustration only — not legal advice.',
      started_at: now,
      deadline_at: new Timestamp(now.microsSinceUnixEpoch + LEGAL_SEC_4BD),
      active: true,
    },
  ];
  for (const r of rows) {
    if (ctx.db.legal_deadline.id.find(r.id)) ctx.db.legal_deadline.id.update(r);
    else ctx.db.legal_deadline.insert(r);
  }
  setBox(ctx, false, 'LEGAL: possible data exfiltration');
}

// ---------- LIFECYCLE ----------

export const init = spacetimedb.init(ctx => {
  ctx.db.lead_badge.insert({ uid: LEAD_FOB_UID, owner: ADMIN_NAME });
  ctx.db.badge.insert({
    uid: LEAD_FOB_UID,
    name: ADMIN_NAME,
    team: 'Command',
    role: 'admin',
    registered_at: ctx.timestamp,
  });
  ctx.db.badge.insert({
    uid: DEMO_EMPLOYEE_UID,
    name: DEMO_EMPLOYEE_NAME,
    team: DEMO_EMPLOYEE_TEAM,
    role: 'employee',
    registered_at: ctx.timestamp,
  });
  ctx.db.system_state.insert({
    id: 0,
    admin_unlocked: false,
    unlocked_at: undefined,
    unlocked_by: '',
  });
  ctx.db.incident.insert({
    id: 0,
    active: false,
    title: '',
    severity: 'Low',
    summary: '',
    declared_at: undefined,
    resolved_at: undefined,
  });
  writeLog(ctx, 'System', 'OffGrid started (gate locked)', 'System');
});

export const onConnect = spacetimedb.clientConnected(ctx => {
  const m = ctx.db.member.identity.find(ctx.sender);
  if (m) ctx.db.member.identity.update({ ...m, online: true });
});

export const onDisconnect = spacetimedb.clientDisconnected(ctx => {
  const m = ctx.db.member.identity.find(ctx.sender);
  if (m) ctx.db.member.identity.update({ ...m, online: false });
});

// ---------- ACCESS CONTROL ----------

// Run once from the laptop the Pico box is plugged into
export const register_console = spacetimedb.reducer(
  { pin: t.string() },
  (ctx, { pin }) => {
    if (pin !== SETUP_PIN) throw new SenderError('Wrong setup PIN');
    const existing = ctx.db.console_reg.id.find(0);
    if (existing && !existing.identity.isEqual(ctx.sender))
      throw new SenderError('A Lead console is already registered');
    if (!existing) ctx.db.console_reg.insert({ id: 0, identity: ctx.sender });
    writeLog(ctx, 'Lead', 'Lead console registered');
  }
);

export const request_access = spacetimedb.reducer(
  { name: t.string(), role: t.string(), team: t.string() },
  (ctx, { name, role, team }) => {
    if (!isUnlocked(ctx))
      throw new SenderError('Locked: waiting for the admin to authenticate at the box');
    if (!name.trim()) throw new SenderError('Name is required');
    const existing = ctx.db.member.identity.find(ctx.sender);
    if (existing && existing.status === 'revoked')
      throw new SenderError('Access was revoked. Ask the admin.');
    if (existing && existing.status === 'approved')
      throw new SenderError('Already approved');
    const seed =
      ctx.sender.toHexString() + ctx.timestamp.microsSinceUnixEpoch.toString();
    const code = (parseInt(fnv(seed), 16) % 10000).toString().padStart(4, '0');
    const row = {
      identity: ctx.sender,
      name: name.trim(),
      role: role.trim(),
      team: team.trim(),
      badge_uid: '',
      status: 'awaiting_badge',
      join_code: code,
      online: true,
      requested_at: ctx.timestamp,
    };
    if (existing) ctx.db.member.identity.update(row);
    else ctx.db.member.insert(row);
    writeLog(ctx, name.trim(), `Requested access as ${role.trim()} (${team.trim()}); tap badge at the box`);
  }
);

function handleTap(ctx: any, uid: string) {
  requireConsole(ctx);
  const id = uid.trim().toUpperCase();
  const b = ctx.db.badge.uid.find(id);

  if (b && b.role === 'admin') {
    const s = ctx.db.system_state.id.find(0)!;
    if (!s.admin_unlocked) {
      ctx.db.system_state.id.update({
        ...s,
        admin_unlocked: true,
        unlocked_at: ctx.timestamp,
        unlocked_by: b.name,
      });
      setBox(ctx, true, 'Admin authenticated. OffGrid unlocked.');
      writeLog(ctx, b.name, 'Admin authenticated with badge: gate unlocked', 'System');
      return;
    }
    const row = {
      id: 0,
      open_until: new Timestamp(ctx.timestamp.microsSinceUnixEpoch + APPROVAL_WINDOW_MICROS),
      badge_uid: id,
    };
    if (ctx.db.approval_window.id.find(0)) ctx.db.approval_window.id.update(row);
    else ctx.db.approval_window.insert(row);
    setBox(ctx, true, 'Admin verified. Enter join code or approve on screen.');
    writeLog(ctx, b.name, 'Admin badge tapped, approval window open');
    return;
  }

  const rm = ctx.db.register_mode.id.find(0);
  if (!b && rm && rm.until.microsSinceUnixEpoch >= ctx.timestamp.microsSinceUnixEpoch) {
    ctx.db.badge.insert({ uid: id, name: rm.name, team: rm.team, role: rm.role, registered_at: ctx.timestamp });
    ctx.db.register_mode.id.delete(0);
    setBox(ctx, true, `Badge registered to ${rm.name}`);
    writeLog(ctx, 'Admin', `Registered badge ${id} to ${rm.name} (${rm.team}, ${rm.role})`, 'System');
    return;
  }

  if (!b) {
    setBox(ctx, false, 'Badge not authorized');
    writeLog(ctx, 'Box', `Rejected unknown badge ${id}`);
    return;
  }

  if (!isUnlocked(ctx)) {
    setBox(ctx, false, 'Locked: admin must tap in first');
    writeLog(ctx, 'Box', `${b.name} tapped while gate locked`);
    return;
  }

  // Employee keycard: send the admin an approval request (and verify any typed-in request with the same name)
  for (const m of ctx.db.member.iter()) {
    if (m.status === 'awaiting_badge' && norm(m.name) === norm(b.name)) {
      ctx.db.member.identity.update({ ...m, status: 'badge_verified', badge_uid: id });
    }
  }
  const existing = ctx.db.access_request.uid.find(id);
  if (existing && existing.status === 'approved') {
    setBox(ctx, true, `${b.name} is already approved`);
    writeLog(ctx, b.name, 'Keycard tapped (already approved)');
    return;
  }
  const reqRow = {
    uid: id,
    name: b.name,
    team: b.team,
    role: b.role,
    status: 'pending',
    requested_at: ctx.timestamp,
    decided_by: '',
    claimed_by: existing ? existing.claimed_by : undefined,
  };
  if (existing) ctx.db.access_request.uid.update(reqRow);
  else ctx.db.access_request.insert(reqRow);
  setBox(ctx, true, `Keycard verified: ${b.name}. Approval request sent to admin.`);
  writeLog(ctx, b.name, `Keycard tapped: approval request sent (${b.team})`);
}

function setMemberFromRequest(ctx: any, req: any, who: any, status: string) {
  const m = ctx.db.member.identity.find(who);
  const row = {
    identity: who,
    name: req.name,
    role: req.role,
    team: req.team,
    badge_uid: req.uid,
    status,
    join_code: m ? m.join_code : '',
    online: true,
    requested_at: m ? m.requested_at : ctx.timestamp,
  };
  if (m) ctx.db.member.identity.update(row);
  else ctx.db.member.insert(row);
}

// ADMIN (or that team's lead): approve / deny a keycard request
export const approve_request = spacetimedb.reducer(
  { uid: t.string() },
  (ctx, { uid }) => {
    const r = ctx.db.access_request.uid.find(uid.trim().toUpperCase());
    if (!r) throw new SenderError('No such request');
    const approver = requireApprover(ctx, r.team);
    ctx.db.access_request.uid.update({ ...r, status: 'approved', decided_by: approver });
    if (r.claimed_by) setMemberFromRequest(ctx, r, r.claimed_by, 'approved');
    setBox(ctx, true, `Approved ${r.name}`);
    writeLog(ctx, approver, `Approved ${r.name} (${r.team}) after keycard tap`);
  }
);

export const deny_request = spacetimedb.reducer(
  { uid: t.string() },
  (ctx, { uid }) => {
    const r = ctx.db.access_request.uid.find(uid.trim().toUpperCase());
    if (!r) throw new SenderError('No such request');
    const approver = requireApprover(ctx, r.team);
    ctx.db.access_request.uid.update({ ...r, status: 'denied', decided_by: approver });
    if (r.claimed_by) setMemberFromRequest(ctx, r, r.claimed_by, 'denied');
    setBox(ctx, false, `Denied ${r.name}`);
    writeLog(ctx, approver, `Denied ${r.name}`);
  }
);

// EMPLOYEE COMPUTER: "that's me" - links this device to a keycard request
export const claim_request = spacetimedb.reducer(
  { uid: t.string() },
  (ctx, { uid }) => {
    if (!isUnlocked(ctx)) throw new SenderError('Locked: waiting for the admin');
    const r = ctx.db.access_request.uid.find(uid.trim().toUpperCase());
    if (!r) throw new SenderError('No such request');
    if (r.status === 'denied') throw new SenderError('This request was denied');
    ctx.db.access_request.uid.update({ ...r, claimed_by: ctx.sender });
    setMemberFromRequest(ctx, r, ctx.sender, r.status === 'approved' ? 'approved' : 'badge_verified');
    writeLog(ctx, r.name, 'Linked this computer to keycard request');
  }
);

export const badge_tap = spacetimedb.reducer({ uid: t.string() }, (ctx, { uid }) => handleTap(ctx, uid));
export const lead_tap = spacetimedb.reducer({ uid: t.string() }, (ctx, { uid }) => handleTap(ctx, uid));

export const approve = spacetimedb.reducer(
  { who: t.identity() },
  (ctx, { who }) => {
    const m = ctx.db.member.identity.find(who);
    if (!m) throw new SenderError('No such request');
    const approver = requireApprover(ctx, m.team);
    if (m.status !== 'badge_verified')
      throw new SenderError(`${m.name} must tap their badge at the box first`);
    ctx.db.member.identity.update({ ...m, status: 'approved' });
    setBox(ctx, true, `Approved ${m.name}`);
    writeLog(ctx, approver, `Approved ${m.name} (${m.role}, ${m.team}) after badge check`);
  }
);

export const deny = spacetimedb.reducer(
  { who: t.identity() },
  (ctx, { who }) => {
    const m = ctx.db.member.identity.find(who);
    if (!m) throw new SenderError('No such request');
    const approver = requireApprover(ctx, m.team);
    ctx.db.member.identity.update({ ...m, status: 'denied' });
    writeLog(ctx, approver, `Denied ${m.name}`);
  }
);

export const start_badge_registration = spacetimedb.reducer(
  { name: t.string(), team: t.string(), role: t.string() },
  (ctx, { name, team, role }) => {
    requireConsole(ctx);
    if (!isUnlocked(ctx)) throw new SenderError('Admin must tap in first');
    if (!name.trim()) throw new SenderError('Name is required');
    const row = {
      id: 0,
      name: name.trim(),
      team: team.trim(),
      role: role.trim() || 'employee',
      until: new Timestamp(ctx.timestamp.microsSinceUnixEpoch + 60_000_000n),
    };
    if (ctx.db.register_mode.id.find(0)) ctx.db.register_mode.id.update(row);
    else ctx.db.register_mode.insert(row);
    setBox(ctx, true, `Tap ${row.name}'s new badge now`);
    writeLog(ctx, 'Admin', `Badge registration started for ${row.name}`, 'System');
  }
);

export const register_badge = spacetimedb.reducer(
  { uid: t.string(), name: t.string(), team: t.string(), role: t.string() },
  (ctx, { uid, name, team, role }) => {
    requireConsole(ctx);
    const id = uid.trim().toUpperCase();
    if (!id || !name.trim()) throw new SenderError('Badge ID and name are required');
    const row = { uid: id, name: name.trim(), team: team.trim(), role: role.trim() || 'employee', registered_at: ctx.timestamp };
    if (ctx.db.badge.uid.find(id)) ctx.db.badge.uid.update(row);
    else ctx.db.badge.insert(row);
    writeLog(ctx, 'Admin', `Registered badge ${id} to ${row.name} (${row.team}, ${row.role})`, 'System');
  }
);

export const remove_badge = spacetimedb.reducer(
  { uid: t.string() },
  (ctx, { uid }) => {
    requireConsole(ctx);
    const id = uid.trim().toUpperCase();
    const b = ctx.db.badge.uid.find(id);
    if (!b) throw new SenderError('No such badge');
    if (b.role === 'admin') throw new SenderError('Cannot remove the admin badge');
    ctx.db.badge.uid.delete(id);
    writeLog(ctx, 'Admin', `Removed badge for ${b.name}`, 'System');
  }
);

export const lock_gate = spacetimedb.reducer(ctx => {
  requireConsole(ctx);
  const s = ctx.db.system_state.id.find(0)!;
  ctx.db.system_state.id.update({ ...s, admin_unlocked: false });
  writeLog(ctx, 'Admin', 'Gate locked', 'System');
});

// Pico typed "!C<digits>" on the Lead console
export const lead_code = spacetimedb.reducer(
  { code: t.string() },
  (ctx, { code }) => {
    requireConsole(ctx);
    const w = ctx.db.approval_window.id.find(0);
    if (
      !w ||
      w.open_until.microsSinceUnixEpoch < ctx.timestamp.microsSinceUnixEpoch
    ) {
      setBox(ctx, false, 'Tap Lead badge first');
      writeLog(ctx, 'Box', 'Code entered without a valid badge tap');
      return;
    }
    let match: any = undefined;
    for (const m of ctx.db.member.iter()) {
      if ((m.status === 'awaiting_badge' || m.status === 'badge_verified') && m.join_code === code)
        match = m;
    }
    ctx.db.approval_window.id.delete(0); // one approval per tap
    if (!match) {
      setBox(ctx, false, `No pending request with code ${code}`);
      writeLog(ctx, 'Box', `Wrong join code ${code}`);
      return;
    }
    ctx.db.member.identity.update({ ...match, status: 'approved' });
    setBox(ctx, true, `Approved ${match.name}`);
    writeLog(ctx, 'Lead', `Approved ${match.name} (${match.role}) with badge`);
  }
);

export const revoke = spacetimedb.reducer(
  { who: t.identity() },
  (ctx, { who }) => {
    requireConsole(ctx);
    const m = ctx.db.member.identity.find(who);
    if (!m) throw new SenderError('No such member');
    ctx.db.member.identity.update({ ...m, status: 'revoked' });
    writeLog(ctx, 'Lead', `Revoked ${m.name}`);
  }
);

// ---------- INCIDENT ----------

// Pico typed "!P" (panic button)
export const panic = spacetimedb.reducer(ctx => {
  requireConsole(ctx);
  const i = ctx.db.incident.id.find(0)!;
  if (i.active) return;
  ctx.db.incident.id.update({
    ...i,
    active: true,
    title: i.title || 'Incident declared',
    severity: 'High',
    declared_at: ctx.timestamp,
  });
  setBox(ctx, true, 'INCIDENT ACTIVE');
  writeLog(ctx, 'Lead', 'Panic button: incident declared', 'Detect');
});

export const update_incident = spacetimedb.reducer(
  { title: t.string(), severity: t.string(), summary: t.string() },
  (ctx, { title, severity, summary }) => {
    const who = requireApproved(ctx);
    const i = ctx.db.incident.id.find(0)!;
    ctx.db.incident.id.update({ ...i, title, severity, summary });
    writeLog(ctx, who, `Updated incident: ${title} [${severity}]`);
  }
);

export const resolve_incident = spacetimedb.reducer(ctx => {
  requireConsole(ctx);
  const i = ctx.db.incident.id.find(0)!;
  const st = ctx.db.system_state.id.find(0);
  ctx.db.incident.id.update({
    ...i,
    active: false,
    declared_at: i.declared_at ?? (st ? st.unlocked_at : undefined) ?? ctx.timestamp,
    resolved_at: ctx.timestamp,
  });
  writeLog(ctx, 'Lead', 'Incident resolved. Final report generated.');
});

export const add_note = spacetimedb.reducer(
  { text: t.string() },
  (ctx, { text }) => {
    const who = requireApproved(ctx);
    if (!text.trim()) throw new SenderError('Empty note');
    writeLog(ctx, who, text.trim());
  }
);

// ---------- SCOPE ----------

export const add_asset = spacetimedb.reducer(
  { name: t.string(), kind: t.string() },
  (ctx, { name, kind }) => {
    const who = requireApproved(ctx);
    ctx.db.asset.insert({
      id: 0n,
      name,
      kind,
      status: 'Under review',
      updated_by: who,
      updated_at: ctx.timestamp,
    });
    writeLog(ctx, who, `Added to scope: ${name} (${kind})`);
  }
);

export const set_asset_status = spacetimedb.reducer(
  { id: t.u64(), status: t.string() },
  (ctx, { id, status }) => {
    const who = requireApproved(ctx);
    const a = ctx.db.asset.id.find(id);
    if (!a) throw new SenderError('No such asset');
    ctx.db.asset.id.update({ ...a, status, updated_by: who, updated_at: ctx.timestamp });
    writeLog(ctx, who, `${a.name} marked ${status}`, 'Contain');
    const normStatus = status.toLowerCase();
    if (normStatus.includes('exfil')) {
      startLegalClocks(ctx);
      writeLog(
        ctx,
        who,
        `LEGAL: ${a.name} marked exfiltrated — countdowns started`,
        'Contain'
      );
    }
  }
);

// ---------- BUILDING MAP & TASKS ----------

export const seed_demo_data = spacetimedb.reducer(ctx => {
  requireConsole(ctx);
  let anyMachine = false;
  for (const _ of ctx.db.machine.iter()) {
    anyMachine = true;
    break;
  }
  if (!anyMachine) {
    for (let floor = 1; floor <= 3; floor++) {
      for (let n = 1; n <= 5; n++) {
        ctx.db.machine.insert({
          id: 0n,
          floor,
          label: `${floor}-${n}`,
          status: 'Unchecked',
          updated_by: 'System',
          updated_at: ctx.timestamp,
        });
      }
    }
  }
  let anyAsset = false;
  for (const _ of ctx.db.asset.iter()) {
    anyAsset = true;
    break;
  }
  if (!anyAsset) {
    ctx.db.asset.insert({
      id: 0n,
      name: 'Client matter database',
      kind: 'client',
      status: 'Suspected',
      updated_by: 'System',
      updated_at: ctx.timestamp,
    });
    ctx.db.asset.insert({
      id: 0n,
      name: 'File share /home',
      kind: 'internal',
      status: 'Locked',
      updated_by: 'System',
      updated_at: ctx.timestamp,
    });
  }
  writeLog(ctx, 'Lead', 'Seeded demo machines (15) and sample assets', 'System');
});

export const update_machine = spacetimedb.reducer(
  { id: t.u64(), status: t.string() },
  (ctx, { id, status }) => {
    const who = requireApproved(ctx);
    const m = ctx.db.machine.id.find(id);
    if (!m) throw new SenderError('No such machine');
    const allowed = MACHINE_NEXT[m.status] ?? [];
    if (!allowed.includes(status))
      throw new SenderError(`Invalid transition ${m.status} → ${status}`);
    ctx.db.machine.id.update({
      ...m,
      status,
      updated_by: who,
      updated_at: ctx.timestamp,
    });
    writeLog(
      ctx,
      who,
      `Machine ${m.label} (floor ${m.floor}) → ${status}`,
      'Contain'
    );
  }
);

// ADMIN or EMPLOYEE: set a desk on the building map (creates the machine row the first time)
export const set_desk = spacetimedb.reducer(
  { label: t.string(), floor: t.u32(), status: t.string() },
  (ctx, { label, floor, status }) => {
    const who = requireApproved(ctx);
    const existing = [...ctx.db.machine.iter()].find((m: any) => m.label === label);
    if (existing) {
      ctx.db.machine.id.update({ ...existing, status, updated_by: who, updated_at: ctx.timestamp });
    } else {
      ctx.db.machine.insert({ id: 0n, floor, label, status, updated_by: who, updated_at: ctx.timestamp });
    }
    writeLog(ctx, who, `Desk ${label} (floor ${floor}) marked ${status}`, 'Contain');
  }
);

export const assign_floor = spacetimedb.reducer(
  { who: t.identity(), floor: t.u32() },
  (ctx, { who, floor }) => {
    const lead = requireLead(ctx);
    const m = ctx.db.member.identity.find(who);
    if (!m || m.status !== 'approved') throw new SenderError('Member not approved');
    const row = { identity: who, floor, assigned_at: ctx.timestamp };
    if (ctx.db.zone_assignment.identity.find(who))
      ctx.db.zone_assignment.identity.update(row);
    else ctx.db.zone_assignment.insert(row);
    writeLog(ctx, lead, `Assigned ${m.name} to floor ${floor}`, 'Contain');
  }
);

const isOpenAssignee = (n: string) => !n || n === 'Anyone';

// ADMIN: create a task for one person, or open to anyone (assignee_name '' or 'Anyone')
export const create_task = spacetimedb.reducer(
  { text: t.string(), assignee_name: t.string(), detail: t.string(), urgent: t.bool() },
  (ctx, { text, assignee_name, detail, urgent }) => {
    const lead = requireLead(ctx);
    if (!text.trim()) throw new SenderError('Task text required');
    const who = isOpenAssignee(assignee_name.trim()) ? '' : assignee_name.trim();
    ctx.db.task.insert({
      id: 0n,
      text: text.trim(),
      assignee_name: who,
      status: 'open',
      escalated: false,
      created_by: lead,
      created_at: ctx.timestamp,
      acked_at: undefined,
      detail: detail.trim(),
      urgent,
      done_at: undefined,
      pings: 0,
    });
    writeLog(ctx, lead, `${urgent ? 'URGENT task' : 'Task'} ${who ? `assigned to ${who}` : 'open to anyone'}: ${text.trim()}`, 'Contain');
  }
);

// EMPLOYEE: take an open task (it starts right away)
export const claim_task = spacetimedb.reducer({ id: t.u64() }, (ctx, { id }) => {
  const who = requireApproved(ctx);
  const tk = ctx.db.task.id.find(id);
  if (!tk) throw new SenderError('No such task');
  if (!isOpenAssignee(tk.assignee_name) || tk.status !== 'open') throw new SenderError('Already taken');
  ctx.db.task.id.update({ ...tk, assignee_name: who, status: 'acknowledged', acked_at: ctx.timestamp });
  writeLog(ctx, who, `Claimed and started: ${tk.text}`, 'Recover');
});

// EMPLOYEE: start a task assigned to me
export const ack_task = spacetimedb.reducer({ id: t.u64() }, (ctx, { id }) => {
  const who = requireApproved(ctx);
  const tk = ctx.db.task.id.find(id);
  if (!tk) throw new SenderError('No such task');
  if (tk.assignee_name !== who && !isConsole(ctx))
    throw new SenderError('Only assignee can start this');
  ctx.db.task.id.update({
    ...tk,
    status: 'acknowledged',
    acked_at: ctx.timestamp,
  });
  writeLog(ctx, who, `Started task: ${tk.text}`, 'Recover');
});

// EMPLOYEE (assignee) or ADMIN: mark done / undo
export const toggle_task_done = spacetimedb.reducer({ id: t.u64() }, (ctx, { id }) => {
  const who = requireApproved(ctx);
  const tk = ctx.db.task.id.find(id);
  if (!tk) throw new SenderError('No such task');
  if (tk.assignee_name !== who && !isConsole(ctx)) throw new SenderError('Only assignee or admin');
  if (tk.status === 'done') {
    ctx.db.task.id.update({ ...tk, status: 'acknowledged', done_at: undefined });
  } else {
    ctx.db.task.id.update({ ...tk, status: 'done', done_at: ctx.timestamp, acked_at: tk.acked_at ?? ctx.timestamp });
    writeLog(ctx, who, `Done: ${tk.text}`, 'Recover');
  }
});

// ADMIN: give the task to someone else (or the open pool). Restarts the 5-minute clock.
export const reassign_task = spacetimedb.reducer(
  { id: t.u64(), assignee_name: t.string() },
  (ctx, { id, assignee_name }) => {
    const lead = requireLead(ctx);
    const tk = ctx.db.task.id.find(id);
    if (!tk) throw new SenderError('No such task');
    const who = isOpenAssignee(assignee_name.trim()) ? '' : assignee_name.trim();
    ctx.db.task.id.update({
      ...tk, assignee_name: who, status: 'open', created_at: ctx.timestamp,
      acked_at: undefined, escalated: false, pings: 0,
    });
    writeLog(ctx, lead, `Reassigned to ${who || 'anyone'}: ${tk.text}`, 'Contain');
  }
);

// ADMIN: re-page the same person. Restarts the 5-minute clock.
export const repage_task = spacetimedb.reducer({ id: t.u64() }, (ctx, { id }) => {
  const lead = requireLead(ctx);
  const tk = ctx.db.task.id.find(id);
  if (!tk) throw new SenderError('No such task');
  ctx.db.task.id.update({ ...tk, created_at: ctx.timestamp, pings: tk.pings + 1, escalated: false });
  writeLog(ctx, lead, `Re-paged ${tk.assignee_name || 'anyone'}: ${tk.text}`, 'Contain');
});

// EMPLOYEE: report the state of a company system
export const submit_report = spacetimedb.reducer(
  { system_id: t.string(), kind: t.string(), source: t.string(), location: t.string(), impact: t.string(), do_not_touch: t.bool() },
  (ctx, { system_id, kind, source, location, impact, do_not_touch }) => {
    const who = requireApproved(ctx);
    const m = ctx.db.member.identity.find(ctx.sender);
    const row = {
      system_id, kind, source, location: location.trim(), impact: impact.trim() || 'None given',
      do_not_touch, reported_by: who, reported_team: m ? m.team : 'Admin',
      reported_at: ctx.timestamp, confirmed: false, confirmed_at: undefined,
    };
    if (ctx.db.system_report.system_id.find(system_id)) ctx.db.system_report.system_id.update(row);
    else ctx.db.system_report.insert(row);
    writeLog(ctx, who, `System report: ${system_id} is ${kind}${location.trim() ? ` (${location.trim()})` : ''}`, 'Detect');
  }
);

// ADMIN: confirm a reported system
export const confirm_system = spacetimedb.reducer({ system_id: t.string() }, (ctx, { system_id }) => {
  const lead = requireLead(ctx);
  const r = ctx.db.system_report.system_id.find(system_id);
  if (!r) throw new SenderError('No report for that system');
  ctx.db.system_report.system_id.update({ ...r, confirmed: true, confirmed_at: ctx.timestamp });
  writeLog(ctx, lead, `Confirmed system report: ${system_id}`, 'Detect');
});

export const check_task_escalations = spacetimedb.reducer(ctx => {
  requireLead(ctx);
  const now = ctx.timestamp.microsSinceUnixEpoch;
  for (const tk of ctx.db.task.iter()) {
    if (tk.status !== 'open' || tk.escalated) continue;
    if (now - tk.created_at.microsSinceUnixEpoch >= TASK_ESCALATE_MICROS) {
      ctx.db.task.id.update({ ...tk, escalated: true });
      writeLog(
        ctx,
        'System',
        `ESCALATION: task for ${tk.assignee_name} — ${tk.text}`,
        'Contain'
      );
    }
  }
});

export const log_page = spacetimedb.reducer(
  { names: t.string(), message: t.string() },
  (ctx, { names, message }) => {
    requireConsole(ctx);
    writeLog(
      ctx,
      'Lead',
      `TEAM PAGED: ${names} — ${message}`,
      'Detect'
    );
  }
);

// ---------- COMMS ----------

export const send_message = spacetimedb.reducer(
  { text: t.string() },
  (ctx, { text }) => {
    const who = requireApproved(ctx);
    if (!text.trim()) throw new SenderError('Empty message');
    ctx.db.message.insert({ id: 0n, sender_name: who, text: text.trim(), sent: ctx.timestamp });
  }
);
