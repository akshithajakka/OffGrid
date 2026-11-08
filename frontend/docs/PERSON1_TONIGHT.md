# Person 1 — integrate tonight (checkpoint ~6 PM)

## Your loop (keep `spacetime start` running)

```bash
cd ~/Desktop/OffGrid
spacetime publish offgrid --server local --delete-data=always --yes=all   # only when schema changes
echo y | spacetime generate --lang typescript --out-dir src/module_bindings --module-path spacetimedb
npm run dev
```

## What you shipped in the backend (maps to design §6)

| Design | Implemented |
|--------|-------------|
| Panic / incident | `panic` reducer |
| Approve login (fob + code) | `lead_tap`, `lead_code`, `request_access` |
| Building map | `machine` + `update_machine` + `seed_demo_data` |
| Tasks | `create_task`, `ack_task`, `check_task_escalations` |
| Legal countdown | `legal_deadline` + auto on `set_asset_status` exfil |
| Timeline (append-only) | `log_entry` hash chain + `add_note` |
| Chat | `send_message` |
| Page team | `log_page` |
| Floor assignment | `assign_floor` |

## What Person 2 wires in React

- **`docs/FRONTEND_CONTRACT.md`** — tables & reducers
- **`src/BoxConsole.tsx`** — Lead + Pico keyboard hook (`usePicoKeyboard.ts`)
- **`src/ResponderDev.tsx`** — scratch UI (replace with real dashboard)

## 6 PM demo script (2 browsers)

1. Tab A: **Box Console** → Register console → Seed demo → Panic  
2. Tab B (incognito): **Responder** → Request access → note join code  
3. Tab A: type `!F<LEAD_FOB_UID>` then `!C<code>` (or on-screen if no Pico)  
4. Tab B: tap machine → Infected; mark asset Exfiltrated → legal banner  
5. Show `log_entry` growing (Person 2 subscribes next)

## Before Pico works

Set `LEAD_FOB_UID` in `spacetimedb/src/index.ts` from `rfid_test.py`.

## Publish gotcha

Schema changes need:

`spacetime publish offgrid --server local --delete-data=always --yes=all`
