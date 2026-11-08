import { useState } from 'react';
import { useStore } from '../data/react';
import { LEAD_FOB } from '../data/seed';
import { store } from '../data/store';
import { FOB_EVENT } from '../lib/fob';
import { btnOutline } from './ui';

/** Fakes the hardware for building and rehearsing. Card taps only work on the Lead screen tab. */
export function DemoTools({ onLead }: { onLead: boolean }) {
  const s = useStore();
  const [open, setOpen] = useState(false);
  const [card, setCard] = useState(s.employees[1]?.cardId ?? '');
  const tap = (id: string) => window.dispatchEvent(new CustomEvent(FOB_EVENT, { detail: id }));
  const item = `${btnOutline} h-10 w-full justify-start normal-case tracking-normal text-[13px] font-semibold`;
  if (!open) {
    return <button className="fixed bottom-3 right-3 z-50 border border-line2 bg-black/85 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-faint hover:text-ink" onClick={() => setOpen(true)}>Demo tools</button>;
  }
  return (
    <div className="fixed bottom-3 right-3 z-50 flex w-80 flex-col gap-2 border border-line2 bg-[#0F0F12] p-3.5 shadow-2xl">
      <p className="text-[12px] text-dim">Pretend hardware. Remove before the real build.</p>
      {onLead ? (
        <>
          <button className={item} onClick={() => tap(LEAD_FOB)}>Tap the Lead’s key fob</button>
          <div className="flex gap-2">
            <select aria-label="Employee card" value={card} onChange={(e) => setCard(e.target.value)} className="h-10 min-w-0 flex-1 border border-line2 bg-bg px-2 text-[13px]">
              {s.employees.filter((e) => e.role !== 'lead').map((e) => <option key={e.id} value={e.cardId}>{e.name}’s card</option>)}
            </select>
            <button className={`${btnOutline} h-10`} onClick={() => tap(card)}>Tap</button>
          </div>
          <button className={item} onClick={() => tap('DEADA1F0')}>Tap an unknown card</button>
        </>
      ) : (
        <p className="text-[12.5px] text-faint">Card taps happen on the Lead screen (open #/lead in another tab).</p>
      )}
      <button className={item} onClick={() => store.demoSpread(3)}>Spread infection on Floor 3</button>
      <button className={item} onClick={() => window.confirm('Replace everything with a busy incident 40 minutes in?') && store.demoBusy()}>Load busy example</button>
      <button className={item} onClick={() => window.confirm('Reset everything to a fresh start?') && store.demoReset()}>Reset to fresh start</button>
      <button className="h-9 text-[12px] text-faint underline" onClick={() => setOpen(false)}>Close</button>
    </div>
  );
}
