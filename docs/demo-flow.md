# Demo flow (judges)

1. **Story** — “Corp VPN is down / hostile; we power the OffGrid box.”
2. **Network** — Join `OFFGRID` (or your SSID from firmware); captive portal or printed URL → dashboard.
3. **Lead** — Open `#/lead`; show machines/assets syncing from Spacetime (or Demo Tools if mock).
4. **RFID / join code** — Tap badge; approval window + join code path (hardware or Demo Tools).
5. **Incident** — Raise incident, assign task, post message; show log stream updating live.
6. **Panic / legal** — Toggle panic banner; show legal deadline row for drama + compliance angle.

## Before demo

```bash
spacetime start
spacetime publish offgrid --server local   # from repo root
cd frontend && npm run dev -- --host
```

Set `frontend/.env.local`: `VITE_MOCK=false`, `VITE_STDB_URI=ws://127.0.0.1:3000`, `VITE_STDB_MODULE=offgrid`, `VITE_DEV_TOOLS=true`.

## Fallback

If Wi‑Fi hardware fails: same UI with `VITE_MOCK=true` and Demo Tools seeding state.
