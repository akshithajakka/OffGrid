import { useEffect, useState } from 'react';
import App from './App';
import { DemoTools } from './components/DemoTools';
import { useNow, useStore } from './data/react';
import { Gate } from './pages/lead/Gate';

function useHash() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const f = () => setHash(window.location.hash);
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return hash;
}

/**
 * Kit laptops use `/` (bookmark). Until the Incident Lead starts the protocol on `#/lead`,
 * employees see the same red Gate — site locked. After admin opens, `/` is always the join flow
 * (who you are → keycard button → wait for approve) — never the red screen again.
 */
export function SiteEntry() {
  const hash = useHash();
  const s = useStore();
  const now = useNow(1000);
  const onLead = hash.startsWith('#/lead');
  const isReport = hash.startsWith('#/report');
  /** Kit join flow after admin starts protocol; report stays available after resolve. */
  const siteOpen = s.incident.status === 'active' || s.incident.status === 'resolved';
  const notice = s.notice && now - s.notice.at < 7000 ? s.notice : null;

  if (!onLead && !isReport && !siteOpen) {
    return (
      <>
        <Gate notice={notice} />
        {import.meta.env.VITE_HIDE_DEMO !== 'true' && (
          <>
            <div className="h-16" aria-hidden="true" />
            <DemoTools onLead={false} />
          </>
        )}
      </>
    );
  }

  return <App />;
}
