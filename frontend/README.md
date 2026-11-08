# OffGrid frontend

Vite + React OffGrid dashboard.

```bash
npm install
npm run dev -- --host
```

Env (see `.env.example`):

- `VITE_MOCK` — `true` for offline demo
- `VITE_STDB_URI` / `VITE_STDB_MODULE` — local Spacetime
- `VITE_DEV_TOOLS` — Demo Tools panel

Bindings: `npm run spacetime:generate` (module at `../backend/spacetime`).
