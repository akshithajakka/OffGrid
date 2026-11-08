# OffGrid hardware setup

## ESP32-S3 (OFFGRID Wi‑Fi)

1. Flash `src/offgrid_ap.ino` (board: **ESP32S3 Dev Module**).
2. Set a strong password in the sketch before demo.
3. Admin console + employee **kit laptops** join **OffGrid** (no other network); console runs Spacetime + `frontend` dev server.

## SpacetimeDB (while you still have internet)

From repo root:

```bash
spacetime start
spacetime publish offgrid --server local
```

On the laptop joined to **OFFGRID**: `ipconfig getifaddr en0` → point `VITE_STDB_URI` at `ws://<that-ip>:3000`.

See root `README.md` and `docs/demo-flow.md`.
