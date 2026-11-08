import { useEffect, useState } from 'react';
import { useStore } from '../data/react';
import { store } from '../data/store';
import { LEAD_FOB } from '../data/seed';
import {
  approveFirstPending,
  DEMO_EMPLOYEE_NAME,
  simulateEmployeeKeycardTap,
  submitDemoEmployeeName,
} from '../dev/demoFlow';
import { empById, isLead, meEmployee, myRequest, pendingApprovals } from '../lib/select';
import { FOB_EVENT } from '../lib/fob';
import { btnGold } from './ui';

type Step = { label: string; run: () => void; hint?: string; passive?: boolean };

function leadTab(hash: string): string {
  if (!hash.startsWith('#/lead')) return '';
  return hash.split('/')[2] || 'overview';
}

function employeeStep(s: ReturnType<typeof useStore>): Step | null {
  if (s.incident.status !== 'active') {
    return {
      label: 'Site locked — red gate',
      hint: 'Admin tab #/lead → unlock; then this shortcut shows “Who are you?”',
      run: () => {
        window.location.hash = '#/lead';
      },
    };
  }

  const me = meEmployee(s, store.sid);
  if (me) {
    return {
      label: 'Employee: in dashboard',
      hint: 'Use a second tab on #/lead for Admin.',
      run: () => {},
      passive: true,
    };
  }

  const r = myRequest(s, store.sid);
  if (!r || r.status === 'not_found' || r.status === 'denied' || r.status === 'revoked') {
    return {
      label: `Employee: Submit name (${DEMO_EMPLOYEE_NAME})`,
      hint: 'Same as typing on the form + Continue.',
      run: () => submitDemoEmployeeName(),
    };
  }

  if (r.status === 'awaiting_card') {
    return {
      label: 'Employee: Tap keycard',
      hint: 'Replaces RFID at the box.',
      run: () => simulateEmployeeKeycardTap(store.sid),
    };
  }

  if (r.status === 'awaiting_lead') {
    return {
      label: 'Employee: waiting for Admin',
      hint: `Show code ${r.code} to Lead; Admin tab → Approve.`,
      run: () => {},
      passive: true,
    };
  }

  return null;
}

function adminStep(hash: string, s: ReturnType<typeof useStore>, leadUnlocked: boolean): Step | null {
  const pending = pendingApprovals(s);

  if (!leadUnlocked) {
    return {
      label: 'Admin: Unlock dashboard (Overview)',
      hint: 'Replaces Lead key fob on red page.',
      run: () => {
        window.dispatchEvent(new CustomEvent(FOB_EVENT, { detail: LEAD_FOB }));
      },
    };
  }

  if (pending.length > 0) {
    const tab = leadTab(hash);
    if (tab !== 'access') {
      return {
        label: `Admin: Access control (${pending.length} waiting)`,
        hint: `${pending[0].typed} tapped in — review & approve.`,
        run: () => {
          window.location.hash = '#/lead/access';
        },
      };
    }
    const who = empById(s, pending[0].employeeId)?.name ?? pending[0].typed;
    return {
      label: `Admin: Approve ${who}`,
      hint: 'Same as Approve access on the gold card.',
      run: () => approveFirstPending(),
    };
  }

  const tab = leadTab(hash);
  if (tab === 'overview' || tab === '') {
    return {
      label: 'Admin: Access control',
      run: () => {
        window.location.hash = '#/lead/access';
      },
    };
  }
  if (tab === 'access') {
    return {
      label: 'Admin: Tasks',
      run: () => {
        window.location.hash = '#/lead/tasks';
      },
    };
  }
  if (tab === 'tasks') {
    return {
      label: 'Open Employee tab (kit laptop)',
      hint: 'New tab: same URL without #/lead',
      run: () => {
        window.open(`${window.location.origin}${window.location.pathname}`, '_blank');
      },
    };
  }
  return null;
}

/** Button-driven demo — no hardware. Employee tab vs Admin tab (#/lead). */
export function DemoNav() {
  const [hash, setHash] = useState(() => window.location.hash);
  const s = useStore();
  const onLead = hash.startsWith('#/lead');
  const leadUnlocked = isLead(s, store.sid);
  const step = onLead ? adminStep(hash, s, leadUnlocked) : employeeStep(s);

  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (import.meta.env.VITE_HIDE_DEMO === 'true' || !step) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-14 z-[60] flex flex-col items-center gap-1 px-4">
      <button
        type="button"
        disabled={step.passive}
        className={`pointer-events-auto ${btnGold} h-14 min-w-[min(100%,440px)] px-6 text-[14px] shadow-2xl ring-2 ring-black/50 disabled:cursor-default disabled:opacity-70`}
        onClick={() => step.run()}
      >
        {step.label}
      </button>
      {step.hint && (
        <p className="pointer-events-none max-w-md text-center text-[11px] text-white/80 drop-shadow-md">{step.hint}</p>
      )}
    </div>
  );
}
