# Frontend + middleware (Person 2)

## Running on the private network

1. Start Spacetime on the **brain laptop**: `spacetime start`
2. Publish module: `spacetime publish offgrid --server local`
3. Join **OFFGRID** Wi‑Fi on the laptop; get IP: `ipconfig getifaddr en0` (often `192.168.4.x`)
4. Copy `.env.example` → `.env.local`:

```env
VITE_STDB_URI=ws://192.168.4.2:3000
VITE_STDB_MODULE=offgrid
VITE_MOCK=false
VITE_DEV_TOOLS=true
```

5. Serve on all interfaces: `npm run dev` (Vite `host: true`)

6. Employee kit laptops: `http://192.168.4.50:5173` · Admin console: `http://192.168.4.50:5173/admin`

**No CDN** — fonts bundled via `@fontsource-variable/archivo`.

## Mock vs live

| Flag | Behavior |
|------|----------|
| `VITE_MOCK=true` | Full Figma flow in `localStorage` (no Spacetime) |
| `VITE_MOCK=false` | Live tables; `src/stdb/` maps DB → UI state |

## Architecture

- `src/stdb/connection.ts` — WebSocket + token + status
- `src/stdb/hooks.ts` — middleware hooks
- `src/stdb/mapToState.ts` — Spacetime rows → `data/types.State`
- `src/components/` — presentation (from Figma zip)
- `src/pages/` — Lead `#/lead/*` + employee views

## Bindings

Never edit `src/module_bindings/`. Regenerate:

```bash
spacetime generate --lang typescript --out-dir src/module_bindings --module-path spacetimedb
```
