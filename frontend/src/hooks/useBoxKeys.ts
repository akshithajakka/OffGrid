import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { FOB_EVENT } from '../lib/fob';
import type { BoxKeyHandlers } from '../stdb/boxKeys';

const BOX_LINE = /^!(F|P|C)(.*)$/i;

// Shared "last tap" so any page (e.g. the admin console) can show it.
type Tap = { uid: string; at: number } | null;
let lastTapShared: Tap = null;
const tapListeners = new Set<() => void>();
function publishTap(t: Tap) {
  lastTapShared = t;
  tapListeners.forEach((l) => l());
}
export function useLastTap(): Tap {
  return useSyncExternalStore(
    (fn) => {
      tapListeners.add(fn);
      return () => tapListeners.delete(fn);
    },
    () => lastTapShared
  );
}

/**
 * Pico keyboard: lines starting with ! until Enter.
 * !F<uid> → badge tap, !P → panic, !C<digits> → lead code
 */
export function useBoxKeys(handlers: BoxKeyHandlers | null) {
  const h = useRef(handlers);
  const [lastTap, setLastTap] = useState<{ uid: string; at: number } | null>(null);
  useEffect(() => {
    h.current = handlers;
  });

  useEffect(() => {
    if (!handlers) return;
    let buf = '';
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!buf && e.key !== '!') return;
      if (e.key === 'Shift') return;
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Enter') {
        const raw = buf.trim();
        buf = '';
        const m = BOX_LINE.exec(raw);
        if (!m || !h.current) return;
        const kind = m[1].toUpperCase();
        const rest = m[2].trim();
        if (kind === 'F' && rest) {
          const uid = rest.toUpperCase();
          const t = { uid, at: Date.now() };
          setLastTap(t);
          publishTap(t);
          void h.current.badgeTap(uid);
        } else if (kind === 'P') {
          void h.current.panic();
        } else if (kind === 'C' && rest) {
          void h.current.leadCode(rest);
        }
        return;
      }
      if (e.key.length === 1) buf += e.key;
    };
    const onFake = (e: Event) => {
      const uid = String((e as CustomEvent).detail).toUpperCase();
      const t = { uid, at: Date.now() };
      setLastTap(t);
      publishTap(t);
      void h.current?.badgeTap(uid);
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener(FOB_EVENT, onFake);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener(FOB_EVENT, onFake);
    };
  }, [handlers]);

  return lastTap;
}
