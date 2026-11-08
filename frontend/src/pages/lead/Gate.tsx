import { Icon } from '../../components/ui';
import { useStore } from '../../data/react';
import type { Notice } from '../../data/types';

/* A1: the red screen the computer shows when the board is turned on. */
export function Gate({ notice }: { notice: Notice | null }) {
  const s = useStore();
  const resumed = s.incident.status === 'active';
  const step = (n: number, title: string, sub: string, state: 'done' | 'now' | 'todo') => (
    <li aria-current={state === 'now' ? 'step' : undefined}
      className={`flex flex-[1_1_260px] flex-col gap-3 p-5 ${state === 'now' ? 'border-[3px] border-gold bg-black/40' : state === 'done' ? 'border border-white/25 bg-black/20' : 'border border-dashed border-white/35'}`}>
      {state === 'done'
        ? <span className="flex size-10 items-center justify-center bg-green text-white">{Icon.check}<span className="sr-only">Done</span></span>
        : <span className={`flex size-10 items-center justify-center text-[20px] font-extrabold ${state === 'now' ? 'bg-gold text-[#1A1206]' : 'border-2 border-white/45'}`}>{n}</span>}
      <span className="text-[20px] font-extrabold leading-tight">{title}</span>
      <span className="text-[15px] leading-relaxed text-white/90">{sub}</span>
    </li>
  );
  const pill = (t: string) => (
    <span className="flex h-[34px] items-center gap-2 border border-white/25 bg-black/30 px-3.5 text-[13px] font-semibold">
      <span className="size-2.5 rounded-full bg-[#5BD08A]" aria-hidden="true" />{t}
    </span>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#A31D17]">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 bg-black/25 px-6 py-5 sm:px-10">
        <span className="flex items-center gap-3 text-[14px] caps tracking-[0.2em]">{Icon.shield} War Room in a Box</span>
        <div className="flex flex-wrap gap-2.5 sm:ml-auto">
          {pill('Control box connected')}{pill('Key fob reader ready')}{pill('WARROOM network on · no internet')}
        </div>
      </div>
      <main className="flex flex-1 flex-col items-center gap-9 px-6 py-12 text-center sm:px-10">
        <div className="relative flex size-[168px] items-center justify-center" aria-hidden="true">
          <span className="absolute inset-0 animate-ping rounded-full border-[3px] border-white/40 [animation-duration:2.4s]" />
          <span className="absolute inset-[18px] rounded-full border-[3px] border-white/60" />
          <span className="flex size-[104px] items-center justify-center rounded-full bg-white text-[#A31D17]">{Icon.key}</span>
        </div>
        <div className="flex max-w-4xl flex-col gap-3.5">
          <h1 className="text-[44px] font-black uppercase leading-[0.95] [font-stretch:118%] sm:text-[64px]">
            {resumed ? 'Incident in progress' : 'An incident has occurred'}
          </h1>
          <p className="text-[22px] font-semibold leading-snug sm:text-[26px]">Place your key fob on the reader to {resumed ? 'unlock the command center' : 'start the protocol'}.</p>
        </div>
        {notice && (
          <p role="alert" className={`w-full max-w-[1100px] border-2 px-6 py-4 text-[18px] font-bold ${notice.tone === 'bad' ? 'border-white bg-black/50' : 'border-gold bg-black/40'}`}>{notice.text}</p>
        )}
        <ol className="flex w-full max-w-[1100px] flex-wrap gap-3.5 text-left">
          {step(1, 'Board plugged in and on', 'This computer found the control box. You’re on the private WARROOM network.', 'done')}
          {step(2, 'Hold your key fob on the reader', 'Flat, in the middle of the reader, for 2 seconds. Only the Incident Lead’s fob works.', 'now')}
          {step(3, 'Your admin dashboard opens', 'It opens by itself, with a short list of what to do first.', 'todo')}
        </ol>
        <div className="flex w-full max-w-[1100px] flex-wrap gap-3.5 text-left">
          <div className="flex-[2_1_520px] bg-black/30 px-6 py-5">
            <p className="mb-3 text-[13px] caps tracking-[0.2em] text-gold">Right now, do not</p>
            <ul className="flex flex-col gap-2 text-[16px] leading-relaxed">
              <li>— Restart, shut down or unplug any company computer. IT may need it as evidence.</li>
              <li>— Use company email, Teams or work phones. The attacker may be reading them.</li>
              <li>— Rush. You have time to do this right. Every step is on screen.</li>
            </ul>
          </div>
          <div className="flex-[1_1_300px] border border-white/30 px-6 py-5">
            <p className="mb-2.5 text-[13px] caps tracking-[0.2em]">Fob not working?</p>
            <p className="text-[15px] leading-relaxed text-white/90">Hold it still and flat. Keep this window in front so the box can type into it. Still nothing after 3 tries? Check the USB cable from the board to this computer.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
