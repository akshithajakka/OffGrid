import { ReactNode, useEffect, useMemo, useState } from 'react';
import { SpacetimeDBProvider, useReducer, useSpacetimeDB, useTable } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { createConnectionBuilder, subscribeConnStatus, type ConnStatus } from './connection';
import { mapTablesToState } from './mapToState';
import { USE_MOCK } from './config';
import { registerSpacetimeStore, type ReducerBag } from './storeBridge';
import type { State } from '../data/types';

export function WarRoomStdbRoot({ children }: { children: ReactNode }) {
  if (USE_MOCK) return <>{children}</>;
  const builder = useMemo(() => createConnectionBuilder(), []);
  return (
    <SpacetimeDBProvider connectionBuilder={builder}>
      <StdbBridge>{children}</StdbBridge>
    </SpacetimeDBProvider>
  );
}

function StdbBridge({ children }: { children: ReactNode }) {
  const conn = useSpacetimeDB();
  const connected = conn.isActive;

  const [members] = useTable(tables.member);
  const [machines] = useTable(tables.machine);
  const [assets] = useTable(tables.asset);
  const [incidents] = useTable(tables.incident);
  const [log] = useTable(tables.logEntry);
  const [messages] = useTable(tables.message);
  const [tasks] = useTable(tables.task);

  const panic = useReducer(reducers.panic);
  const requestAccess = useReducer(reducers.requestAccess);
  const leadTap = useReducer(reducers.leadTap);
  const leadCode = useReducer(reducers.leadCode);
  const revoke = useReducer(reducers.revoke);
  const sendMessage = useReducer(reducers.sendMessage);
  const addNote = useReducer(reducers.addNote);
  const updateMachine = useReducer(reducers.updateMachine);
  const setAssetStatus = useReducer(reducers.setAssetStatus);
  const addAsset = useReducer(reducers.addAsset);
  const seedDemo = useReducer(reducers.seedDemoData);
  const resolveIncident = useReducer(reducers.resolveIncident);
  const registerConsole = useReducer(reducers.registerConsole);
  const createTask = useReducer(reducers.createTask);
  const ackTaskReducer = useReducer(reducers.ackTask);

  const reducersBag: ReducerBag = useMemo(
    () => ({
      panic,
      requestAccess,
      leadTap,
      leadCode,
      revoke,
      sendMessage,
      addNote,
      updateMachine,
      setAssetStatus,
      addAsset,
      seedDemo,
      resolveIncident,
      registerConsole,
      createTask,
      ackTask: ackTaskReducer,
    }),
    [
      panic,
      requestAccess,
      leadTap,
      leadCode,
      revoke,
      sendMessage,
      addNote,
      updateMachine,
      setAssetStatus,
      addAsset,
      seedDemo,
      resolveIncident,
      registerConsole,
      createTask,
      ackTaskReducer,
    ]
  );

  const [connStatus, setConnStatus] = useState<ConnStatus>('connecting');
  useEffect(() => {
    const unsub = subscribeConnStatus(setConnStatus);
    return () => {
      unsub();
    };
  }, []);

  const sid = sessionStorage.getItem('warroom-sid') ?? 'stdb-client';

  const snapshot: State = useMemo(
    () =>
      mapTablesToState({
        members,
        machines,
        assets,
        incident: incidents.find((i) => i.id === 0),
        log,
        messages,
        tasks,
        sid,
      }),
    [members, machines, assets, incidents, log, messages, tasks, sid]
  );

  useEffect(() => {
    if (!connected) return;
    registerSpacetimeStore({
      getState: () => snapshot,
      reducers: reducersBag,
      members,
      machines,
      assets,
    });
  }, [connected, snapshot, reducersBag, members, machines, assets]);

  return (
    <>
      {!connected && connStatus !== 'connecting' && (
        <div className="bg-red px-4 py-2 text-center text-[14px] font-bold text-white">
          Disconnected from war room server — check Wi‑Fi and {import.meta.env.VITE_STDB_URI}
        </div>
      )}
      {children}
    </>
  );
}
