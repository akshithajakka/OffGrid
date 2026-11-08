import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { autoConnectReader, connectReader, onReaderStatus, readerStatus } from '../lib/serialReader';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBoxKeys } from '../hooks/useBoxKeys';
import { USE_MOCK } from '../stdb/config';
import { useLiveTables } from '../stdb/LiveTables';
import { store } from '../data/store';
import { pushToast } from './Toast';

/**
 * Listens for the Pico on the box laptop (the one the RFID reader is plugged into).
 *   blue/admin fob   -> badge_tap (unlocks OffGrid) -> opens the admin page
 *   employee keycard -> badge_tap (creates an approval request for the admin). The admin stays on
 *                       /admin; the employee's own device sees the request in SpacetimeDB and opens it.
 * Other devices ignore reader taps.
 */
export function GlobalBoxKeys() {
  const live = useLiveTables();
  const navigate = useNavigate();
  const location = useLocation();
  const liveRef = useRef(live);
  liveRef.current = live;
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  const isConsole =
    !!live?.identity && !!live?.consoleReg && live.consoleReg.identity.isEqual(live.identity);

  const handlers = useMemo(() => {
    if (USE_MOCK) {
      return {
        badgeTap: async (uid: string) => {
          store.cardTap(uid);
        },
        panic: async () => {},
        leadCode: async () => {},
      };
    }
    if (!live) return null;
    return {
      badgeTap: async (uid: string) => {
        const cur = liveRef.current;
        if (!cur) return;
        const consoleNow =
          !!cur.identity && !!cur.consoleReg && cur.consoleReg.identity.isEqual(cur.identity);
        if (!consoleNow) return; // only the box laptop handles reader taps
        const ok = await cur.reducers.badgeTap({ uid });
        if (!ok) return;
        const badge = liveRef.current?.badges.find((b) => b.uid === uid);
        if (!badge) return; // unknown card: box banner already shows "not authorized"
        if (badge.role === 'admin') {
          navigate('/admin');
          return;
        }
        if (pathRef.current.startsWith('/admin')) {
          pushToast(`${badge.name}: keycard verified. Approval request is on this page.`, 'ok');
        } else {
          navigate(`/employee/badge/${uid}`);
        }
      },
      panic: async () => {
        await liveRef.current?.reducers.panic();
      },
      leadCode: async (code: string) => {
        await liveRef.current?.reducers.leadCode({ code });
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!live, isConsole, navigate]);

  useBoxKeys(handlers);

  // Only the admin console tab owns the USB reader. Other tabs must not grab the port.
  const onAdmin = location.pathname.startsWith('/admin');
  useEffect(() => {
    if (onAdmin && isConsole) void autoConnectReader();
  }, [onAdmin, isConsole]);

  return onAdmin && isConsole ? <ReaderButton /> : null;
}

function ReaderButton() {
  const { status, lastError } = useSyncExternalStore(onReaderStatus, readerStatus);
  if (status === 'unsupported') return null;
  const label =
    status === 'connected'
      ? 'Badge reader connected'
      : status === 'connecting'
        ? 'Connecting reader...'
        : 'Connect badge reader';
  return (
    <button
      type="button"
      onClick={() => void connectReader()}
      disabled={status === 'connected' || status === 'connecting'}
      title={lastError || 'Pick the Pico (usbmodem) in the Chrome prompt'}
      className={`fixed bottom-4 right-4 z-50 border px-4 py-3 text-[12px] font-bold uppercase tracking-wide ${
        status === 'connected' ? 'border-[#1F5A35] bg-[#11301D] text-[#7EE2A1]' : 'border-gold bg-gold text-[#1A1206]'
      }`}
    >
      {label}
    </button>
  );
}
