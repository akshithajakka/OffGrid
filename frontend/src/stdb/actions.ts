import { getSpacetimeBridge } from './storeBridge';
import { USE_MOCK } from './config';
import { mockStore } from '../data/storeMock';

function r() {
  const b = getSpacetimeBridge();
  if (!b) throw new Error('Not connected to SpacetimeDB');
  return b.reducers;
}

export const actions = {
  badgeTapped(uid: string) {
    if (USE_MOCK) return mockStore.cardTap(uid);
    r().leadTap({ uid: uid.toUpperCase() });
  },
  login(name: string, role: string) {
    if (USE_MOCK) return mockStore.requestJoin(name);
    r().requestAccess({ name, role });
  },
  approveJoinCode(code: string) {
    if (USE_MOCK) return;
    r().leadCode({ code });
  },
  startIncident() {
    if (USE_MOCK) return mockStore.startOver();
    r().panic();
    r().seedDemo();
  },
  sendChat(text: string) {
    if (USE_MOCK) return mockStore.sendMessage(text);
    r().sendMessage({ text });
  },
  setMachineStatus(machineId: bigint, status: string) {
    if (USE_MOCK) return;
    r().updateMachine({ id: machineId, status });
  },
  setAssetStatus(id: bigint, status: string) {
    if (USE_MOCK) return mockStore.cycleData(String(id));
    r().setAssetStatus({ id, status });
  },
};
