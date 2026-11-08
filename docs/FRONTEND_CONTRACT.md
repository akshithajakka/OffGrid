# Frontend contract (Person 2)

SpacetimeDB database name: **`offgrid`**  
Host (dev): **`ws://localhost:3000`** (from `.env.local`)  
On OFFGRID Wi‑Fi: **`ws://<host-laptop-ip>:3000`**

Regenerate bindings after backend changes:

```bash
spacetime publish offgrid --server local
spacetime generate --lang typescript --out-dir src/module_bindings --module-path spacetimedb
```

## Subscribe (React)

Use `useTable` on these public tables:

| Table | UI use |
|-------|--------|
| `incident` | Red bar, severity, title (single row `id === 0`) |
| `member` | Login state, pending approvals, online dots |
| `machine` | Building map tiles |
| `asset` | Affected data/systems list |
| `message` | Chat |
| `log_entry` | Timeline + tamper chain (`prev_hash` / `hash`) |
| `task` | Task cards, pings until ack |
| `legal_deadline` | Lawyer countdown banners |
| `zone_assignment` | Filter map by floor |
| `box_status` | Box Console feedback |
| `approval_window` | Optional: show "window open" |
| `console_reg` | Whether this client is the Lead console |

## Reducers (call from UI)

| Reducer | Who | Args |
|---------|-----|------|
| `register_console` | Lead laptop once | `{ pin }` — must match `SETUP_PIN` in `index.ts` |
| `request_access` | Responder | `{ name, role }` → shows **join code** on waiting screen |
| `lead_tap` | Box Console | `{ uid }` from Pico `!F…` |
| `lead_code` | Box Console | `{ code }` from Pico `!C…` |
| `panic` | Box Console | `!P` — declares incident |
| `revoke` | Lead console | `{ who: Identity }` |
| `update_incident` | Approved | `{ title, severity, summary }` |
| `resolve_incident` | Lead console | — |
| `add_note` | Approved | `{ text }` — append-only timeline via `log_entry` |
| `send_message` | Approved | `{ text }` |
| `add_asset` / `set_asset_status` | Approved | scope + **Exfiltrated** starts legal clocks |
| `update_machine` | Approved | `{ id, status }` |
| `assign_floor` | Lead | `{ identity, floor }` |
| `create_task` | Lead | `{ text, assignee_name }` |
| `ack_task` | Assignee | `{ id }` |
| `log_page` | Lead console | `{ names, message }` |
| `seed_demo_data` | Lead console | seeds machines + sample assets |
| `check_task_escalations` | Lead (or cron UI) | marks stale open tasks |

**Note:** Access uses **join code**, not PIN-on-request (server generates 4-digit code when responder calls `request_access`).

## Box Console (Person 1 — `src/BoxConsole.tsx`)

- Focused window captures Pico keyboard: `!P`, `!F<uid>`, `!C<code>`
- Calls `register_console` on mount button
- Lists `member` where `status === 'pending'`

## Demo order (TC-01…)

1. Lead: `register_console({ pin: '2468' })`
2. `seed_demo_data()`
3. `panic()`
4. Responder: `request_access` → Lead fob + `lead_code`
5. `update_machine`, `send_message`, `set_asset_status` …
