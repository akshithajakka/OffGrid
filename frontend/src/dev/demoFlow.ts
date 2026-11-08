import { store } from '../data/store';
import { freshState } from '../data/seed';
import type { State } from '../data/types';

const KEY = 'warroom-app-v1';

/** Name used for the button-driven employee demo (no hardware). */
export const DEMO_EMPLOYEE_NAME = 'Priya Nair';

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    /* ignore */
  }
  return freshState();
}

function patch(fn: (d: State) => void) {
  const d = load();
  fn(d);
  localStorage.setItem(KEY, JSON.stringify(d));
  window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: localStorage.getItem(KEY) }));
}

/** Employee device: pretend keycard tap at the box (no Pico). */
export function simulateEmployeeKeycardTap(sessionId: string) {
  patch((d) => {
    const r = d.requests.find((x) => x.sessionId === sessionId && x.status === 'awaiting_card');
    if (!r) return;
    const e = d.employees.find((x) => x.id === r.employeeId);
    r.status = 'awaiting_lead';
    r.cardAt = Date.now();
    d.notice = {
      at: Date.now(),
      tone: 'ok',
      text: `${e?.name ?? r.typed}'s card checks out. Compare their face and screen code, then approve.`,
    };
  });
}

export function submitDemoEmployeeName() {
  store.requestJoin(DEMO_EMPLOYEE_NAME);
}

export function approveFirstPending() {
  const d = load();
  const pending = d.requests
    .filter((r) => r.status === 'awaiting_lead')
    .sort((a, b) => (a.cardAt ?? 0) - (b.cardAt ?? 0));
  const first = pending[0];
  if (!first) return;
  store.approve(first.id);
}
