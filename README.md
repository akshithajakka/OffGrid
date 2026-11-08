# OffGrid — War Room in a Box

Monorepo for HackUTD **OffGrid**: isolated backup LAN, SpacetimeDB backend, React command UI, ESP32/Pico hardware.

## Layout

| Path | Role |
|------|------|
| `frontend/` | Vite + React dashboard (`#/lead`, employee views, Demo Tools) |
| `backend/spacetime/` | SpacetimeDB module (`warroom`) |
| `hardware/esp32/` | Captive-portal AP firmware |
| `hardware/wiring/` | Wiring notes |
| `docs/` | Architecture and demo script |

## Quick start (local)

```bash
# Terminal 1 — database
spacetime start
cd backend/spacetime && spacetime publish warroom --server local

# Terminal 2 — UI (from repo root config)
cd frontend && npm install && npm run dev
```

Copy `frontend/.env.example` to `frontend/.env.local`. Use `VITE_MOCK=true` without Spacetime, or `VITE_MOCK=false` with `VITE_STDB_URI=ws://127.0.0.1:3000` and `VITE_STDB_MODULE=warroom`.

## Branches

Integration work lives on feature branches (not `main`). See `docs/demo-flow.md` for the judge walkthrough.
