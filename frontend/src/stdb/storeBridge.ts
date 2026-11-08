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
  panic: () => void;
  requestAccess: (a: { name: string; role: string }) => void;
  leadTap: (a: { uid: string }) => void;
  leadCode: (a: { code: string }) => void;
  revoke: (a: { who: Identity }) => void;
  sendMessage: (a: { text: string }) => void;
  addNote: (a: { text: string }) => void;
  updateMachine: (a: { id: bigint; status: string }) => void;
  setAssetStatus: (a: { id: bigint; status: string }) => void;
  addAsset: (a: { name: string; kind: string }) => void;
  seedDemo: () => void;
  resolveIncident: () => void;
  registerConsole: (a: { pin: string }) => void;
  createTask: (a: { text: string; assigneeName: string }) => void;
  ackTask: (a: { id: bigint }) => void;
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
