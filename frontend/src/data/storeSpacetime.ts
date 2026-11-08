import type { DeskStatus, Group } from './types';
import type { ReportInput } from './storeMock';
import { getSpacetimeBridge, getSpacetimeSnapshot, subscribeSpacetimeStore } from '../stdb/storeBridge';
import { freshState } from './seed';

function sessionId() {
  let sid = sessionStorage.getItem('warroom-sid');
  if (!sid) {
    sid = Math.random().toString(36).slice(2, 11);
    sessionStorage.setItem('warroom-sid', sid);
  }
  return sid;
}

/** Employee ids look like "member:Priya Nair" (live) or a seed id; the backend stores names. */
function personName(id: string | null): string {
  if (!id) return '';
  if (id.startsWith('member:')) return id.slice(7);
  const st = getSpacetimeSnapshot();
  return st?.employees.find((e) => e.id === id)?.name ?? id;
}

/** Store-shaped API backed by SpacetimeDB reducers (subset for demo paths). */
class SpacetimeStoreFacade {
  readonly sid = sessionId();

  subscribe = (l: () => void) => subscribeSpacetimeStore(l);
  private fallback = freshState();
  get = () => getSpacetimeSnapshot() ?? this.fallback;

  cardTap(rawId: string) {
    getSpacetimeBridge()?.reducers.badgeTap({ uid: rawId.trim().toUpperCase() });
  }

  requestJoin(text: string, role = 'IT', team = 'Response') {
    const name = text.trim();
    getSpacetimeBridge()?.reducers.requestAccess({ name, role, team });
  }

  approve(reqId: string) {
    const m = getSpacetimeBridge()?.members.find((x) => x.identity.toHexString() === reqId);
    if (m) getSpacetimeBridge()?.reducers.leadCode({ code: m.joinCode });
  }

  deny(reqId: string) {
    const m = getSpacetimeBridge()?.members.find((x) => x.identity.toHexString() === reqId);
    if (m) getSpacetimeBridge()?.reducers.revoke({ who: m.identity });
  }

  revoke(employeeId: string) {
    const m = getSpacetimeBridge()?.members.find((x) => x.name === employeeId);
    if (m) getSpacetimeBridge()?.reducers.revoke({ who: m.identity });
  }

  setDesk(deskId: string, status: DeskStatus) {
    const map: Record<DeskStatus, string> = {
      unchecked: 'Unchecked',
      suspected: 'Suspected',
      infected: 'Infected',
      contained: 'Contained',
      clean: 'Clean',
    };
    const label = deskId.replace(/^d-/, '');
    const floor = Number(/^F(\d+)/.exec(label)?.[1] ?? 0);
    getSpacetimeBridge()?.reducers.setDesk({ label, floor, status: map[status] });
  }

  sendMessage(text: string) {
    getSpacetimeBridge()?.reducers.sendMessage({ text });
  }

  addLog(text: string) {
    getSpacetimeBridge()?.reducers.addNote({ text });
  }

  startOver() {
    getSpacetimeBridge()?.reducers.registerConsole({ pin: '2468' });
    getSpacetimeBridge()?.reducers.seedDemo();
    getSpacetimeBridge()?.reducers.panic();
  }

  resolve() {
    return getSpacetimeBridge()?.reducers.resolveIncident();
  }

  markPaged(_groups: Group[]) {
  getSpacetimeBridge()?.reducers.addNote({ text: 'Team paged (manual call from personal phone)' });
  }

  demoReset() {
    getSpacetimeBridge()?.reducers.seedDemo();
  }

  demoBusy() {
    getSpacetimeBridge()?.reducers.seedDemo();
    getSpacetimeBridge()?.reducers.panic();
  }

  demoSpread(floor: number) {
    const status = 'Infected';
    getSpacetimeBridge()?.machines
      .filter((m) => m.floor === floor)
      .forEach((m) => getSpacetimeBridge()?.reducers.updateMachine({ id: m.id, status }));
  }

  heartbeat() {
    /* presence via onConnect */
  }

  submitReport(r: ReportInput) {
    getSpacetimeBridge()?.reducers.submitReport({
      systemId: r.systemId, kind: r.kind, source: r.source, location: r.location,
      impact: r.impact, doNotTouch: r.doNotTouch,
    });
  }

  ackTask(taskId: string) {
    getSpacetimeBridge()?.reducers.ackTask({ id: BigInt(taskId) });
  }

  createTask(title: string, detail: string, assigneeId: string | null, urgent = false, _dueMins: number | null = null) {
    getSpacetimeBridge()?.reducers.createTask({
      text: title,
      detail: detail ?? '',
      assigneeName: personName(assigneeId),
      urgent: !!urgent,
    });
  }

  cycleData(id: string) {
    const asset = getSpacetimeBridge()?.assets.find((a) => String(a.id) === id);
    if (!asset) return;
    const next =
      asset.status === 'Suspected'
        ? 'Exfiltrated'
        : asset.status === 'Locked'
          ? 'Exfiltrated'
          : 'Suspected';
    getSpacetimeBridge()?.reducers.setAssetStatus({ id: asset.id, status: next });
  }

  myRequest() {
    return null;
  }

  toggleDone(taskId: string) {
    getSpacetimeBridge()?.reducers.toggleTaskDone({ id: BigInt(taskId) });
  }


  claimTask(taskId: string) {
    getSpacetimeBridge()?.reducers.claimTask({ id: BigInt(taskId) });
  }

  nudge(employeeId: string) {
    this.addLog(`Reminder sent to ${personName(employeeId)}`);
  }

  confirmSystem(systemId: string) {
    getSpacetimeBridge()?.reducers.confirmSystem({ systemId });
  }

  addFiles(_files: { name: string; size: number }[]) {
    this.addLog('Evidence file noted (upload stub)');
  }

  sendToLawyer() {
    this.addLog('Privileged package marked ready for counsel');
  }

  repage(taskId: string) {
    getSpacetimeBridge()?.reducers.repageTask({ id: BigInt(taskId) });
  }

  reassign(taskId: string, assigneeId: string | null) {
    getSpacetimeBridge()?.reducers.reassignTask({ id: BigInt(taskId), assigneeName: personName(assigneeId) });
  }
}

export const spacetimeStore = new SpacetimeStoreFacade();
