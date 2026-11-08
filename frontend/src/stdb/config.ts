export const STDB_URI =
  import.meta.env.VITE_STDB_URI ??
  import.meta.env.VITE_SPACETIMEDB_HOST ??
  'ws://localhost:3000';

export const STDB_MODULE =
  import.meta.env.VITE_STDB_MODULE ??
  import.meta.env.VITE_SPACETIMEDB_DB_NAME ??
  'warroom';

export const USE_MOCK = import.meta.env.VITE_MOCK === 'true';
export const DEV_TOOLS = import.meta.env.VITE_DEV_TOOLS === 'true';
