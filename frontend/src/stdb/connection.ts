import { Identity } from 'spacetimedb';
import { DbConnection, ErrorContext } from '../module_bindings';
import { STDB_MODULE, STDB_URI } from './config';

export type ConnStatus = 'connecting' | 'connected' | 'disconnected';

const TOKEN_KEY = `${STDB_URI}/${STDB_MODULE}/auth_token`;

export type ConnListeners = {
  onStatus?: (s: ConnStatus) => void;
  onIdentity?: (id: Identity) => void;
};

let status: ConnStatus = 'connecting';
const statusListeners = new Set<(s: ConnStatus) => void>();

function setStatus(s: ConnStatus) {
  status = s;
  statusListeners.forEach((l) => l(s));
}

export function getConnStatus() {
  return status;
}

export function subscribeConnStatus(fn: (s: ConnStatus) => void): () => void {
  statusListeners.add(fn);
  fn(status);
  return () => {
    statusListeners.delete(fn);
  };
}

export function createConnectionBuilder(listeners?: ConnListeners) {
  setStatus('connecting');
  return DbConnection.builder()
    .withUri(STDB_URI)
    .withDatabaseName(STDB_MODULE)
    .withToken(localStorage.getItem(TOKEN_KEY) || undefined)
    .onConnect((_conn, identity, token) => {
      localStorage.setItem(TOKEN_KEY, token);
      setStatus('connected');
      listeners?.onIdentity?.(identity);
      listeners?.onStatus?.('connected');
      console.info('[offgrid] connected', identity.toHexString());
    })
    .onDisconnect(() => {
      setStatus('disconnected');
      listeners?.onStatus?.('disconnected');
      console.warn('[offgrid] disconnected — retrying via SDK');
    })
    .onConnectError((_ctx: ErrorContext, err: Error) => {
      setStatus('disconnected');
      listeners?.onStatus?.('disconnected');
      console.error('[offgrid] connect error', err);
    });
}
