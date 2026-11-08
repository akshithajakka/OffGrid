import { useEffect, useRef } from 'react';

/*
 * The Pico acts as a USB keyboard and types "!F<card id>" + Enter for ANY card or fob.
 * This catches those lines anywhere on the page, even while a text box is focused.
 * The Pico types very fast; if a person types "!" by hand, the pause after it
 * gives the "!" back to whatever box they were typing in.
 */
const FOB_LINE = /^!F([0-9A-F]+)$/i;
export const FOB_EVENT = 'warroom:fob'; // Demo tools fire this to fake a tap

function giveBackText(text: string) {
  const el = document.activeElement;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    try {
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      el.setRangeText(text, start, end, 'end');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } catch {
      /* field type without a cursor */
    }
  }
}

export function useFobListener(onFob: (fobId: string) => void) {
  const cb = useRef(onFob);
  useEffect(() => {
    cb.current = onFob;
  });

  useEffect(() => {
    let buf = '';
    let timer: number | undefined;
    const release = () => {
      if (buf) giveBackText(buf);
      buf = '';
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!buf && e.key !== '!') return;
      if (e.key === 'Shift') return; // the Pico holds Shift for "!" and capital letters
      e.preventDefault();
      e.stopPropagation();
      window.clearTimeout(timer);
      if (e.key === 'Enter') {
        const m = FOB_LINE.exec(buf);
        if (m) {
          buf = '';
          cb.current(m[1].toUpperCase());
        } else release();
        return;
      }
      if (e.key.length === 1) buf += e.key;
      timer = window.setTimeout(release, 150);
    };
    const onFake = (e: Event) => cb.current(String((e as CustomEvent).detail).toUpperCase());
    window.addEventListener('keydown', onKey, true);
    window.addEventListener(FOB_EVENT, onFake);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener(FOB_EVENT, onFake);
      window.clearTimeout(timer);
    };
  }, []);
}
