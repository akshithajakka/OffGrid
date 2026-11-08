import { useEffect, useState } from 'react';
import { DemoTools } from './components/DemoTools';
import { EmployeeApp } from './pages/employee/EmployeeApp';
import { LeadApp, type LeadTab } from './pages/lead/LeadApp';
import { ReportPage } from './pages/ReportPage';

function useHash() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const f = () => setHash(window.location.hash);
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return hash;
}

/*
 * #/lead, #/lead/access, #/lead/tasks → the main computer the board plugs into
 * #/report                            → printable report (Lead only)
 * anything else                       → employee kit laptop (OffGrid Wi‑Fi only)
 */
export default function App() {
  const hash = useHash();
  const onLead = hash.startsWith('#/lead');
  let page = <EmployeeApp />;
  if (onLead) {
    const tab = (hash.split('/')[2] as LeadTab) || 'overview';
    page = <LeadApp tab={['overview', 'access', 'tasks'].includes(tab) ? tab : 'overview'} />;
  } else if (hash.startsWith('#/report')) page = <ReportPage />;
  return (
    <>
      {page}
      {import.meta.env.VITE_HIDE_DEMO !== 'true' && (
        <>
          <div className="h-16" aria-hidden="true" />
          <DemoTools onLead={onLead} />
        </>
      )}
    </>
  );
}
