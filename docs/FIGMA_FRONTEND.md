# Figma / zip frontend (do not change UI)

The visual app comes from **`war-room-app.zip`** (`~/Downloads/war-room-app`).

**Do not edit** these paths for branding, copy, layout, or styling — keep them **byte-for-byte** with the zip unless the designer ships a new zip:

- `frontend/index.html`
- `frontend/src/index.css`
- `frontend/src/App.tsx`
- `frontend/src/components/**`
- `frontend/src/pages/**`
- `frontend/src/lib/**`
- `frontend/src/data/seed.ts`, `types.ts`, `react.ts`
- `frontend/src/data/storeMock.ts` (copy of zip `store.ts`)

**Allowed** changes live only in:

- `frontend/src/stdb/**` — Spacetime connection / middleware
- `frontend/src/data/store.ts` — mock vs live switch
- `frontend/src/data/storeSpacetime.ts` — reducer facade
- `frontend/src/module_bindings/**`
- `frontend/src/main.tsx` — may wrap `<App />` in `OffGridStdbRoot` only (no extra UI)

Project name **OffGrid** is for repo/docs/backend/Wi‑Fi only, not Figma copy inside the zip UI.
