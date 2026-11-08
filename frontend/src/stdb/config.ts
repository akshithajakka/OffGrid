// "auto" (or unset) = SpacetimeDB runs on the same machine that served this page, port 3000.
// Works for the admin on localhost and for employees on whatever IP the OffGrid network gave the host.
const configured = import.meta.env.VITE_SPACETIMEDB_HOST ?? import.meta.env.VITE_STDB_URI;
export const STDB_URI =
  !configured || configured === 'auto' ? `ws://${window.location.hostname}:3000` : configured;

export const STDB_MODULE =
  import.meta.env.VITE_SPACETIMEDB_DB_NAME ??
  import.meta.env.VITE_STDB_MODULE ??
  'warroom';

export const USE_MOCK = import.meta.env.VITE_MOCK === 'true';
export const DEV_TOOLS = import.meta.env.VITE_DEV_TOOLS === 'true';
