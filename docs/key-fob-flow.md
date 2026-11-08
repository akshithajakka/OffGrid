# Key fob / RFID → what opens on screen

Hardware is **not wired in the repo yet**; this is how the **Figma frontend** expects the Pico to behave (see `frontend/src/lib/fob.ts`).

## Brain laptop (Lead console)

**URL:** `http://<host>/#/lead` (any `#/lead/...` tab counts as Lead route)

**Before Lead fob:**

- Red **Gate** screen (“Place your key fob on the reader…”).
- `useFobListener` is active only on Lead routes (`LeadApp`).

**When the Lead’s fob is read** (mock: Demo tools → “Tap the Lead’s key fob”; hardware: Pico types `!F<UID>` + Enter):

1. `store.cardTap(UID)` runs (mock: `storeMock`; live: Spacetime `lead_tap` path).
2. If UID matches **Maria Lopez**’s card in seed (`LEAD_FOB`, default `7A3F92C1`):
   - This browser tab becomes the **Lead session** (`incident.leadSession = sid`).
   - Incident status → **active** (first tap) or “welcome back” (resume).
3. **Gate closes** → **Lead admin dashboard** (dark UI):
   - **Overview** at `#/lead` or `#/lead/overview`
   - Tabs: **Access control** (`#/lead/access`), **Tasks** (`#/lead/tasks`)

That is “step 3” on the red Gate screen: admin dashboard with first steps.

**Same Lead fob again while unlocked:** approves the next pending employee waiting for Lead approval (if any).

**Non-Lead cards on Lead computer:** error toast — only Lead fob can start the protocol.

## Employee kit laptop

Secure company laptops join **only** the ESP32 **OffGrid** SSID (no internet, no corporate LAN).

**URL:** `http://<host>/` (not `#/lead`)

- Name entry → request join → card tap flow.
- Until Lead has tapped, employees see “Lead hasn’t started the protocol yet.”
- After protocol is active, employee **badge taps** (`!F<uid>`) pair with their on-screen request; Lead approves on **Access control**.

## Pico → browser contract (for hardware team)

| Input | Typed into focused window | Frontend handler |
|--------|---------------------------|------------------|
| RFID | `!F` + hex UID + Enter | `useFobListener` → `store.cardTap` |
| Panic (planned) | `!P` + Enter | (not in zip UI yet — backend may have panic) |
| Join code keypad | `!C` + digits + `#` | employee / access flows as designed |

Lead console must stay focused (or foreground) so USB HID keystrokes hit the browser.

## No hardware yet (Demo tools)

Use two browser tabs (same `localhost`; mock shares `localStorage`):

| Tab | URL | Demo tools button |
|-----|-----|-------------------|
| **Priya’s laptop** | `http://localhost:5173/` | **1 · I’m Priya — I typed my name** |
| **Lead** | `http://localhost:5173/#/lead` | Lead fob → **2 · Priya tapped card (3C5D92C1) → Access** |

**Lead sees:** `#/lead/access` — gold **Approve people** card (photo, dept, **their screen code**).

**Priya’s tab:** **3 · Open my screen** — big code while waiting; after Lead clicks **Approve access**, run **3** again (or refresh) → employee dashboard.

Real hardware later: same screens; Pico types `!F3C5D92C1` on the Lead machine instead of button **2**.
