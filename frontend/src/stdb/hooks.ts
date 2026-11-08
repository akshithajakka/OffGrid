/**
 * Middleware hooks — map SpacetimeDB tables to UI-friendly views.
 * Components can use these directly; the Figma app still uses useStore() for now.
 */
import { useSpacetimeDB, useTable } from 'spacetimedb/react';
import { tables } from '../module_bindings';
import { USE_MOCK } from './config';
import { mapMembersToRequests, mapTablesToState } from './mapToState';
import { useStore } from '../data/react';
export function useConnectionStatus() {
  const conn = useSpacetimeDB();
  if (USE_MOCK) return { connected: true, status: 'connected' as const };
  return { connected: conn.isActive, status: conn.isActive ? 'connected' : 'disconnected' };
}

export function useIncidentView() {
  if (USE_MOCK) {
    const s = useStore();
    return s.incident;
  }
  const [incidents] = useTable(tables.incident);
  const row = incidents.find((i) => i.id === 0);
  return mapTablesToState({
    members: [],
    machines: [],
    assets: [],
    incident: row,
    log: [],
    messages: [],
    tasks: [],
    sid: '',
  }).incident;
}

export function useEmployeesAndSystems() {
  const s = useStore();
  return { employees: s.employees, systems: s.systems, desks: s.desks };
}

export function useTimeline() {
  if (USE_MOCK) return useStore().log;
  const [log] = useTable(tables.logEntry);
  return log.map((e) => ({
    id: String(e.id),
    at: Number(e.at.microsSinceUnixEpoch / 1000n),
    title: e.actor,
    sub: e.text,
    tone: 'blue' as const,
  }));
}

export function useDataAssets() {
  if (USE_MOCK) return useStore().data;
  const [assets] = useTable(tables.asset);
  return assets;
}

export function useMessages() {
  if (USE_MOCK) return useStore().messages;
  const [messages] = useTable(tables.message);
  return messages;
}

export function usePendingTaps() {
  if (USE_MOCK) return useStore().requests.filter((r) => r.status === 'awaiting_lead');
  const [members] = useTable(tables.member);
  return mapMembersToRequests(
    members.filter((m) => m.status === 'pending'),
    'Laptop'
  );
}

export function useUsers() {
  if (USE_MOCK) return useStore().employees;
  const [members] = useTable(tables.member);
  return members;
}

export function useAuditLog() {
  if (USE_MOCK) return useStore().log;
  const [log] = useTable(tables.logEntry);
  return log;
}
