/*
 * Web Serial badge reader (Chrome/Edge). The Pico prints "Badge: XXXXXXXX" on its USB serial port
 * for every tap. This reads those lines and fires the same FOB_EVENT a keyboard tap would.
 * Needs a secure context: open the admin console at http://localhost:5173 on the box laptop.
 * Close Thonny's connection to the Pico first (only one program can open the port).
 */
import { FOB_EVENT } from './fob';

type Status = 'unsupported' | 'idle' | 'connecting' | 'connected' | 'error';
let status = 'idle' as Status;
let lastError = '';
const listeners = new Set<() => void>();
let snap: { status: Status; lastError: string } = { status, lastError };
function set(s: Status, err = '') {
  status = s;
  lastError = err;
  snap = { status, lastError };
  listeners.forEach((l) => l());
}
export function readerStatus() {
  return snap;
}
export function onReaderStatus(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

const serial = (navigator as unknown as { serial?: any }).serial;
if (!serial) set('unsupported');

async function readLoop(port: any) {
  await port.open({ baudRate: 115200 });
  set('connected');
  const decoder = new TextDecoderStream();
  port.readable.pipeTo(decoder.writable).catch(() => {});
  const reader = decoder.readable.getReader();
  let buf = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value;
      let i: number;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        const m = /Badge:\s*([0-9A-F]{6,20})/i.exec(line);
        if (m) window.dispatchEvent(new CustomEvent(FOB_EVENT, { detail: m[1].toUpperCase() }));
      }
    }
  } finally {
    set('idle');
  }
}

/** Ask the user to pick the Pico (needs a click). */
export async function connectReader() {
  if (!serial) return set('unsupported');
  try {
    set('connecting');
    const port = await serial.requestPort();
    await readLoop(port);
  } catch (e) {
    set('error', e instanceof Error ? e.message : String(e));
  }
}

/** Reconnect without a click to a port the user already approved earlier. */
export async function autoConnectReader() {
  if (!serial || status === 'connected' || status === 'connecting') return;
  try {
    const ports = await serial.getPorts();
    if (ports.length) {
      set('connecting');
      await readLoop(ports[0]);
    }
  } catch (e) {
    set('error', e instanceof Error ? e.message : String(e));
  }
}
