// War Room in a Box: SpacetimeDB module (server side)
// Drop this file into your project's spacetimedb/src/index.ts
//
// Before the demo, change the two constants below:
//   SETUP_PIN      a PIN only the Lead knows, used once to register the Lead console laptop
//   LEAD_FOB_UID   the ID your blue fob printed in the Pico test (for example "4A3F9C12")

import { schema, t, table, SenderError } from 'spacetimedb/server';
import { Timestamp } from 'spacetimedb';

const SETUP_PIN = '2468';
const LEAD_FOB_UID = 'CHANGE_ME';
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

// Everyone who asked to join. status: pending | approved | revoked
const member = table(
  { name: 'member', public: true },
  {
    identity: t.identity().primaryKey(),
    name: t.string(),
    role: t.string(),
    status: t.string(),
    join_code: t.string(),
    online: t.bool(),
    requested_at: t.timestamp(),
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

const spacetimedb = schema({
  console_reg,
  lead_badge,
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
  if (m.role !== 'Lead' && m.role !== 'IT Lead')
    throw new SenderError('Only Incident Lead can do this');
  return m.name;
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
  ctx.db.lead_badge.insert({ uid: LEAD_FOB_UID, owner: 'Incident Lead' });
  ctx.db.incident.insert({
    id: 0,
    active: false,
    title: '',
    severity: 'Low',
    summary: '',
    declared_at: undefined,
  });
  writeLog(ctx, 'System', 'War Room started', 'System');
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

// A responder asks to join. Their screen shows the join code to read aloud.
export const request_access = spacetimedb.reducer(
  { name: t.string(), role: t.string() },
  (ctx, { name, role }) => {
    if (!name.trim()) throw new SenderError('Name is required');
    const existing = ctx.db.member.identity.find(ctx.sender);
    if (existing && existing.status === 'revoked')
      throw new SenderError('Access was revoked. Ask the Lead.');
    const seed =
      ctx.sender.toHexString() + ctx.timestamp.microsSinceUnixEpoch.toString();
    const code = (parseInt(fnv(seed), 16) % 10000).toString().padStart(4, '0');
    const row = {
      identity: ctx.sender,
      name: name.trim(),
      role: role.trim(),
      status: 'pending',
      join_code: code,
      online: true,
      requested_at: ctx.timestamp,
    };
    if (existing) ctx.db.member.identity.update(row);
    else ctx.db.member.insert(row);
    writeLog(ctx, name.trim(), `Requested access as ${role.trim()}`);
  }
);

// Pico typed "!F<uid>" on the Lead console
export const lead_tap = spacetimedb.reducer(
  { uid: t.string() },
  (ctx, { uid }) => {
    requireConsole(ctx);
    const badge = ctx.db.lead_badge.uid.find(uid.toUpperCase());
    if (!badge) {
      setBox(ctx, false, 'Badge not authorized');
      writeLog(ctx, 'Box', `Rejected unknown badge ${uid}`);
      return;
    }
    const row = {
      id: 0,
      open_until: new Timestamp(
        ctx.timestamp.microsSinceUnixEpoch + APPROVAL_WINDOW_MICROS
      ),
      badge_uid: badge.uid,
    };
    if (ctx.db.approval_window.id.find(0)) ctx.db.approval_window.id.update(row);
    else ctx.db.approval_window.insert(row);
    setBox(ctx, true, 'Lead verified. Enter join code.');
    writeLog(ctx, 'Lead', 'Badge tapped, approval window open');
  }
);

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
      if (m.status === 'pending' && m.join_code === code) match = m;
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
  ctx.db.incident.id.update({ ...i, active: false });
  writeLog(ctx, 'Lead', 'Incident resolved');
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
    const norm = status.toLowerCase();
    if (norm.includes('exfil')) {
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

export const create_task = spacetimedb.reducer(
  { text: t.string(), assignee_name: t.string() },
  (ctx, { text, assignee_name }) => {
    const lead = requireLead(ctx);
    if (!text.trim()) throw new SenderError('Task text required');
    ctx.db.task.insert({
      id: 0n,
      text: text.trim(),
      assignee_name: assignee_name.trim(),
      status: 'open',
      escalated: false,
      created_by: lead,
      created_at: ctx.timestamp,
      acked_at: undefined,
    });
    writeLog(ctx, lead, `Task assigned to ${assignee_name}: ${text}`, 'Contain');
  }
);

export const ack_task = spacetimedb.reducer({ id: t.u64() }, (ctx, { id }) => {
  const who = requireApproved(ctx);
  const tk = ctx.db.task.id.find(id);
  if (!tk) throw new SenderError('No such task');
  if (tk.assignee_name !== who && !isConsole(ctx))
    throw new SenderError('Only assignee can acknowledge');
  ctx.db.task.id.update({
    ...tk,
    status: 'acknowledged',
    acked_at: ctx.timestamp,
  });
  writeLog(ctx, who, `Acknowledged task: ${tk.text}`, 'Recover');
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
