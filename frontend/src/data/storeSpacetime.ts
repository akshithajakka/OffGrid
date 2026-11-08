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

/** Store-shaped API backed by SpacetimeDB reducers (subset for demo paths). */
class SpacetimeStoreFacade {
  readonly sid = sessionId();

  subscribe = (l: () => void) => subscribeSpacetimeStore(l);
  get = () => getSpacetimeSnapshot() ?? freshState();

  cardTap(rawId: string) {
    getSpacetimeBridge()?.reducers.leadTap({ uid: rawId.trim().toUpperCase() });
  }

  requestJoin(text: string) {
    const name = text.trim();
    const role = 'IT';
    getSpacetimeBridge()?.reducers.requestAccess({ name, role });
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
    const machine = getSpacetimeBridge()?.machines.find((m) => m.label === label);
    if (machine) getSpacetimeBridge()?.reducers.updateMachine({ id: machine.id, status: map[status] });
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
    getSpacetimeBridge()?.reducers.resolveIncident();
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

  submitReport(_r: ReportInput) {
    this.addLog('System report submitted (see scope in Data tab)');
  }

  ackTask(taskId: string) {
    getSpacetimeBridge()?.reducers.ackTask({ id: BigInt(taskId) });
  }

  createTask(title: string, _detail: string, assigneeId: string | null) {
    getSpacetimeBridge()?.reducers.createTask({
      text: title,
      assigneeName: assigneeId ?? 'Anyone',
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
    this.ackTask(taskId);
  }

  claimTask(_taskId: string) {}

  nudge(employeeId: string) {
    this.addLog(`Reminder sent to ${employeeId}`);
  }

  confirmSystem(systemId: string) {
    this.addLog(`Confirmed system ${systemId}`);
  }

  addFiles(_files: { name: string; size: number }[]) {
    this.addLog('Evidence file noted (upload stub)');
  }

  sendToLawyer() {
    this.addLog('Privileged package marked ready for counsel');
  }

  repage(taskId: string) {
    this.addLog(`Re-paged assignee for task ${taskId}`);
  }

  reassign(taskId: string, assigneeId: string | null) {
    this.addLog(`Task ${taskId} reassigned to ${assigneeId ?? 'open pool'}`);
  }
}

export const spacetimeStore = new SpacetimeStoreFacade();
