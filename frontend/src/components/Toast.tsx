import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type ToastItem = { id: number; text: string; tone: 'error' | 'ok' };

type ToastListener = (text: string, tone?: 'error' | 'ok') => void;
const bus = new Set<ToastListener>();

export function pushToast(text: string, tone: 'error' | 'ok' = 'error') {
  bus.forEach((l) => l(text, tone));
}

const ToastCtx = createContext<(text: string, tone?: 'error' | 'ok') => void>(pushToast);

export function useToast() {
  return useContext(ToastCtx);
}

export function errText(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try {
    return JSON.stringify(e);
  } catch {
    return 'Something went wrong';
  }
}

export async function callReducer<T>(fn: () => Promise<T>, toast: (t: string) => void): Promise<T | undefined> {
  try {
    return await fn();
  } catch (e) {
    toast(errText(e));
    return undefined;
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((text: string, tone: 'error' | 'ok' = 'error') => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, text, tone }]);
    window.setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 6000);
  }, []);
  useEffect(() => {
    bus.add(push);
    return () => {
      bus.delete(push);
    };
  }, [push]);
  const value = useMemo(() => push, [push]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-3 top-3 z-[100] flex max-w-md flex-col gap-2">
        {items.map((t) => (
          <p
            key={t.id}
            role="alert"
            className={`pointer-events-auto border px-4 py-3 text-[14px] font-semibold shadow-lg ${
              t.tone === 'error' ? 'border-[#ff6b6b] bg-[#2a1010] text-[#ffb4b4]' : 'border-gold bg-[#1a1608] text-gold'
            }`}
          >
            {t.text}
          </p>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
