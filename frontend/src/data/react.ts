import { useEffect, useState, useSyncExternalStore } from 'react';
import { store } from './store';

export const useStore = () => useSyncExternalStore(store.subscribe, store.get);

export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}
