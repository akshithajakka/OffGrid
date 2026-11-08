import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui';
import { useStore } from '../../data/react';
import { USE_MOCK } from '../../stdb/config';
import { useLiveTables } from '../../stdb/LiveTables';

function useGateUnlocked(): boolean {
  const live = useLiveTables();
  const s = useStore();
  if (USE_MOCK) return !!s.incident.leadSession;
  return !!live?.systemState?.adminUnlocked;
}

export function GatePage() {
  const unlocked = useGateUnlocked();

  return (
    <div className="flex min-h-screen flex-col bg-[#A31D17] text-white">
      <header className="bg-black/25 px-6 py-5 text-[14px] caps tracking-[0.2em] sm:px-10">
        <span className="flex items-center gap-3">{Icon.shield} OffGrid</span>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12 text-center">
        <div className="flex size-28 items-center justify-center rounded-full bg-white text-[#A31D17]">{Icon.key}</div>
        {unlocked ? (
          <>
            <h1 className="max-w-xl text-[38px] font-black uppercase leading-tight sm:text-[48px]">OffGrid is open</h1>
            <p className="max-w-lg text-[18px] text-white/90">Choose how you are joining the incident cell.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/admin"
                className="min-w-[200px] border-2 border-white bg-black/40 px-8 py-4 text-[16px] font-bold uppercase tracking-wide hover:bg-black/60"
              >
                Admin
              </Link>
              <Link
                to="/employee"
                className="min-w-[200px] border-2 border-gold bg-gold px-8 py-4 text-[16px] font-bold uppercase tracking-wide text-[#1A1206] hover:brightness-105"
              >
                Employee
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="max-w-2xl text-[32px] font-black uppercase leading-tight sm:text-[44px]">
              OffGrid is locked
            </h1>
            <p className="max-w-xl text-[20px] font-semibold leading-snug">
              Waiting for the admin to authenticate at the box.
            </p>
            <Link
              to="/admin"
              className="mt-4 min-w-[200px] border-2 border-white bg-black/40 px-8 py-4 text-[16px] font-bold uppercase tracking-wide hover:bg-black/60"
            >
              Admin
            </Link>
            <p className="max-w-md text-[14px] text-white/70">Employee entry stays locked until the admin taps in.</p>
          </>
        )}
      </main>
    </div>
  );
}
