import { ReactNode, useEffect, useMemo } from 'react';
import { SpacetimeDBProvider, useReducer, useSpacetimeDB, useTable } from 'spacetimedb/react';
import { tables, reducers } from '../module_bindings';
import { createConnectionBuilder } from './connection';
import { mapTablesToState } from './mapToState';
import { USE_MOCK } from './config';
import { registerSpacetimeStore, type ReducerBag } from './storeBridge';
import type { State } from '../data/types';
import { LiveTablesProvider } from './LiveTables';
import { wrapReducer } from './wrapReducer';

export function OffGridStdbRoot({ children }: { children: ReactNode }) {
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
  const identity = conn.identity ?? null;

  const [members] = useTable(tables.member);
  const [machines] = useTable(tables.machine);
  const [assets] = useTable(tables.asset);
  const [incidents] = useTable(tables.incident);
  const [log] = useTable(tables.logEntry);
  const [messages] = useTable(tables.message);
  const [tasks] = useTable(tables.task);
  const [systemStates] = useTable(tables.systemState);
  const [boxStatuses] = useTable(tables.boxStatus);
  const [badges] = useTable(tables.badge);
  const [consoleRegs] = useTable(tables.consoleReg);
  const [registerModes] = useTable(tables.registerMode);
  const [accessRequests] = useTable(tables.accessRequest);
  const [reports] = useTable(tables.systemReport);

  const panic = useReducer(reducers.panic);
  const requestAccess = useReducer(reducers.requestAccess);
  const badgeTap = useReducer(reducers.badgeTap);
  const leadTap = useReducer(reducers.leadTap);
  const leadCode = useReducer(reducers.leadCode);
  const approve = useReducer(reducers.approve);
  const deny = useReducer(reducers.deny);
  const revoke = useReducer(reducers.revoke);
  const lockGate = useReducer(reducers.lockGate);
  const startBadgeRegistration = useReducer(reducers.startBadgeRegistration);
  const registerBadge = useReducer(reducers.registerBadge);
  const removeBadge = useReducer(reducers.removeBadge);
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
  const approveRequest = useReducer(reducers.approveRequest);
  const denyRequest = useReducer(reducers.denyRequest);
  const claimRequest = useReducer(reducers.claimRequest);
  const claimTask = useReducer(reducers.claimTask);
  const toggleTaskDone = useReducer(reducers.toggleTaskDone);
  const reassignTask = useReducer(reducers.reassignTask);
  const repageTask = useReducer(reducers.repageTask);
  const submitReport = useReducer(reducers.submitReport);
  const confirmSystem = useReducer(reducers.confirmSystem);
  const setDesk = useReducer(reducers.setDesk);

  const reducersBag: ReducerBag = useMemo(
    () => ({
      panic: wrapReducer(() => panic()),
      requestAccess: wrapReducer((a) => requestAccess(a)),
      badgeTap: wrapReducer((a) => badgeTap(a)),
      leadTap: wrapReducer((a) => leadTap(a)),
      leadCode: wrapReducer((a) => leadCode(a)),
      approve: wrapReducer((a) => approve(a)),
      deny: wrapReducer((a) => deny(a)),
      revoke: wrapReducer((a) => revoke(a)),
      lockGate: wrapReducer(() => lockGate()),
      startBadgeRegistration: wrapReducer((a) => startBadgeRegistration(a)),
      registerBadge: wrapReducer((a) => registerBadge(a)),
      removeBadge: wrapReducer((a) => removeBadge(a)),
      sendMessage: wrapReducer((a) => sendMessage(a)),
      addNote: wrapReducer((a) => addNote(a)),
      updateMachine: wrapReducer((a) => updateMachine(a)),
      setAssetStatus: wrapReducer((a) => setAssetStatus(a)),
      addAsset: wrapReducer((a) => addAsset(a)),
      seedDemo: wrapReducer(() => seedDemo()),
      resolveIncident: wrapReducer(() => resolveIncident()),
      registerConsole: wrapReducer((a) => registerConsole(a)),
      createTask: wrapReducer((a) => createTask(a)),
      ackTask: wrapReducer((a) => ackTaskReducer(a)),
      approveRequest: wrapReducer((a) => approveRequest(a)),
      denyRequest: wrapReducer((a) => denyRequest(a)),
      claimRequest: wrapReducer((a) => claimRequest(a)),
      claimTask: wrapReducer((a) => claimTask(a)),
      toggleTaskDone: wrapReducer((a) => toggleTaskDone(a)),
      reassignTask: wrapReducer((a) => reassignTask(a)),
      repageTask: wrapReducer((a) => repageTask(a)),
      submitReport: wrapReducer((a) => submitReport(a)),
      confirmSystem: wrapReducer((a) => confirmSystem(a)),
      setDesk: wrapReducer((a) => setDesk(a)),
    }),
    [
      panic,
      requestAccess,
      badgeTap,
      leadTap,
      leadCode,
      approve,
      deny,
      revoke,
      lockGate,
      startBadgeRegistration,
      registerBadge,
      removeBadge,
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
      approveRequest,
      denyRequest,
      claimRequest,
      claimTask,
      toggleTaskDone,
      reassignTask,
      repageTask,
      submitReport,
      confirmSystem,
      setDesk,
    ]
  );

  const sid = identity?.toHexString() ?? sessionStorage.getItem('offgrid-sid') ?? 'stdb-client';

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
        reports,
        systemState: systemStates.find((s) => s.id === 0),
        sid,
      }),
    [members, machines, assets, incidents, log, messages, tasks, reports, systemStates, sid]
  );

  const liveValue = useMemo(
    () => ({
      identity,
      systemState: systemStates.find((s) => s.id === 0),
      boxStatus: boxStatuses.find((b) => b.id === 0),
      members,
      badges,
      accessRequests,
      consoleReg: consoleRegs.find((c) => c.id === 0),
      registerMode: registerModes.find((r) => r.id === 0),
      reducers: reducersBag,
    }),
    [
      identity,
      systemStates,
      boxStatuses,
      members,
      badges,
      accessRequests,
      consoleRegs,
      registerModes,
      reducersBag,
    ]
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

  return <LiveTablesProvider value={liveValue}>{children}</LiveTablesProvider>;
}
