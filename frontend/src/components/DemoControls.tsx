import { useState } from 'react';
import { DemoNav } from './DemoNav';
import { DemoTools } from './DemoTools';

/** Fallback demo tour + software taps (collapsed by default). */
export function DemoControls() {
  const [open, setOpen] = useState(false);
  const onLead = window.location.pathname.startsWith('/admin') || window.location.hash.startsWith('#/lead');
  if (!open) {
    return (
      <button
        type="button"
        className="fixed bottom-3 left-3 z-50 border border-line2 bg-black/85 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-faint hover:text-ink"
        onClick={() => setOpen(true)}
      >
        Demo controls
      </button>
    );
  }
  return (
  <>
    <DemoNav />
    <DemoTools onLead={onLead} />
    <button
      type="button"
      className="fixed bottom-3 left-3 z-[51] border border-line2 bg-panel px-3 py-1.5 text-[11px] uppercase tracking-[0.14em]"
      onClick={() => setOpen(false)}
    >
      Hide demo
    </button>
  </>
  );
}
