import { useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBoxKeys } from '../hooks/useBoxKeys';
import { USE_MOCK } from '../stdb/config';
import { useLiveTables } from '../stdb/LiveTables';
import { store } from '../data/store';
import { pushToast } from './Toast';

/**
 * Listens for the Pico on EVERY page of the console laptop (the one the RFID box is plugged into).
 *   blue/admin fob  -> badge_tap (unlocks OffGrid) -> opens the admin page
 *   employee keycard -> badge_tap (creates an approval request for the admin)
 *                       -> opens the employee authentication page (new tab if the admin page is open)
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
        if (!consoleNow) {
          pushToast('Register this laptop as the console on /admin first (PIN), then tap again.');
          navigate('/admin');
          return;
        }
        const ok = await cur.reducers.badgeTap({ uid });
        if (!ok) return;
        const badge = liveRef.current?.badges.find((b) => b.uid === uid);
        if (!badge) return; // unknown card: box banner already shows "not authorized"
        if (badge.role === 'admin') {
          navigate('/admin');
          return;
        }
        const target = `/employee/badge/${uid}`;
        if (pathRef.current.startsWith('/admin')) {
          // keep the admin console where it is; open the employee page next to it
          const w = window.open(target, '_blank');
          if (!w) navigate(target);
        } else {
          navigate(target);
        }
      },
      panic: async () => {
        await liveRef.current?.reducers.panic();
      },
      leadCode: async (code: string) => {
        await liveRef.current?.reducers.leadCode({ code });
      },
    };
    // isConsole in deps so the listener rebinds after console registration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!live, isConsole, navigate]);

  useBoxKeys(handlers);
  return null;
}
