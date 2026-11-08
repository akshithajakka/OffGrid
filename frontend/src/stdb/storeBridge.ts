import type { Identity } from 'spacetimedb';
import type { Infer } from 'spacetimedb';
import type AssetRow from '../module_bindings/asset_table';
import type MachineRow from '../module_bindings/machine_table';
import type MemberRow from '../module_bindings/member_table';
import type { State } from '../data/types';

type Member = Infer<typeof MemberRow>;
type Machine = Infer<typeof MachineRow>;
type Asset = Infer<typeof AssetRow>;

export type ReducerBag = {
  panic: () => Promise<boolean>;
  requestAccess: (a: { name: string; role: string; team: string }) => Promise<boolean>;
  badgeTap: (a: { uid: string }) => Promise<boolean>;
  leadTap: (a: { uid: string }) => Promise<boolean>;
  leadCode: (a: { code: string }) => Promise<boolean>;
  approve: (a: { who: Identity }) => Promise<boolean>;
  deny: (a: { who: Identity }) => Promise<boolean>;
  revoke: (a: { who: Identity }) => Promise<boolean>;
  lockGate: () => Promise<boolean>;
  startBadgeRegistration: (a: { name: string; team: string; role: string }) => Promise<boolean>;
  registerBadge: (a: { uid: string; name: string; team: string; role: string }) => Promise<boolean>;
  removeBadge: (a: { uid: string }) => Promise<boolean>;
  sendMessage: (a: { text: string }) => Promise<boolean>;
  addNote: (a: { text: string }) => Promise<boolean>;
  updateMachine: (a: { id: bigint; status: string }) => Promise<boolean>;
  setAssetStatus: (a: { id: bigint; status: string }) => Promise<boolean>;
  addAsset: (a: { name: string; kind: string }) => Promise<boolean>;
  seedDemo: () => Promise<boolean>;
  resolveIncident: () => Promise<boolean>;
  registerConsole: (a: { pin: string }) => Promise<boolean>;
  createTask: (a: { text: string; assigneeName: string; detail: string; urgent: boolean }) => Promise<boolean>;
  ackTask: (a: { id: bigint }) => Promise<boolean>;
  claimTask: (a: { id: bigint }) => Promise<boolean>;
  toggleTaskDone: (a: { id: bigint }) => Promise<boolean>;
  reassignTask: (a: { id: bigint; assigneeName: string }) => Promise<boolean>;
  repageTask: (a: { id: bigint }) => Promise<boolean>;
  submitReport: (a: {
    systemId: string; kind: string; source: string; location: string; impact: string; doNotTouch: boolean;
  }) => Promise<boolean>;
  confirmSystem: (a: { systemId: string }) => Promise<boolean>;
  setDesk: (a: { label: string; floor: number; status: string }) => Promise<boolean>;
  approveRequest: (a: { uid: string }) => Promise<boolean>;
  denyRequest: (a: { uid: string }) => Promise<boolean>;
  claimRequest: (a: { uid: string }) => Promise<boolean>;
};

type Bridge = {
  getState: () => State;
  reducers: ReducerBag;
  members: readonly Member[];
  machines: readonly Machine[];
  assets: readonly Asset[];
};

let bridge: Bridge | null = null;
const listeners = new Set<() => void>();

export function registerSpacetimeStore(b: Bridge) {
  bridge = b;
  listeners.forEach((l) => l());
}

export function subscribeSpacetimeStore(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getSpacetimeSnapshot(): State | null {
  return bridge?.getState() ?? null;
}

export function getSpacetimeBridge() {
  return bridge;
}

export function notifySpacetimeListeners() {
  listeners.forEach((l) => l());
}
